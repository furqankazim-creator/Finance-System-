import { Request, Response, NextFunction } from "express";
import {
  Organization,
  Invoice,
  Expense,
  ExpenseCategory,
  Transaction,
  Account,
  Payroll,
  BankTransaction,
} from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  format,
} from "date-fns";
import { revenueAndExpenseFor } from "./dashboardController";
import { formatCurrency } from "../utils/money";
import { sendMail } from "../utils/mailer";

const getOrg = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) throw new AppError("Organization not found", 404);
  return org;
};

// ── P&L Report ─────────────────────────────────────────────────────────────────
export const getPLReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await getOrg(req.user!.id);
    const orgId = org._id;
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

    // Revenue = paid invoices + Bookkeeping revenue transactions
    const revenueByCategory = await Invoice.aggregate([
      { $match: invoiceFilter },
      { $group: { _id: null, totalCents: { $sum: "$amountCents" } } },
    ]);
    const bookkeepingRevenue = await Transaction.aggregate([
      { $match: { orgId, type: "revenue", date: { $gte: from, $lte: to } } },
      { $group: { _id: null, totalCents: { $sum: "$amountCents" } } },
    ]);
    const totalRevenueCents = (revenueByCategory[0]?.totalCents || 0) + (bookkeepingRevenue[0]?.totalCents || 0);

    // Expenses by category
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

// ── Executive Report Calculation (Shared between API and Email) ─────────────────
export interface ExecutiveReportData {
  orgName: string;
  currency: string;
  periodType: "weekly" | "monthly" | "custom";
  periodLabel: string;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  revenueCents: number;
  expensesCents: number;
  netProfitCents: number;
  netMarginPct: number;
  prevRevenueCents: number;
  prevExpensesCents: number;
  prevNetProfitCents: number;
  revenueChangePct: number | null;
  expensesChangePct: number | null;
  netProfitChangePct: number | null;
  cashInBankCents: number;
  receivables: {
    totalCents: number;
    openCount: number;
    overdueCount: number;
    overdueCents: number;
  };
  payables: {
    totalCents: number;
    pendingPayrollCents: number;
    openLoansCents: number;
  };
  invoicesBilledCount: number;
  invoicesBilledTotalCents: number;
  topExpenses: {
    categoryName: string;
    totalCents: number;
    percentage: number;
  }[];
}

