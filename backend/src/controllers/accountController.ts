import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Account, Organization } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

const normalBalanceFor = (type: string): "debit" | "credit" =>
  type === "asset" || type === "expense" ? "debit" : "credit";

// Default Chart of Accounts seeded for every new organization, mirroring
// standard small-business COA numbering (1000s Assets ... 5000s Expenses).
const DEFAULT_ACCOUNTS: { accountNumber: string; name: string; type: "asset" | "liability" | "equity" | "revenue" | "expense" }[] = [
  { accountNumber: "1010", name: "Cash", type: "asset" },
  { accountNumber: "1020", name: "Accounts Receivable", type: "asset" },
  { accountNumber: "1030", name: "Prepaid Expenses", type: "asset" },
  { accountNumber: "1040", name: "Fixed Assets & Equipment", type: "asset" },
  { accountNumber: "2010", name: "Accounts Payable", type: "liability" },
  { accountNumber: "2020", name: "Accrued Liabilities", type: "liability" },
  { accountNumber: "2030", name: "Loans Payable", type: "liability" },
  { accountNumber: "2040", name: "Salaries Payable", type: "liability" },
  { accountNumber: "3010", name: "Owner's Capital", type: "equity" },
  { accountNumber: "3020", name: "Retained Earnings", type: "equity" },
  { accountNumber: "4010", name: "Service Revenue", type: "revenue" },
  { accountNumber: "4020", name: "Product Revenue", type: "revenue" },
  { accountNumber: "5010", name: "Cost of Goods Sold", type: "expense" },
  { accountNumber: "5020", name: "Salaries Expense", type: "expense" },
  { accountNumber: "5030", name: "Rent Expense", type: "expense" },
  { accountNumber: "5040", name: "Utilities Expense", type: "expense" },
  { accountNumber: "5050", name: "Marketing Expense", type: "expense" },
  { accountNumber: "5060", name: "Software & SaaS Expense", type: "expense" },
  { accountNumber: "5070", name: "Office Expense", type: "expense" },
  { accountNumber: "5080", name: "Travel Expense", type: "expense" },
];

export const seedDefaultChartOfAccounts = async (orgId: mongoose.Types.ObjectId) => {
  await Account.insertMany(
    DEFAULT_ACCOUNTS.map((a) => ({
      orgId,
      accountNumber: a.accountNumber,
      name: a.name,
      type: a.type,
      normalBalance: normalBalanceFor(a.type),
      isSystem: true,
    }))
  );
};

export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);

    // Lazily seed the default COA for orgs that don't have one yet (e.g. accounts
    // created before this module existed).
    const existingCount = await Account.countDocuments({ orgId });
    if (existingCount === 0) {
      await seedDefaultChartOfAccounts(orgId);
    }

    const filter: Record<string, unknown> = { orgId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const accounts = await Account.find(filter).sort({ accountNumber: 1 });
    sendSuccess(res, accounts);
  } catch (err) { next(err); }
};

// Balance-sheet-style snapshot, computed from Bookkeeping (Transaction) entries only —
// the one data source that's always tied to a COA account. Feeds the Dashboard's
// Chart of Accounts summary and the Costing page's "recorded overhead" helper.
export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);

    const totals = await mongoose.model("Transaction").aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: "$type",
          totalCents: { $sum: "$amountCents" },
          outstandingCents: { $sum: { $subtract: ["$amountCents", "$paidCents"] } },
        },
      },
    ]);

    const byType: Record<string, { totalCents: number; outstandingCents: number }> = {};
    for (const row of totals) {
      byType[row._id] = { totalCents: row.totalCents, outstandingCents: row.outstandingCents };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyExpenseTxns = await mongoose.model("Transaction").aggregate([
      { $match: { orgId, type: "expense", date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]);

    sendSuccess(res, {
      totalAssetsCents: byType.asset?.totalCents || 0,
      totalLiabilitiesCents: byType.liability?.outstandingCents || 0,
      totalEquityCents: byType.equity?.totalCents || 0,
      bookkeepingRevenueCents: byType.revenue?.totalCents || 0,
      bookkeepingExpensesCents: byType.expense?.totalCents || 0,
      monthlyBookkeepingExpensesCents: monthlyExpenseTxns[0]?.total || 0,
    });
  } catch (err) { next(err); }
};

export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const account = await Account.findOne({ _id: req.params.id, orgId });
    if (!account) return next(new AppError("Account not found", 404));
    sendSuccess(res, account);
  } catch (err) { next(err); }
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const body = { ...req.body, orgId };
    if (!body.normalBalance) body.normalBalance = normalBalanceFor(body.type);
    const account = await Account.create(body);
    sendSuccess(res, account, 201, "Account created");
  } catch (err) { next(err); }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, orgId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) return next(new AppError("Account not found", 404));
    sendSuccess(res, account, 200, "Account updated");
  } catch (err) { next(err); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const account = await Account.findOne({ _id: req.params.id, orgId });
    if (!account) return next(new AppError("Account not found", 404));
    if (account.isSystem) {
      return next(new AppError("This is a default system account and cannot be deleted", 400));
    }

    const [childCount, transactionCount] = await Promise.all([
      Account.countDocuments({ orgId, parentAccountId: account._id }),
      mongoose.model("Transaction").countDocuments({ orgId, accountId: account._id }),
    ]);
    if (childCount > 0) {
      return next(new AppError("Delete or reassign this account's sub-accounts first", 400));
    }
    if (transactionCount > 0) {
      return next(new AppError("This account has transactions recorded against it and cannot be deleted", 400));
    }

    await Account.deleteOne({ _id: account._id });
    sendSuccess(res, null, 200, "Account deleted");
  } catch (err) { next(err); }
};
