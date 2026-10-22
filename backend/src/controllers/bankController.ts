import { Request, Response, NextFunction } from "express";
import {
  BankAccount,
  BankTransaction,
  Expense,
  Invoice,
  InvoicePayment,
} from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";
import { getOrgIdForUser } from "../utils/orgScope";

// ── Bank accounts ─────────────────────────────────────────────────────────────
export const getBankAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const accounts = await BankAccount.find({ orgId, isActive: true }).sort({ createdAt: 1 });

    const totals = await BankTransaction.aggregate([
      { $match: { orgId, status: { $ne: "ignored" } } },
      {
        $group: {
          _id: { acc: "$bankAccountId", dir: "$direction" },
          total: { $sum: "$amountCents" },
          count: { $sum: 1 },
        },
      },
    ]);

    const data = accounts.map((a) => {
      const inflow = totals.find((t) => String(t._id.acc) === String(a._id) && t._id.dir === "inflow");
      const outflow = totals.find((t) => String(t._id.acc) === String(a._id) && t._id.dir === "outflow");
      return {
        ...a.toObject(),
        inflowCents: inflow?.total || 0,
        outflowCents: outflow?.total || 0,
        balanceCents: (inflow?.total || 0) - (outflow?.total || 0),
        transactionCount: (inflow?.count || 0) + (outflow?.count || 0),
      };
    });
    sendSuccess(res, data);
  } catch (err) { next(err); }
};

export const createBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const account = await BankAccount.create({ ...req.body, orgId });
    sendSuccess(res, account, 201, "Bank account created");
  } catch (err) { next(err); }
};

export const updateBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const account = await BankAccount.findOneAndUpdate({ _id: req.params.id, orgId }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!account) return next(new AppError("Bank account not found", 404));
    sendSuccess(res, account, 200, "Bank account updated");
  } catch (err) { next(err); }
};

export const deleteBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const account = await BankAccount.findOne({ _id: req.params.id, orgId });
    if (!account) return next(new AppError("Bank account not found", 404));
    await BankTransaction.deleteMany({ orgId, bankAccountId: account._id });
    await BankAccount.deleteOne({ _id: account._id });
    sendSuccess(res, null, 200, "Bank account deleted");
  } catch (err) { next(err); }
};

// ── Bank statement lines ──────────────────────────────────────────────────────
export const getBankTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, parseInt(req.query.limit as string) || 50);

    const filter: Record<string, unknown> = { orgId };
    if (req.query.bankAccountId) filter.bankAccountId = req.query.bankAccountId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.direction) filter.direction = req.query.direction;
    if (req.query.from || req.query.to) {
      const range: Record<string, Date> = {};
      if (req.query.from) range.$gte = new Date(req.query.from as string);
      if (req.query.to) range.$lte = new Date(req.query.to as string);
      filter.date = range;
    }

    const [items, total] = await Promise.all([
      BankTransaction.find(filter)
        .populate("bankAccountId", "bankName accountNumberMasked")
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      BankTransaction.countDocuments(filter),
    ]);
    sendSuccess(res, items, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

const normalizeLine = (orgId: unknown, bankAccountId: unknown, line: any) => ({
  orgId,
  bankAccountId,
  date: new Date(line.date),
  description: String(line.description).trim(),
  amountCents: toCents(Math.abs(Number(line.amount))),
  direction: line.direction,
  notes: line.notes || undefined,
  rawText: line.rawText || undefined,
});

export const createBankTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const account = await BankAccount.findOne({ _id: req.body.bankAccountId, orgId });
    if (!account) return next(new AppError("Bank account not found", 404));
    const tx = await BankTransaction.create(normalizeLine(orgId, account._id, req.body));
    sendSuccess(res, tx, 201, "Statement entry added");
  } catch (err) { next(err); }
};

// Bulk import of statement lines (parsed from CSV on the client)
export const importBankTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const account = await BankAccount.findOne({ _id: req.body.bankAccountId, orgId });
    if (!account) return next(new AppError("Bank account not found", 404));

    const lines: any[] = Array.isArray(req.body.transactions) ? req.body.transactions : [];
    if (lines.length === 0) return next(new AppError("No transactions to import", 400));
    if (lines.length > 1000) return next(new AppError("Import is limited to 1000 rows at a time", 400));

    const docs = lines
      .filter(
        (l) =>
          l &&
          l.description &&
          !isNaN(new Date(l.date).getTime()) &&
          Number.isFinite(Number(l.amount)) &&
          Number(l.amount) !== 0 &&
          (l.direction === "inflow" || l.direction === "outflow")
      )
      .map((l) => normalizeLine(orgId, account._id, l));

    const created = await BankTransaction.insertMany(docs);
    sendSuccess(
      res,
      { imported: created.length, skipped: lines.length - created.length },
      201,
      `${created.length} statement lines imported`
    );
  } catch (err) { next(err); }
};