export const computeExecutiveData = async (
  org: any,
  periodType: "weekly" | "monthly" | "custom",
  targetDateInput?: string,
  customFromInput?: string,
  customToInput?: string
): Promise<ExecutiveReportData> => {
  const orgId = org._id;
  const targetDate = targetDateInput ? new Date(targetDateInput) : new Date();

  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;
  let periodLabel: string;

  if (periodType === "weekly") {
    from = startOfWeek(targetDate, { weekStartsOn: 1 });
    to = endOfWeek(targetDate, { weekStartsOn: 1 });
    prevFrom = subWeeks(from, 1);
    prevTo = subWeeks(to, 1);
    periodLabel = `Week of ${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
  } else if (periodType === "monthly") {
    from = startOfMonth(targetDate);
    to = endOfMonth(targetDate);
    prevFrom = startOfMonth(subMonths(from, 1));
    prevTo = endOfMonth(subMonths(from, 1));
    periodLabel = format(from, "MMMM yyyy");
  } else {
    from = customFromInput ? new Date(customFromInput) : startOfMonth(targetDate);
    to = customToInput ? new Date(customToInput) : endOfMonth(targetDate);
    const durationMs = to.getTime() - from.getTime();
    prevTo = new Date(from.getTime() - 1);
    prevFrom = new Date(prevTo.getTime() - durationMs);
    periodLabel = `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
  }

  // 1. Current period metrics
  const { revenueCents, expensesCents } = await revenueAndExpenseFor(orgId, from, to);
  const netProfitCents = revenueCents - expensesCents;
  const netMarginPct = revenueCents > 0 ? (netProfitCents / revenueCents) * 100 : 0;

  // 2. Previous period metrics
  const { revenueCents: prevRevenueCents, expensesCents: prevExpensesCents } = await revenueAndExpenseFor(
    orgId,
    prevFrom,
    prevTo
  );
  const prevNetProfitCents = prevRevenueCents - prevExpensesCents;

  const calcChange = (curr: number, prev: number): number | null => {
    if (prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const revenueChangePct = calcChange(revenueCents, prevRevenueCents);
  const expensesChangePct = calcChange(expensesCents, prevExpensesCents);
  const netProfitChangePct = calcChange(netProfitCents, prevNetProfitCents);

  // 3. Invoices issued during this period
  const billedInvoices = await Invoice.find({
    orgId,
    issueDate: { $gte: from, $lte: to },
  });
  const invoicesBilledCount = billedInvoices.length;
  const invoicesBilledTotalCents = billedInvoices.reduce((s, i) => s + i.amountCents, 0);

  // 4. Receivables (Unpaid invoices currently outstanding)
  const now = new Date();
  const openInvoices = await Invoice.find({
    orgId,
    status: { $in: ["sent", "overdue"] },
  });
  const totalReceivablesCents = openInvoices.reduce((s, i) => s + i.amountCents, 0);
  const overdueInvoices = openInvoices.filter((i) => new Date(i.dueDate) < now);
  const overdueCents = overdueInvoices.reduce((s, i) => s + i.amountCents, 0);

  // 5. Payables (Pending payroll + Open bank loans)
  const [pendingPayroll, openLoans] = await Promise.all([
    Payroll.find({ orgId, status: "pending" }),
    Transaction.find({ orgId, type: "liability", status: "open" }),
  ]);
  const pendingPayrollCents = pendingPayroll.reduce((s, p) => s + p.netCents, 0);
  const openLoansCents = openLoans.reduce((s, t) => s + (t.amountCents - t.paidCents), 0);
  const totalPayablesCents = pendingPayrollCents + openLoansCents;

  // 6. Cash in Bank (All active bank accounts)
  const bankTotals = await BankTransaction.aggregate([
    { $match: { orgId, status: { $ne: "ignored" } } },
    {
      $group: {
        _id: "$direction",
        total: { $sum: "$amountCents" },
      },
    },
  ]);
  const bankInflow = bankTotals.find((t) => t._id === "inflow")?.total || 0;
  const bankOutflow = bankTotals.find((t) => t._id === "outflow")?.total || 0;
  let cashInBankCents = bankInflow - bankOutflow;

  // If bank accounts haven't been connected yet, fall back to cash asset transactions
  if (cashInBankCents === 0) {
    const cashTxns = await Transaction.aggregate([
      { $match: { orgId, type: "asset" } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } },
    ]);
    cashInBankCents = cashTxns[0]?.total || 0;
  }

  // 7. Top Spending Categories in this period
  const rawCatExpenses = await Expense.aggregate([
    { $match: { orgId, date: { $gte: from, $lte: to } } },
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
        _id: "$category.name",
        totalCents: { $sum: "$amountCents" },
      },
    },
    { $sort: { totalCents: -1 } },
    { $limit: 5 },
  ]);

  const totalPeriodSpend = expensesCents || 1;
  const topExpenses = rawCatExpenses.map((c) => ({
    categoryName: c._id,
    totalCents: c.totalCents,
    percentage: Math.round((c.totalCents / totalPeriodSpend) * 100),
  }));

  return {
    orgName: org.name,
    currency: org.currency || "PKR",
    periodType,
    periodLabel,
    from: from.toISOString(),
    to: to.toISOString(),
    prevFrom: prevFrom.toISOString(),
    prevTo: prevTo.toISOString(),
    revenueCents,
    expensesCents,
    netProfitCents,
    netMarginPct: parseFloat(netMarginPct.toFixed(1)),
    prevRevenueCents,
    prevExpensesCents,
    prevNetProfitCents,
    revenueChangePct: revenueChangePct !== null ? parseFloat(revenueChangePct.toFixed(1)) : null,
    expensesChangePct: expensesChangePct !== null ? parseFloat(expensesChangePct.toFixed(1)) : null,
    netProfitChangePct: netProfitChangePct !== null ? parseFloat(netProfitChangePct.toFixed(1)) : null,
    cashInBankCents,
    receivables: {
      totalCents: totalReceivablesCents,
      openCount: openInvoices.length,
      overdueCount: overdueInvoices.length,
      overdueCents,
    },
    payables: {
      totalCents: totalPayablesCents,
      pendingPayrollCents,
      openLoansCents,
    },
    invoicesBilledCount,
    invoicesBilledTotalCents,
    topExpenses,
  };
};

