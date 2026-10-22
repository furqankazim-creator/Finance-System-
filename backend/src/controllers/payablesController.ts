import { Request, Response, NextFunction } from "express";
import { Invoice, Transaction, Payroll, Organization } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

export const getPayablesReceivables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);

    const [receivableInvoices, openLoans, pendingPayroll] = await Promise.all([
      Invoice.find({ orgId, status: { $in: ["sent", "overdue"] } })
        .populate("clientId", "name email")
        .populate("projectId", "name")
        .sort({ dueDate: 1 }),
      Transaction.find({ orgId, type: "liability", status: "open" })
        .populate("accountId", "accountNumber name")
        .sort({ date: -1 }),
      Payroll.find({ orgId, status: "pending" }).sort({ year: -1, month: -1 }),
    ]);

    const totalReceivableCents = receivableInvoices.reduce((sum, i) => sum + i.amountCents, 0);
    const totalLoansOutstandingCents = openLoans.reduce((sum, t) => sum + (t.amountCents - t.paidCents), 0);
    const totalSalaryDuesCents = pendingPayroll.reduce((sum, p) => sum + p.netCents, 0);

    sendSuccess(res, {
      receivables: {
        totalCents: totalReceivableCents,
        invoices: receivableInvoices,
      },
      payables: {
        totalCents: totalLoansOutstandingCents + totalSalaryDuesCents,
        loans: openLoans,
        loansTotalCents: totalLoansOutstandingCents,
        salaryDues: pendingPayroll,
        salaryDuesTotalCents: totalSalaryDuesCents,
      },
    });
  } catch (err) { next(err); }
};