export const updateBankTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const existing = await BankTransaction.findOne({ _id: req.params.id, orgId });
    if (!existing) return next(new AppError("Statement entry not found", 404));
    if (existing.status === "matched" && req.body.status && req.body.status !== "matched") {
      return next(new AppError("Matched entries can't be changed. Delete the linked record first.", 400));
    }

    const body: Record<string, unknown> = {};
    for (const key of ["description", "date", "direction", "status", "notes"]) {
      if (req.body[key] !== undefined) body[key] = req.body[key];
    }
    if (req.body.amount !== undefined) body.amountCents = toCents(Math.abs(Number(req.body.amount)));

    const tx = await BankTransaction.findOneAndUpdate({ _id: existing._id, orgId }, body, {
      new: true,
      runValidators: true,
    });
    sendSuccess(res, tx, 200, "Statement entry updated");
  } catch (err) { next(err); }
};

export const deleteBankTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const tx = await BankTransaction.findOneAndDelete({ _id: req.params.id, orgId });
    if (!tx) return next(new AppError("Statement entry not found", 404));
    sendSuccess(res, null, 200, "Statement entry deleted");
  } catch (err) { next(err); }
};

// Reconcile an inflow with an invoice -> records an invoice payment
export const matchToInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const tx = await BankTransaction.findOne({ _id: req.params.id, orgId });
    if (!tx) return next(new AppError("Statement entry not found", 404));
    if (tx.status === "matched") return next(new AppError("Entry is already matched", 400));
    if (tx.direction !== "inflow") return next(new AppError("Only money received can be matched to an invoice", 400));

    const invoice = await Invoice.findOne({ _id: req.body.invoiceId, orgId });
    if (!invoice) return next(new AppError("Invoice not found", 404));
    if (invoice.status === "cancelled") return next(new AppError("Invoice is cancelled", 400));

    const payments = await InvoicePayment.find({ invoiceId: invoice._id });
    const paid = payments.reduce((s, p) => s + p.amountCents, 0);
    if (paid + tx.amountCents > invoice.amountCents) {
      return next(new AppError("Amount exceeds the remaining invoice balance", 400));
    }

    const payment = await InvoicePayment.create({
      orgId,
      invoiceId: invoice._id,
      amountCents: tx.amountCents,
      paidDate: tx.date,
      method: "bank_transfer",
      reference: `BANK-${String(tx._id).slice(-6).toUpperCase()}`,
      notes: tx.description,
    });
    invoice.status = paid + tx.amountCents >= invoice.amountCents ? "paid" : invoice.status === "draft" ? "sent" : invoice.status;
    await invoice.save();

    tx.status = "matched";
    tx.matchedInvoicePaymentId = payment._id as any;
    await tx.save();
    sendSuccess(res, tx, 200, "Matched to invoice payment");
  } catch (err) { next(err); }
};

// Reconcile an outflow by creating an expense from it
export const matchToExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const tx = await BankTransaction.findOne({ _id: req.params.id, orgId });
    if (!tx) return next(new AppError("Statement entry not found", 404));
    if (tx.status === "matched") return next(new AppError("Entry is already matched", 400));
    if (tx.direction !== "outflow") return next(new AppError("Only money spent can be turned into an expense", 400));

    const expense = await Expense.create({
      orgId,
      categoryId: req.body.categoryId,
      projectId: req.body.projectId || undefined,
      vendor: req.body.vendor || tx.description.slice(0, 200),
      description: tx.description,
      amountCents: tx.amountCents,
      date: tx.date,
      source: "bank",
    });

    tx.status = "matched";
    tx.matchedExpenseId = expense._id as any;
    await tx.save();
    sendSuccess(res, tx, 200, "Expense created from statement entry");
  } catch (err) { next(err); }
};

// ── Payments (received against invoices) ──────────────────────────────────────
export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const filter: Record<string, unknown> = { orgId };
    if (req.query.method) filter.method = req.query.method;

    const payments = await InvoicePayment.find(filter)
      .populate({
        path: "invoiceId",
        select: "invoiceNumber amountCents status clientId",
        populate: { path: "clientId", select: "name" },
      })
      .sort({ paidDate: -1 })
      .limit(Math.min(500, parseInt(req.query.limit as string) || 200));
    sendSuccess(res, payments);
  } catch (err) { next(err); }
};

export const deletePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const payment = await InvoicePayment.findOne({ _id: req.params.id, orgId });
    if (!payment) return next(new AppError("Payment not found", 404));

    await InvoicePayment.deleteOne({ _id: payment._id });

    // Re-open a bank line that was matched to this payment
    await BankTransaction.updateMany(
      { orgId, matchedInvoicePaymentId: payment._id },
      { status: "unmatched", matchedInvoicePaymentId: null }
    );

    // Re-evaluate invoice status
    const invoice = await Invoice.findOne({ _id: payment.invoiceId, orgId });
    if (invoice && invoice.status === "paid") {
      const remaining = await InvoicePayment.find({ invoiceId: invoice._id });
      const paid = remaining.reduce((s, p) => s + p.amountCents, 0);
      if (paid < invoice.amountCents) {
        invoice.status = invoice.dueDate < new Date() ? "overdue" : "sent";
        await invoice.save();
      }
    }
    sendSuccess(res, null, 200, "Payment deleted");
  } catch (err) { next(err); }
};

