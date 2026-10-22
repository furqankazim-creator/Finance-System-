import { Request, Response, NextFunction } from "express";
import { Organization, Invoice, Expense, ExpenseCategory, Transaction, Account } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

// Revenue = paid invoices + Bookkeeping revenue-type transactions.
// Expenses = Expense collection + Bookkeeping expense-type transactions.
// Shared with getIncomeExpenseBreakdown below so the stat cards, the chart,
// and (via reportController) the P&L page never disagree with each other.
// projectId, when given, scopes the Invoice/Expense side only — Bookkeeping
// transactions aren't project-scoped, so they stay org-wide either way.
export const revenueAndExpenseFor = async (orgId: unknown, from: Date, to: Date, projectId?: string) => {
  const invoiceMatch: Record<string, unknown> = { orgId, status: "paid", issueDate: { $gte: from, $lte: to } };
  const expenseMatch: Record<string, unknown> = { orgId, date: { $gte: from, $lte: to } };
  if (projectId) {
    invoiceMatch.projectId = projectId;
    expenseMatch.projectId = projectId;
  }

  const [paidInvoices, revenueTxns, expenses, expenseTxns] = await Promise.all([
    Invoice.aggregate([
      { $match: invoiceMatch },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
    Transaction.aggregate([
      { $match: { orgId, type: "revenue", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
    Transaction.aggregate([
      { $match: { orgId, type: "expense", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]),
  ]);
  return {
    revenueCents: (paidInvoices[0]?.total || 0) + (revenueTxns[0]?.total || 0),
    expensesCents: (expenses[0]?.total || 0) + (expenseTxns[0]?.total || 0),
  };
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const [current, previous] = await Promise.all([
      revenueAndExpenseFor(orgId, currentMonthStart, currentMonthEnd),
      revenueAndExpenseFor(orgId, previousMonthStart, previousMonthEnd),
    ]);

    const currentRevenueCents = current.revenueCents;
    const currentExpensesCents = current.expensesCents;
    const previousRevenueCents = previous.revenueCents;
    const previousExpensesCents = previous.expensesCents;

    // Top 5 expense categories this month
    const topCategories = await Expense.aggregate([
      {
        $match: {
          orgId,
          date: { $gte: currentMonthStart, $lte: currentMonthEnd },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          totalCents: { $sum: "$amountCents" },
        },
      },
      { $sort: { totalCents: -1 } },
      { $limit: 5 },
    ]);

    // Populate category names
    const categories = await ExpenseCategory.find({
      _id: { $in: topCategories.map((c) => c._id) },
    });
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));

    const topExpenseCategories = topCategories.map((c) => ({
      categoryName: categoryMap.get(c._id.toString())?.name || "Unknown",
      color: categoryMap.get(c._id.toString())?.color || "#6366f1",
      totalCents: c.totalCents,
    }));

    // Outstanding invoices (sent or overdue)
    const outstandingInvoices = await Invoice.find({
      orgId,
      status: { $in: ["sent", "overdue"] },
    })
      .populate("clientId", "name")
      .populate("projectId", "name")
      .sort({ dueDate: 1 })
      .limit(10);

    const stats = {
      currentMonth: {
        revenueCents: currentRevenueCents,
        expensesCents: currentExpensesCents,
        netProfitCents: currentRevenueCents - currentExpensesCents,
      },
      previousMonth: {
        revenueCents: previousRevenueCents,
        expensesCents: previousExpensesCents,
        netProfitCents: previousRevenueCents - previousExpensesCents,
      },
      topExpenseCategories,
      outstandingInvoices,
    };

    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

// Merge two {name -> cents} maps and return the top N by total, descending.
const mergeTopN = (maps: Record<string, number>[], n: number) => {
  const merged: Record<string, number> = {};
  for (const map of maps) {
    for (const [name, cents] of Object.entries(map)) {
      merged[name] = (merged[name] || 0) + cents;
    }
  }
  return Object.entries(merged)
    .map(([name, totalCents]) => ({ name, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, n);
};

// Income vs Expense over 12 months, blending Invoices+Expenses with Bookkeeping
// (Transaction) entries so every page that records money contributes here.
export const getIncomeExpenseBreakdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const now = new Date();

    const monthly: { month: string; incomeCents: number; expenseCents: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(monthStart);
      const { revenueCents, expensesCents } = await revenueAndExpenseFor(orgId, monthStart, monthEnd);
      monthly.push({ month: format(monthStart, "MMM"), incomeCents: revenueCents, expenseCents: expensesCents });
    }

    const windowStart = startOfMonth(subMonths(now, 11));

    // Top income: paid invoices grouped by their revenue account, blended with
    // Bookkeeping revenue-type transactions grouped by account.
    const [invoiceByAccount, revenueTxnByAccount, expenseByCategory, expenseTxnByAccount] = await Promise.all([
      Invoice.aggregate([
        { $match: { orgId, status: "paid", issueDate: { $gte: windowStart }, accountId: { $ne: null } } },
        { $group: { _id: "$accountId", total: { $sum: "$amountCents" } } },
      ]),
      Transaction.aggregate([
        { $match: { orgId, type: "revenue", date: { $gte: windowStart } } },
        { $group: { _id: "$accountId", total: { $sum: "$amountCents" } } },
      ]),
      Expense.aggregate([
        { $match: { orgId, date: { $gte: windowStart } } },
        { $group: { _id: "$categoryId", total: { $sum: "$amountCents" } } },
      ]),
      Transaction.aggregate([
        { $match: { orgId, type: "expense", date: { $gte: windowStart } } },
        { $group: { _id: "$accountId", total: { $sum: "$amountCents" } } },
      ]),
    ]);

    const invoiceUnassigned = await Invoice.aggregate([
      { $match: { orgId, status: "paid", issueDate: { $gte: windowStart }, accountId: null } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]);

    const accountIds = [
      ...invoiceByAccount.map((r) => r._id),
      ...revenueTxnByAccount.map((r) => r._id),
      ...expenseTxnByAccount.map((r) => r._id),
    ].filter(Boolean);
    const accountsFound = await Account.find({ _id: { $in: accountIds } });
    const accountNameMap = new Map(accountsFound.map((a) => [a._id.toString(), a.name]));

    const categoryIds = expenseByCategory.map((r) => r._id).filter(Boolean);
    const categoriesFound = await ExpenseCategory.find({ _id: { $in: categoryIds } });
    const categoryNameMap = new Map(categoriesFound.map((c) => [c._id.toString(), c.name]));

    const invoiceIncomeMap: Record<string, number> = {};
    for (const row of invoiceByAccount) {
      invoiceIncomeMap[accountNameMap.get(row._id?.toString()) || "Uncategorized income"] = row.total;
    }
    if (invoiceUnassigned[0]?.total) {
      invoiceIncomeMap["Uncategorized income"] = (invoiceIncomeMap["Uncategorized income"] || 0) + invoiceUnassigned[0].total;
    }
    const revenueTxnMap: Record<string, number> = {};
    for (const row of revenueTxnByAccount) {
      revenueTxnMap[accountNameMap.get(row._id?.toString()) || "Uncategorized income"] = row.total;
    }

    const expenseCategoryMap: Record<string, number> = {};
    for (const row of expenseByCategory) {
      expenseCategoryMap[categoryNameMap.get(row._id?.toString()) || "Uncategorized expense"] = row.total;
    }
    const expenseTxnMap: Record<string, number> = {};
    for (const row of expenseTxnByAccount) {
      expenseTxnMap[accountNameMap.get(row._id?.toString()) || "Uncategorized expense"] = row.total;
    }

    sendSuccess(res, {
      monthly,
      topIncome: mergeTopN([invoiceIncomeMap, revenueTxnMap], 5),
      topExpense: mergeTopN([expenseCategoryMap, expenseTxnMap], 5),
    });
  } catch (err) {
    next(err);
  }
};
