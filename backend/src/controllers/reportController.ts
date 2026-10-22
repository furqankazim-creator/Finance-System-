import { Request, Response, NextFunction } from "express";
import { Organization, Invoice, Expense, ExpenseCategory, Transaction, Account } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { revenueAndExpenseFor } from "./dashboardController";

const getOrgId = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org._id;
};

export const getPLReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = await getOrgId(req.user!.id);
    const from = req.query.from ? new Date(req.query.from as string) : startOfMonth(new Date());
    const to = req.query.to ? new Date(req.query.to as string) : endOfMonth(new Date());
    const projectId = req.query.projectId as string | undefined;

    const invoiceFilter: Record<string, unknown> = {
      orgId,
      status: "paid",
      issueDate: { $gte: from, $lte: to },
    };
    if (projectId) invoiceFilter.projectId = projectId;

    const expenseFilter: Record<string, unknown> = {
      orgId,
      date: { $gte: from, $lte: to },
    };
    if (projectId) expenseFilter.projectId = projectId;

    // Revenue = paid invoices + Bookkeeping revenue-type transactions (same
    // definition the Dashboard uses, so the two pages never disagree).
    const revenueByCategory = await Invoice.aggregate([
      { $match: invoiceFilter },
      { $group: { _id: null, totalCents: { $sum: "$amountCents" } } },
    ]);
    const bookkeepingRevenue = await Transaction.aggregate([
      { $match: { orgId, type: "revenue", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, totalCents: { $sum: "$amountCents" } } },
    ]);
    const totalRevenueCents = (revenueByCategory[0]?.totalCents || 0) + (bookkeepingRevenue[0]?.totalCents || 0);

    // Expenses by category type (COGS, OpEx)
    const expensesByCategory = await Expense.aggregate([
      { $match: expenseFilter },
      {
        $lookup: {
          from: "expensecategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: { categoryId: "$category._id", categoryName: "$category.name", color: "$category.color", type: "$category.type" },
          totalCents: { $sum: "$amountCents" },
        },
      },
    ]);

    const cogs = expensesByCategory
      .filter((e) => e._id.type === "cogs")
      .map((e) => ({
        categoryId: e._id.categoryId.toString(),
        categoryName: e._id.categoryName,
        color: e._id.color,
        totalCents: e.totalCents,
      }));

    const opex = expensesByCategory
      .filter((e) => e._id.type === "opex" || e._id.type === "fixed" || e._id.type === "variable")
      .map((e) => ({
        categoryId: e._id.categoryId.toString(),
        categoryName: e._id.categoryName,
        color: e._id.color,
        totalCents: e.totalCents,
      }));

    // Bookkeeping expense-type transactions aren't tied to a project filter and
    // have no COGS/OPEX distinction on their account (Accounts only know
    // "expense", not the finer category type) — folded into OPEX as the safer
    // default, and skipped entirely when a project filter is active since
    // Bookkeeping entries aren't project-scoped.
    if (!projectId) {
      const bookkeepingExpenses = await Transaction.aggregate([
        { $match: { orgId, type: "expense", date: { $gte: from, $lte: to } } },
        { $group: { _id: "$accountId", totalCents: { $sum: "$amountCents" } } },
      ]);
      const bkAccounts = await Account.find({ _id: { $in: bookkeepingExpenses.map((e) => e._id) } });
      const bkAccountMap = new Map(bkAccounts.map((a) => [a._id.toString(), a.name]));
      for (const row of bookkeepingExpenses) {
        opex.push({
          categoryId: row._id?.toString() || "bookkeeping",
          categoryName: (bkAccountMap.get(row._id?.toString()) || "Uncategorized") + " (Bookkeeping)",
          color: "#6366f1",
          totalCents: row.totalCents,
        });
      }
    }

    const totalCogsCents = cogs.reduce((sum, c) => sum + c.totalCents, 0);
    const totalOpexCents = opex.reduce((sum, c) => sum + c.totalCents, 0);
    const grossProfit = totalRevenueCents - totalCogsCents;
    const netProfit = grossProfit - totalOpexCents;

    // Monthly comparison (for chart) — last 6 months, same revenue/expense
    // definition as the Dashboard. Bookkeeping entries aren't project-scoped,
    // so a project filter only narrows the Invoice/Expense side.
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(new Date(from.getFullYear(), from.getMonth() - i, 1));
      const monthEnd = endOfMonth(monthStart);
      const { revenueCents, expensesCents } = await revenueAndExpenseFor(orgId, monthStart, monthEnd, projectId);
      monthlyData.push({
        month: format(monthStart, "MMM yyyy"),
        revenueCents,
        expensesCents,
        netProfitCents: revenueCents - expensesCents,
      });
    }

    const report = {
      period: { from: from.toISOString(), to: to.toISOString() },
      revenue: { totalCents: totalRevenueCents, byCategory: [{ categoryName: "Revenue", color: "#10b981", totalCents: totalRevenueCents }] },
      cogs: { totalCents: totalCogsCents, byCategory: cogs },
      opex: { totalCents: totalOpexCents, byCategory: opex },
      grossProfit,
      netProfit,
      monthlyComparison: monthlyData,
    };

    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};
