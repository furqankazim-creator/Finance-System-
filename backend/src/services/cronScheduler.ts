import cron from "node-cron";
import { Organization } from "../models";
import { computeExecutiveData } from "../controllers/reportController";
import { sendMail } from "../utils/mailer";
import { formatCurrency } from "../utils/money";

interface DispatchResult {
  orgName: string;
  recipients: string[];
  periodType: string;
  status: "sent" | "skipped" | "failed";
  error?: string;
  previewUrl?: string;
}

export const dispatchScheduledDigests = async (
  periodType: "weekly" | "monthly",
  targetOrgId?: string
): Promise<{ dispatched: number; details: DispatchResult[] }> => {
  const filter: any = {};
  if (targetOrgId) {
    filter._id = targetOrgId;
  } else {
    if (periodType === "weekly") {
      filter.weeklyDigestEnabled = true;
    } else {
      filter.monthlyDigestEnabled = true;
    }
  }

  const organizations = await Organization.find(filter);
  const results: DispatchResult[] = [];

  for (const org of organizations) {
    const recipients = (org.partnerEmails || []).filter((e) => e && e.trim().length > 0);
    if (recipients.length === 0) {
      results.push({
        orgName: org.name,
        recipients: [],
        periodType,
        status: "skipped",
        error: "No partner emails configured",
      });
      continue;
    }

    try {
      const data = await computeExecutiveData(org, periodType);
      const curr = data.currency;

      const sign = (pct: number | null) => (pct === null ? "—" : pct >= 0 ? `+${pct}%` : `${pct}%`);
      const signColor = (pct: number | null, inverse = false) => {
        if (pct === null) return "#6b7280";
        const isPositive = inverse ? pct <= 0 : pct >= 0;
        return isPositive ? "#10b981" : "#ef4444";
      };

      const subject = `[${data.orgName}] Automated ${periodType === "weekly" ? "Weekly" : "Monthly"} Briefing: ${data.periodLabel}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 28px 24px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .title { margin: 12px 0 4px 0; font-size: 22px; font-weight: 800; }
    .subtitle { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 6px 0; }
    .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .kpi-delta { font-size: 11px; font-weight: 600; margin-top: 4px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin: 20px 0 10px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f8fafc; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Scheduled Executive Pulse</span>
      <h1 class="title">${data.orgName}</h1>
      <p class="subtitle">${data.periodLabel} Briefing for Partners & Leadership</p>
    </div>
    <div class="content">
      <div class="kpi-grid">
        <div class="kpi-card">
          <p class="kpi-label">Revenue</p>
          <p class="kpi-value">${formatCurrency(data.revenueCents, curr)}</p>
          <p class="kpi-delta" style="color: ${signColor(data.revenueChangePct)};">${sign(data.revenueChangePct)} vs prev</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Expenses</p>
          <p class="kpi-value">${formatCurrency(data.expensesCents, curr)}</p>
          <p class="kpi-delta" style="color: ${signColor(data.expensesChangePct, true)};">${sign(data.expensesChangePct)} vs prev</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Net Profit</p>
          <p class="kpi-value" style="color: ${data.netProfitCents >= 0 ? "#059669" : "#dc2626"};">${formatCurrency(data.netProfitCents, curr)}</p>
          <p class="kpi-delta" style="color: ${signColor(data.netProfitChangePct)};">${sign(data.netProfitChangePct)} vs prev</p>
        </div>
        <div class="kpi-card">
          <p class="kpi-label">Cash in Bank</p>
          <p class="kpi-value">${formatCurrency(data.cashInBankCents, curr)}</p>
          <p class="kpi-delta" style="color: #059669;">Liquid Reserves</p>
        </div>
      </div>

      <div class="section-title">Liquidity & Working Capital</div>
      <div class="row">
        <span>Accounts Receivable (Open Customer Invoices):</span>
        <strong>${formatCurrency(data.receivables.totalCents, curr)} (${data.receivables.openCount} invoices)</strong>
      </div>
      <div class="row">
        <span>Overdue Invoices:</span>
        <strong style="color: #dc2626;">${formatCurrency(data.receivables.overdueCents, curr)} (${data.receivables.overdueCount} overdue)</strong>
      </div>
      <div class="row">
        <span>Accounts Payable & Liabilities:</span>
        <strong>${formatCurrency(data.payables.totalCents, curr)}</strong>
      </div>

      <div class="section-title">Top Expense Drivers</div>
      ${data.topExpenses
        .map(
          (e) => `
        <div class="row">
          <span>${e.categoryName} (${e.percentage}% of spend)</span>
          <strong>${formatCurrency(e.totalCents, curr)}</strong>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="footer">
      Automated dispatch generated by TGT Finance for ${data.orgName}. Configured in System Settings.
    </div>
  </div>
</body>
</html>
      `;

      const mailRes = await sendMail({
        to: recipients.join(", "),
        subject,
        text: `[${data.orgName}] ${periodType.toUpperCase()} BRIEFING: ${data.periodLabel}\nRevenue: ${formatCurrency(data.revenueCents, curr)}\nExpenses: ${formatCurrency(data.expensesCents, curr)}\nNet Profit: ${formatCurrency(data.netProfitCents, curr)}`,
        html,
      });

      results.push({
        orgName: org.name,
        recipients,
        periodType,
        status: "sent",
        previewUrl: mailRes.previewUrl,
      });
    } catch (err: any) {
      results.push({
        orgName: org.name,
        recipients,
        periodType,
        status: "failed",
        error: err.message,
      });
    }
  }

  return {
    dispatched: results.filter((r) => r.status === "sent").length,
    details: results,
  };
};

export const startCronScheduler = () => {
  // Weekly Digest: Every Monday at 09:00 AM
  cron.schedule("0 9 * * 1", async () => {
    console.log("⏰ [Cron] Running automated Monday weekly partner financial briefing...");
    try {
      const res = await dispatchScheduledDigests("weekly");
      console.log(`✅ [Cron] Weekly briefings dispatched to ${res.dispatched} organizations.`);
    } catch (err) {
      console.error("❌ [Cron] Error during weekly digest dispatch:", err);
    }
  });

  // Monthly Digest: 1st of every month at 09:00 AM
  cron.schedule("0 9 1 * *", async () => {
    console.log("⏰ [Cron] Running automated 1st-of-month executive board briefing...");
    try {
      const res = await dispatchScheduledDigests("monthly");
      console.log(`✅ [Cron] Monthly briefings dispatched to ${res.dispatched} organizations.`);
    } catch (err) {
      console.error("❌ [Cron] Error during monthly digest dispatch:", err);
    }
  });

  console.log("⏰  Background executive report scheduler initialized (Weekly Mon 09:00, Monthly 1st 09:00)");
};