// ── GET /api/v1/reports/executive ──────────────────────────────────────────────
export const getExecutiveReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await getOrg(req.user!.id);
    const periodType = (req.query.periodType as "weekly" | "monthly" | "custom") || "monthly";
    const dateInput = req.query.date as string | undefined;
    const fromInput = req.query.from as string | undefined;
    const toInput = req.query.to as string | undefined;

    const data = await computeExecutiveData(org, periodType, dateInput, fromInput, toInput);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/reports/send-summary ──────────────────────────────────────────
export const sendExecutiveReportEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await getOrg(req.user!.id);
    const {
      recipients,
      periodType = "monthly",
      date,
      from,
      to,
      customMessage,
    } = req.body;

    const recipientList: string[] = Array.isArray(recipients)
      ? recipients
      : typeof recipients === "string"
      ? recipients.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (recipientList.length === 0) {
      return next(new AppError("At least one recipient email is required", 400));
    }

    const data = await computeExecutiveData(org, periodType, date, from, to);
    const curr = data.currency;

    const sign = (pct: number | null) => (pct === null ? "—" : pct >= 0 ? `+${pct}%` : `${pct}%`);
    const signColor = (pct: number | null, inverse = false) => {
      if (pct === null) return "#6b7280";
      const isPositive = inverse ? pct <= 0 : pct >= 0;
      return isPositive ? "#10b981" : "#ef4444";
    };

    const subject = `[${data.orgName}] Executive Finance Report: ${data.periodLabel}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; color: #1f2937; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e0d8; overflow: hidden; }
    .header { background: #0b6b48; color: #ffffff; padding: 28px 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 24px; }
    .kpi { background: #faf8f5; border: 1px solid #ebe5dc; border-radius: 8px; padding: 14px; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 600; margin: 0 0 6px; }
    .kpi-value { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
    .kpi-change { font-size: 11px; margin-top: 4px; font-weight: 500; }
    .section-title { font-size: 14px; font-weight: 700; color: #111827; margin: 24px 0 10px; border-bottom: 1px solid #e5e0d8; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th { text-align: left; padding: 8px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e0d8; }
    td { padding: 8px; border-bottom: 1px solid #f3f0e9; color: #374151; }
    .note-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 14px; font-size: 13px; color: #166534; margin-bottom: 20px; }
    .footer { background: #faf8f5; padding: 16px 24px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e0d8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <p style="margin:0 0 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.15em; color: #d1fae5;">EXECUTIVE FINANCIAL BRIEFING</p>
      <h1>${data.orgName}</h1>
      <p>${data.periodLabel} · Currency: ${curr}</p>
    </div>

    <div class="body">
      ${customMessage ? `<div class="note-box"><strong>Note from Leadership:</strong><br>${customMessage}</div>` : ""}

      <div style="display: table; width: 100%; margin-bottom: 16px;">
        <div style="display: table-row;">
          <div style="display: table-cell; width: 50%; padding: 6px;">
            <div class="kpi">
              <div class="kpi-label">TOTAL REVENUE</div>
              <div class="kpi-value" style="color: #0b6b48;">${formatCurrency(data.revenueCents, curr)}</div>
              <div class="kpi-change" style="color: ${signColor(data.revenueChangePct)};">${sign(data.revenueChangePct)} vs prev period</div>
            </div>
          </div>
          <div style="display: table-cell; width: 50%; padding: 6px;">
            <div class="kpi">
              <div class="kpi-label">TOTAL EXPENSES</div>
              <div class="kpi-value" style="color: #b91c1c;">${formatCurrency(data.expensesCents, curr)}</div>
              <div class="kpi-change" style="color: ${signColor(data.expensesChangePct, true)};">${sign(data.expensesChangePct)} vs prev period</div>
            </div>
          </div>
        </div>
        <div style="display: table-row;">
          <div style="display: table-cell; width: 50%; padding: 6px;">
            <div class="kpi">
              <div class="kpi-label">NET PROFIT (MARGIN)</div>
              <div class="kpi-value">${formatCurrency(data.netProfitCents, curr)}</div>
              <div class="kpi-change" style="color: #0b6b48;">${data.netMarginPct}% net margin</div>
            </div>
          </div>
          <div style="display: table-cell; width: 50%; padding: 6px;">
            <div class="kpi">
              <div class="kpi-label">CASH IN BANK (BALANCE)</div>
              <div class="kpi-value" style="color: #1e3a8a;">${formatCurrency(data.cashInBankCents, curr)}</div>
              <div class="kpi-change" style="color: #6b7280;">Active bank reserves</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">Cash Position & Working Capital</div>
      <table>
        <tr><th>Metric</th><th style="text-align: right;">Amount</th><th>Details</th></tr>
        <tr><td><strong>Cash in Bank</strong></td><td style="text-align: right; font-weight:600; color:#1e3a8a;">${formatCurrency(data.cashInBankCents, curr)}</td><td>Verified in bank accounts</td></tr>
        <tr><td><strong>Accounts Receivable</strong></td><td style="text-align: right; font-weight:600; color:#0b6b48;">${formatCurrency(data.receivables.totalCents, curr)}</td><td>${data.receivables.openCount} open invoices (${formatCurrency(data.receivables.overdueCents, curr)} overdue)</td></tr>
        <tr><td><strong>Accounts Payable</strong></td><td style="text-align: right; font-weight:600; color:#b91c1c;">${formatCurrency(data.payables.totalCents, curr)}</td><td>Salaries: ${formatCurrency(data.payables.pendingPayrollCents, curr)} · Loans: ${formatCurrency(data.payables.openLoansCents, curr)}</td></tr>
      </table>

      ${
        data.topExpenses.length > 0
          ? `
      <div class="section-title">Top Spending Drivers (${data.periodLabel})</div>
      <table>
        <tr><th>Category</th><th style="text-align: right;">Amount</th><th style="text-align: right;">Share of Spend</th></tr>
        ${data.topExpenses
          .map(
            (c) => `<tr>
              <td>${c.categoryName}</td>
              <td style="text-align: right; font-weight:600;">${formatCurrency(c.totalCents, curr)}</td>
              <td style="text-align: right; color:#6b7280;">${c.percentage}%</td>
            </tr>`
          )
          .join("")}
      </table>
      `
          : ""
      }
    </div>

    <div class="footer">
      Generated automatically by TGT Finance Management System for ${data.orgName}.<br>
      Report generated on ${format(new Date(), "PPpp")}.
    </div>
  </div>
</body>
</html>
`;

    const plainText = `
${data.orgName} - Executive Financial Report (${data.periodLabel})
------------------------------------------------------------
Revenue:     ${formatCurrency(data.revenueCents, curr)} (${sign(data.revenueChangePct)} vs prev)
Expenses:    ${formatCurrency(data.expensesCents, curr)} (${sign(data.expensesChangePct)} vs prev)
Net Profit:  ${formatCurrency(data.netProfitCents, curr)} (${data.netMarginPct}% margin)
Cash in Bank:${formatCurrency(data.cashInBankCents, curr)}

Receivables: ${formatCurrency(data.receivables.totalCents, curr)} (${data.receivables.openCount} invoices)
Payables:    ${formatCurrency(data.payables.totalCents, curr)} (Salaries + Loans)

${customMessage ? `Note: ${customMessage}\n` : ""}
Generated by TGT Finance on ${new Date().toLocaleDateString()}
`;

    const sendResults = [];
    for (const recipient of recipientList) {
      const resMail = await sendMail({
        to: recipient,
        subject,
        text: plainText,
        html,
      });
      sendResults.push({ recipient, ...resMail });
    }

    sendSuccess(
      res,
      {
        recipientCount: recipientList.length,
        results: sendResults,
        previewReport: data,
      },
      200,
      `Financial report dispatched to ${recipientList.length} recipient${recipientList.length > 1 ? "s" : ""}`
    );
  } catch (err) {
    next(err);
  }
};
