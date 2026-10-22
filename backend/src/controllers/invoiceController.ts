import { Request, Response, NextFunction } from "express";
import { Client, Invoice, InvoicePayment, Project } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";
import { assertBelongsToOrg, getOrgIdForUser } from "../utils/orgScope";

// Auto-update overdue invoices
const refreshOverdueStatus = async (orgId: unknown) => {
  await Invoice.updateMany(
    { orgId, status: "sent", dueDate: { $lt: new Date() } },
    { $set: { status: "overdue" } }
  );
};

const validateInvoiceDates = (issueDate?: string | Date, dueDate?: string | Date) => {
  if (issueDate && dueDate && new Date(dueDate) < new Date(issueDate)) {
    throw new AppError("Due date cannot be earlier than issue date", 400);
  }
};

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    await refreshOverdueStatus(orgId);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.from || req.query.to) {
      const dateFilter: Record<string, Date> = {};
      if (req.query.from) dateFilter.$gte = new Date(req.query.from as string);
      if (req.query.to) dateFilter.$lte = new Date(req.query.to as string);
      filter.issueDate = dateFilter;
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("clientId", "name email")
        .populate("projectId", "name")
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    sendSuccess(res, invoices, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const invoice = await Invoice.findOne({ _id: req.params.id, orgId })
      .populate("clientId", "name email address phone")
      .populate("projectId", "name");
    if (!invoice) return next(new AppError("Invoice not found", 404));

    // Fetch payments for this invoice
    const payments = await InvoicePayment.find({ invoiceId: invoice._id }).sort({ paidDate: -1 });
    sendSuccess(res, { ...invoice.toObject(), payments });
  } catch (err) { next(err); }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const client = await assertBelongsToOrg(Client, req.body.clientId, orgId, "Client");

    if (req.body.projectId) {
      const project = await assertBelongsToOrg(Project, req.body.projectId, orgId, "Project");
      if (String(project.clientId) !== String(client._id)) {
        throw new AppError("Selected project does not belong to the selected client", 400);
      }
    }

    validateInvoiceDates(req.body.issueDate, req.body.dueDate);

    const body = { ...req.body, orgId };

    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }

    // Auto-generate invoice number if not provided
    if (!body.invoiceNumber) {
      const count = await Invoice.countDocuments({ orgId });
      body.invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;
    }

    const invoice = await Invoice.create(body);
    const populated = await invoice
      .populate("clientId", "name email")
      .then((i) => i.populate("projectId", "name"));
    sendSuccess(res, populated, 201, "Invoice created");
  } catch (err) { next(err); }
};

export const updateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const existingInvoice = await Invoice.findOne({ _id: req.params.id, orgId });
    if (!existingInvoice) {
      return next(new AppError("Invoice not found", 404));
    }

    const nextClientId = req.body.clientId || existingInvoice.clientId;
    const nextProjectId =
      req.body.projectId === undefined ? existingInvoice.projectId : req.body.projectId;

    const client = await assertBelongsToOrg(Client, nextClientId, orgId, "Client");
    if (nextProjectId) {
      const project = await assertBelongsToOrg(Project, nextProjectId, orgId, "Project");
      if (String(project.clientId) !== String(client._id)) {
        throw new AppError("Selected project does not belong to the selected client", 400);
      }
    }

    validateInvoiceDates(
      req.body.issueDate ?? existingInvoice.issueDate,
      req.body.dueDate ?? existingInvoice.dueDate
    );

    const body = { ...req.body };
    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    )
      .populate("clientId", "name email")
      .populate("projectId", "name");
    sendSuccess(res, invoice, 200, "Invoice updated");
  } catch (err) { next(err); }
};

export const deleteInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, orgId });
    if (!invoice) return next(new AppError("Invoice not found", 404));
    // Also remove associated payments
    await InvoicePayment.deleteMany({ invoiceId: invoice._id });
    sendSuccess(res, null, 200, "Invoice deleted");
  } catch (err) { next(err); }
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const addPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const invoice = await Invoice.findOne({ _id: req.params.id, orgId });
    if (!invoice) return next(new AppError("Invoice not found", 404));
    if (invoice.status === "cancelled") {
      return next(new AppError("Cannot record a payment against a cancelled invoice", 400));
    }

    const body = { ...req.body, orgId, invoiceId: invoice._id };
    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }

    const payments = await InvoicePayment.find({ invoiceId: invoice._id });
    const totalPaidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
    if (totalPaidCents >= invoice.amountCents) {
      return next(new AppError("This invoice has already been fully paid", 400));
    }

    const nextTotalPaidCents = totalPaidCents + body.amountCents;
    if (nextTotalPaidCents > invoice.amountCents) {
      return next(new AppError("Payment exceeds the remaining invoice balance", 400));
    }

    const payment = await InvoicePayment.create(body);

    if (nextTotalPaidCents >= invoice.amountCents) {
      invoice.status = "paid";
    } else if (invoice.status === "draft") {
      invoice.status = "sent";
    }
    await invoice.save();

    sendSuccess(res, payment, 201, "Payment recorded");
  } catch (err) { next(err); }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const invoice = await Invoice.findOne({ _id: req.params.id, orgId });
    if (!invoice) return next(new AppError("Invoice not found", 404));
    const payments = await InvoicePayment.find({ invoiceId: invoice._id }).sort({ paidDate: -1 });
    sendSuccess(res, payments);
  } catch (err) { next(err); }
};
