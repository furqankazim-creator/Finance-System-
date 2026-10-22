import { Request, Response, NextFunction } from "express";
import { Transaction, Account, Organization } from "../models";
import { sendSuccess, buildPagination } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { toCents } from "../utils/money";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { orgId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.accountId) filter.accountId = req.query.accountId;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("accountId", "accountNumber name type")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    sendSuccess(res, transactions, 200, undefined, buildPagination(total, page, limit));
  } catch (err) { next(err); }
};

export const getTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const transaction = await Transaction.findOne({ _id: req.params.id, orgId }).populate("accountId", "accountNumber name type");
    if (!transaction) return next(new AppError("Transaction not found", 404));
    sendSuccess(res, transaction);
  } catch (err) { next(err); }
};

export const createTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const body = { ...req.body, orgId };

    if (!body.accountId) throw new AppError("Account is required", 400);
    const account = await Account.findOne({ _id: body.accountId, orgId });
    if (!account) throw new AppError("Account not found", 404);
    if (body.type && body.type !== account.type) {
      throw new AppError(`Selected account is a ${account.type} account, not ${body.type}`, 400);
    }
    body.type = account.type;

    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }

    if (!body.transactionRef) {
      const count = await Transaction.countDocuments({ orgId });
      body.transactionRef = `TXN-${String(count + 1).padStart(4, "0")}`;
    }

    const transaction = await Transaction.create(body);
    const populated = await transaction.populate("accountId", "accountNumber name type");
    sendSuccess(res, populated, 201, "Transaction recorded");
  } catch (err) { next(err); }
};

export const updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const body = { ...req.body };
    if (body.amount !== undefined) {
      body.amountCents = toCents(body.amount);
      delete body.amount;
    }
    delete body.type; // type always follows the linked account, not directly editable
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, orgId },
      body,
      { new: true, runValidators: true }
    ).populate("accountId", "accountNumber name type");
    if (!transaction) return next(new AppError("Transaction not found", 404));
    sendSuccess(res, transaction, 200, "Transaction updated");
  } catch (err) { next(err); }
};

export const deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, orgId });
    if (!transaction) return next(new AppError("Transaction not found", 404));
    sendSuccess(res, null, 200, "Transaction deleted");
  } catch (err) { next(err); }
};

// Pay down a liability (e.g. a loan) recorded as a Transaction.
export const payTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const transaction = await Transaction.findOne({ _id: req.params.id, orgId });
    if (!transaction) return next(new AppError("Transaction not found", 404));

    const amountCents = req.body.amount !== undefined ? toCents(req.body.amount) : 0;
    if (amountCents <= 0) throw new AppError("Payment amount must be greater than 0", 400);

    transaction.paidCents = Math.min(transaction.amountCents, transaction.paidCents + amountCents);
    if (transaction.paidCents >= transaction.amountCents) {
      transaction.status = "settled";
    }
    await transaction.save();

    sendSuccess(res, transaction, 200, "Payment recorded");
  } catch (err) { next(err); }
};
