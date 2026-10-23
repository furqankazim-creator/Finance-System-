import PDFDocument from "pdfkit";
import { formatCurrency } from "./money";

export const generateInvoicePdf = (
  invoice: any,
  client: any,
  org: any,
  stream: NodeJS.WritableStream
) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  const curr = invoice.currency || org?.currency || "PKR";

  // Brand Header
  doc
    .fillColor("#059669")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(org?.name || "TGT Finance", 40, 40);

  doc
    .fillColor("#64748b")
    .fontSize(9)
    .font("Helvetica")
    .text(
      [org?.address, org?.city, org?.country].filter(Boolean).join(", ") ||
        "Executive Enterprise Ledger",
      40,
      68
    );

  if (org?.taxId) {
    doc.text(`Tax ID / NTN: ${org.taxId}`, 40, 80);
  }
  if (org?.email) {
    doc.text(`Email: ${org.email} | Phone: ${org?.phone || "—"}`, 40, 92);
  }

  // Invoice Title & Status Stamp (Right-Aligned)
  doc
    .fillColor("#0f172a")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("INVOICE", 400, 40, { align: "right" });

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#059669")
    .text(invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6)}`, 400, 68, {
      align: "right",
    });

  const status = (invoice.status || "draft").toUpperCase();
  const statusColor =
    status === "PAID" ? "#059669" : status === "OVERDUE" ? "#dc2626" : "#475569";

  doc
    .fontSize(9)
    .fillColor(statusColor)
    .font("Helvetica-Bold")
    .text(`STATUS: ${status}`, 400, 82, { align: "right" });

  // Divider
  doc
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .moveTo(40, 115)
    .lineTo(555, 115)
    .stroke();

  // Two columns: Bill To & Invoice Meta
  // Bill To
  doc
    .fillColor("#64748b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("BILLED TO:", 40, 130);

  doc
    .fillColor("#0f172a")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(client?.name || "Valued Client", 40, 144);

  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica")
    .text(client?.email || "", 40, 158)
    .text(client?.phone || "", 40, 170)
    .text(client?.address || "", 40, 182);

  // Invoice Dates
  doc
    .fillColor("#64748b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("INVOICE DETAILS:", 350, 130);

  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Issue Date: ${new Date(invoice.issueDate || Date.now()).toISOString().slice(0, 10)}`,
      350,
      144
    )
    .text(
      `Due Date: ${new Date(invoice.dueDate || Date.now()).toISOString().slice(0, 10)}`,
      350,
      158
    )
    .text(
      `Payment Terms: Net ${org?.paymentTermsDays || 30} Days`,
      350,
      172
    );

  // Line items table
  let tableTop = 215;

  doc.rect(40, tableTop, 515, 24).fill("#f8fafc");

  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("ITEM DESCRIPTION", 50, tableTop + 7)
    .text("QTY", 330, tableTop + 7, { width: 40, align: "center" })
    .text("UNIT RATE", 380, tableTop + 7, { width: 75, align: "right" })
    .text("AMOUNT", 465, tableTop + 7, { width: 80, align: "right" });

  let y = tableTop + 30;
  const items = invoice.lineItems || invoice.items || [];

  if (items.length === 0) {
    items.push({
      description: "Professional Services / Retainer",
      quantity: 1,
      unitPriceCents: invoice.amountCents,
      totalCents: invoice.amountCents,
    });
  }

  items.forEach((item: any, idx: number) => {
    if (idx % 2 === 1) {
      doc.rect(40, y - 4, 515, 20).fill("#fafafa");
    }

    const qty = item.quantity || 1;
    const unitPrice = item.unitPriceCents || item.unitPrice || 0;
    const total = item.totalCents || qty * unitPrice;

    doc
      .fillColor("#1e293b")
      .fontSize(9)
      .font("Helvetica")
      .text(item.description || "Service", 50, y, { width: 270 })
      .text(String(qty), 330, y, { width: 40, align: "center" })
      .text(formatCurrency(unitPrice, curr), 380, y, { width: 75, align: "right" })
      .font("Helvetica-Bold")
      .text(formatCurrency(total, curr), 465, y, { width: 80, align: "right" });

    y += 22;
  });

  // Totals Section
  doc
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .moveTo(40, y + 5)
    .lineTo(555, y + 5)
    .stroke();

  y += 15;

  const totalCents = invoice.amountCents || 0;

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0f172a")
    .text("TOTAL DUE:", 350, y, { width: 105, align: "right" })
    .fillColor("#059669")
    .text(formatCurrency(totalCents, curr), 465, y, { width: 80, align: "right" });

  // Bank Wire Details & Remittance
  y += 40;
  doc
    .rect(40, y, 515, 75)
    .fillAndStroke("#f8fafc", "#e2e8f0");

  doc
    .fillColor("#059669")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("PAYMENT INSTRUCTIONS & REMITTANCE", 52, y + 10);

  doc
    .fillColor("#475569")
    .fontSize(8.5)
    .font("Helvetica")
    .text(
      org?.notes ||
        "Please remit payment via wire transfer quoting invoice reference number.\nThank you for partnering with us.",
      52,
      y + 25,
      { width: 490 }
    );

  // Footer
  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text(
      `Generated by TGT Finance Enterprise · Official Document #${invoice.invoiceNumber || invoice._id}`,
      40,
      780,
      { align: "center", width: 515 }
    );

  doc.end();
};

