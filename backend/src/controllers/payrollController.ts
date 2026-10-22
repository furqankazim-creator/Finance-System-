import { Request, Response, NextFunction } from "express";
import { Payroll } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";
import { getOrgIdForUser } from "../utils/orgScope";

export const getPayrolls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.year) filter.year = parseInt(req.query.year as string);
    if (req.query.month) filter.month = parseInt(req.query.month as string);

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter).sort({ year: -1, month: -1, employeeName: 1 }).skip(skip).limit(limit),
      Payroll.countDocuments(filter),
    ]);

    sendSuccess(res, payrolls, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getPayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const payroll = await Payroll.findOne({ _id: req.params.id, orgId });
    if (!payroll) return next(new AppError("Payroll record not found", 404));
    sendSuccess(res, payroll);
  } catch (err) { next(err); }
};

export const createPayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const body = { ...req.body, orgId };
    if (body.gross !== undefined) {
      body.grossCents = toCents(body.gross);
      delete body.gross;
    }
    if (body.deductions !== undefined) {
      body.deductionsCents = toCents(body.deductions);
      delete body.deductions;
    }
    if (body.status === "paid" && !body.paidDate) {
      return next(new AppError("Paid date is required when payroll status is paid", 400));
    }
    body.netCents = (body.grossCents || 0) - (body.deductionsCents || 0);
    const payroll = await Payroll.create(body);
    sendSuccess(res, payroll, 201, "Payroll record created");
  } catch (err) { next(err); }
};

export const updatePayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const existing = await Payroll.findOne({ _id: req.params.id, orgId });
    if (!existing) return next(new AppError("Payroll record not found", 404));

    const body = { ...req.body };
    if (body.gross !== undefined) {
      body.grossCents = toCents(body.gross);
      delete body.gross;
    }
    if (body.deductions !== undefined) {
      body.deductionsCents = toCents(body.deductions);
      delete body.deductions;
    }
    const nextStatus = body.status ?? existing.status;
    const nextPaidDate = body.paidDate ?? existing.paidDate;
    if (nextStatus === "paid" && !nextPaidDate) {
      return next(new AppError("Paid date is required when payroll status is paid", 400));
    }
    if (body.grossCents !== undefined || body.deductionsCents !== undefined) {
      const grossCents = body.grossCents ?? existing.grossCents;
      const deductionsCents = body.deductionsCents ?? existing.deductionsCents;
      body.netCents = grossCents - deductionsCents;
    }
    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    );
    sendSuccess(res, payroll, 200, "Payroll record updated");
  } catch (err) { next(err); }
};

export const deletePayroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgIdForUser(req.user!.id);
    const payroll = await Payroll.findOneAndDelete({ _id: req.params.id, orgId });
    if (!payroll) return next(new AppError("Payroll record not found", 404));
    sendSuccess(res, null, 200, "Payroll record deleted");
  } catch (err) { next(err); }
};