export const generateExecutiveReportPdf = (
  execData: any,
  org: any,
  stream: NodeJS.WritableStream
) => {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(stream);

  const curr = execData.currency || org?.currency || "PKR";

  // Header
  doc
    .fillColor("#059669")
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(org?.name || "TGT Finance", 40, 40);

  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(`EXECUTIVE FINANCIAL REPORT · ${execData.periodLabel}`, 40, 68);

  doc
    .fillColor("#64748b")
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Report Type: ${execData.periodType.toUpperCase()} DIGEST | Generated: ${new Date().toISOString().slice(0, 10)}`,
      40,
      84
    );

  // Top Border
  doc
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .moveTo(40, 105)
    .lineTo(555, 105)
    .stroke();

  // 4 Primary Executive KPIs in Boxes
  const kpiTop = 120;
  const boxWidth = 120;
  const gap = 11;

  const kpis = [
    { label: "REVENUE", value: formatCurrency(execData.revenueCents, curr), color: "#059669" },
    { label: "EXPENSES", value: formatCurrency(execData.expensesCents, curr), color: "#d97706" },
    {
      label: "NET PROFIT",
      value: formatCurrency(execData.netProfitCents, curr),
      color: execData.netProfitCents >= 0 ? "#059669" : "#dc2626",
    },
    { label: "BANK BALANCE", value: formatCurrency(execData.cashInBankCents, curr), color: "#2563eb" },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (boxWidth + gap);
    doc.rect(x, kpiTop, boxWidth, 58).fillAndStroke("#f8fafc", "#e2e8f0");
    doc
      .fillColor("#64748b")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(kpi.label, x + 10, kpiTop + 10);
    doc
      .fillColor(kpi.color)
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(kpi.value, x + 10, kpiTop + 26);
  });

  // Working Capital Section
  let y = 200;
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Working Capital & Operational Balances", 40, y);

  y += 20;
  doc.rect(40, y, 515, 80).fillAndStroke("#ffffff", "#e2e8f0");

  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica")
    .text("Total Accounts Receivable (Open Customer Invoices):", 55, y + 14)
    .font("Helvetica-Bold")
    .text(
      `${formatCurrency(execData.receivables.totalCents, curr)} (${execData.receivables.openCount} invoices)`,
      360,
      y + 14,
      { align: "right", width: 180 }
    );

  doc
    .font("Helvetica")
    .text("Overdue Client Invoices:", 55, y + 34)
    .font("Helvetica-Bold")
    .fillColor("#dc2626")
    .text(
      `${formatCurrency(execData.receivables.overdueCents, curr)} (${execData.receivables.overdueCount} overdue)`,
      360,
      y + 34,
      { align: "right", width: 180 }
    );

  doc
    .fillColor("#475569")
    .font("Helvetica")
    .text("Total Accounts Payable & Debt Obligations:", 55, y + 54)
    .font("Helvetica-Bold")
    .text(
      formatCurrency(execData.payables.totalCents, curr),
      360,
      y + 54,
      { align: "right", width: 180 }
    );

  // Top Expenses
  y += 105;
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Top Spending Categories", 40, y);

  y += 18;
  doc.rect(40, y, 515, 20).fill("#f1f5f9");

  doc
    .fillColor("#475569")
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("CATEGORY", 50, y + 5)
    .text("SHARE OF SPEND", 320, y + 5, { width: 100, align: "center" })
    .text("TOTAL SPENT", 435, y + 5, { width: 110, align: "right" });

  y += 24;

  execData.topExpenses.forEach((exp: any, i: number) => {
    if (i % 2 === 1) {
      doc.rect(40, y - 3, 515, 18).fill("#f8fafc");
    }
    doc
      .fillColor("#1e293b")
      .fontSize(8.5)
      .font("Helvetica")
      .text(exp.categoryName, 50, y)
      .text(`${exp.percentage}%`, 320, y, { width: 100, align: "center" })
      .font("Helvetica-Bold")
      .text(formatCurrency(exp.totalCents, curr), 435, y, { width: 110, align: "right" });

    y += 20;
  });

  // Executive Confidentiality Disclaimer
  y += 30;
  doc
    .rect(40, y, 515, 55)
    .fillAndStroke("#f8fafc", "#e2e8f0");

  doc
    .fillColor("#059669")
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("EXECUTIVE GOVERNANCE NOTICE", 50, y + 10);

  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica")
    .text(
      org?.notes ||
        "Strictly confidential. Prepared for board members, executive leadership, and designated partners. Synchronized in real time with the general ledger.",
      50,
      y + 24,
      { width: 495 }
    );

  // Footer
  doc
    .fontSize(8)
    .fillColor("#94a3b8")
    .text("TGT Finance Enterprise · Automated Executive Briefing", 40, 780, {
      align: "center",
      width: 515,
    });

  doc.end();
};
