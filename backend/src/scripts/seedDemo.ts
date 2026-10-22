import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  Organization,
  Client,
  Project,
  ExpenseCategory,
  Expense,
  Invoice,
  InvoicePayment,
  Payroll,
  Account,
  Transaction,
  BankAccount,
  BankTransaction,
  StatementFile,
} from "../models";
import User from "../models/User";
import { toCents } from "../utils/money";
import { seedDefaultChartOfAccounts } from "../controllers/accountController";

dotenv.config();

// Usage: npm run seed:demo [email]   (defaults to demo@example.com)
const email = (process.argv[2] || "demo@example.com").toLowerCase();

const monthsAgo = (m: number, day = 10) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - m, day);
};
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);

  const user = await User.findOne({ email });
  if (!user) throw new Error(`User ${email} not found. Sign up first.`);

  let org = await Organization.findOne({ userId: user.id });
  if (!org) {
    org = await Organization.create({
      name: `${user.fullName}'s Organization`,
      currency: "PKR",
      fiscalYearStart: 1,
      userId: user.id,
    });
  }
  const orgId = org._id;

  // Clear only this org's business data (keeps user, org and chart of accounts)
  await Promise.all([
    Client.deleteMany({ orgId }),
    Project.deleteMany({ orgId }),
    ExpenseCategory.deleteMany({ orgId }),
    Expense.deleteMany({ orgId }),
    Invoice.deleteMany({ orgId }),
    InvoicePayment.deleteMany({ orgId }),
    Payroll.deleteMany({ orgId }),
    Transaction.deleteMany({ orgId }),
    BankAccount.deleteMany({ orgId }),
    BankTransaction.deleteMany({ orgId }),
    StatementFile.deleteMany({ orgId }),
  ]);

  if ((await Account.countDocuments({ orgId })) === 0) {
    await seedDefaultChartOfAccounts(orgId);
  }
  const accounts = await Account.find({ orgId });
  const acc = (num: string) => accounts.find((a) => a.accountNumber === num)!._id;

  // Clients
  const clients = await Client.insertMany([
    { orgId, name: "Acme Corp", email: "contact@acme.com", phone: "+92-300-1000001", company: "Acme Corp", address: "Karachi", isActive: true },
    { orgId, name: "Global Tech", email: "info@globaltech.com", phone: "+92-300-1000002", company: "Global Tech Inc.", address: "Lahore", isActive: true },
    { orgId, name: "CloudFirst Systems", email: "hello@cloudfirst.io", phone: "+92-300-1000003", company: "CloudFirst", address: "Islamabad", isActive: true },
    { orgId, name: "Nova Retail", email: "accounts@novaretail.pk", phone: "+92-300-1000004", company: "Nova Retail", address: "Faisalabad", isActive: true },
  ]);

  // Projects
  const projects = await Project.insertMany([
    { orgId, clientId: clients[0]._id, name: "Website Redesign", budgetCents: toCents(500000), status: "active", startDate: monthsAgo(6) },
    { orgId, clientId: clients[0]._id, name: "Mobile App Development", budgetCents: toCents(1200000), status: "active", startDate: monthsAgo(5) },
    { orgId, clientId: clients[1]._id, name: "API Integration", budgetCents: toCents(350000), status: "completed", startDate: monthsAgo(8), endDate: monthsAgo(2) },
    { orgId, clientId: clients[1]._id, name: "Cloud Migration", budgetCents: toCents(800000), status: "active", startDate: monthsAgo(4) },
    { orgId, clientId: clients[2]._id, name: "Security Audit", budgetCents: toCents(250000), status: "on-hold", startDate: monthsAgo(3) },
    { orgId, clientId: clients[3]._id, name: "E-commerce Platform", budgetCents: toCents(950000), status: "active", startDate: monthsAgo(2) },
  ]);

  // Categories
  const cats = await ExpenseCategory.insertMany([
    { orgId, name: "Salaries", type: "fixed", color: "#3b82f6" },
    { orgId, name: "Cloud Infrastructure", type: "variable", color: "#10b981" },
    { orgId, name: "Office Rent", type: "fixed", color: "#f59e0b" },
    { orgId, name: "Software Licenses", type: "opex", color: "#8b5cf6" },
    { orgId, name: "Marketing", type: "opex", color: "#ef4444" },
    { orgId, name: "Hardware & Equipment", type: "variable", color: "#06b6d4" },
    { orgId, name: "Client Revenue", type: "revenue", color: "#22c55e" },
  ]);

  // Expenses: 6 months of recurring costs
  const expenses: any[] = [];
  for (let m = 5; m >= 0; m--) {
    const p = (i: number) => projects[i % projects.length]._id;
    expenses.push(
      { vendor: "AWS", categoryId: cats[1]._id, amount: 45000 + m * 1500, date: monthsAgo(m, 5), projectId: p(3), accountId: acc("5060") },
      { vendor: "Landlord - Office Rent", categoryId: cats[2]._id, amount: 120000, date: monthsAgo(m, 1), accountId: acc("5030") },
      { vendor: "Google Ads", categoryId: cats[4]._id, amount: 30000 + (m % 3) * 5000, date: monthsAgo(m, 12), accountId: acc("5050") },
      { vendor: "Slack & Notion", categoryId: cats[3]._id, amount: 8000, date: monthsAgo(m, 15), accountId: acc("5060") },
      { vendor: "K-Electric / Internet", categoryId: cats[2]._id, amount: 22000 + m * 800, date: monthsAgo(m, 20), accountId: acc("5040") },
      { vendor: "GitHub Enterprise", categoryId: cats[3]._id, amount: 6500, date: monthsAgo(m, 22), projectId: p(m), accountId: acc("5060") },
    );
  }
  expenses.push(
    { vendor: "Dell Computers", categoryId: cats[5]._id, amount: 285000, date: monthsAgo(3, 8), accountId: acc("5070") },
    { vendor: "Apple Store", categoryId: cats[5]._id, amount: 195000, date: monthsAgo(1, 14), accountId: acc("5070") },
  );
  await Expense.insertMany(
    expenses.map(({ amount, ...e }) => ({
      orgId,
      source: "manual",
      description: `${e.vendor} payment`,
      ...e,
      amountCents: toCents(amount),
    }))
  );

  // Invoices: 12 over the last 6 months (mix of statuses)
  let n = 1;
  for (let m = 5; m >= 0; m--) {
    for (let k = 0; k < 2; k++) {
      const issueDate = monthsAgo(m, k === 0 ? 3 : 18);
      const dueDate = new Date(issueDate.getTime() + 30 * 86400000);
      const amount = 150000 + n * 25000;
      let status: "paid" | "sent" | "overdue" = "paid";
      if (m === 0) status = "sent";
      else if (m === 1 && k === 1) status = "overdue";
      else if (m === 1) status = "sent";
      const inv = await Invoice.create({
        orgId,
        clientId: clients[n % clients.length]._id,
        projectId: projects[n % projects.length]._id,
        accountId: acc("4010"),
        invoiceNumber: `INV-${String(n).padStart(4, "0")}`,
        amountCents: toCents(amount),
        issueDate,
        dueDate: status === "sent" && m === 0 ? daysFromNow(15 + k * 7) : dueDate,
        status,
        description: `Services for ${projects[n % projects.length].name}`,
      });
      if (status === "paid") {
        await InvoicePayment.create({
          orgId,
          invoiceId: inv._id,
          amountCents: inv.amountCents,
          paidDate: new Date(issueDate.getTime() + 14 * 86400000),
          method: (["bank_transfer", "credit_card", "cheque", "cash"] as const)[n % 4],
          reference: `PAY-${n}`,
        });
      }
      n++;
    }
  }

  // Payroll: last 3 months
  const staff = [
    { name: "Ali Raza", role: "Senior Developer", gross: 250000 },
    { name: "Sara Khan", role: "UI/UX Designer", gross: 180000 },
    { name: "Usman Tariq", role: "DevOps Engineer", gross: 220000 },
    { name: "Hina Malik", role: "Project Manager", gross: 200000 },
  ];
  for (let m = 3; m >= 0; m--) {
    const d = monthsAgo(m, 28);
    for (const s of staff) {
      const deductions = Math.round(s.gross * 0.05);
      const paid = m > 0;
      await Payroll.create({
        orgId,
        accountId: acc("5020"),
        employeeName: s.name,
        employeeEmail: `${s.name.toLowerCase().replace(" ", ".")}@example.com`,
        role: s.role,
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        grossCents: toCents(s.gross),
        deductionsCents: toCents(deductions),
        netCents: toCents(s.gross - deductions),
        status: paid ? "paid" : "pending",
        paidDate: paid ? d : undefined,
      });
    }
  }

  // Bookkeeping transactions (capital, loans, assets) -> Chart of Accounts, Payables
  await Transaction.insertMany([
    { orgId, accountId: acc("3010"), type: "equity", transactionRef: "EQ-001", amountCents: toCents(5000000), date: monthsAgo(8), description: "Initial owner capital", investorName: "Founder" },
    { orgId, accountId: acc("3010"), type: "equity", transactionRef: "EQ-002", amountCents: toCents(2000000), date: monthsAgo(4), description: "Angel investment", investorName: "Angel Investor" },
    { orgId, accountId: acc("2030"), type: "liability", transactionRef: "LN-001", amountCents: toCents(1500000), paidCents: toCents(500000), date: monthsAgo(5), description: "Business loan - HBL", debtor: "HBL Bank", status: "open" },
    { orgId, accountId: acc("2030"), type: "liability", transactionRef: "LN-002", amountCents: toCents(400000), paidCents: toCents(400000), date: monthsAgo(7), description: "Equipment loan (settled)", debtor: "Meezan Bank", status: "settled" },
    { orgId, accountId: acc("1040"), type: "asset", transactionRef: "AS-001", amountCents: toCents(285000), date: monthsAgo(3), description: "Dell workstations", assetType: "Computers", location: "Head office" },
    { orgId, accountId: acc("1040"), type: "asset", transactionRef: "AS-002", amountCents: toCents(450000), date: monthsAgo(6), description: "Office furniture", assetType: "Furniture", location: "Head office" },
    { orgId, accountId: acc("1010"), type: "asset", transactionRef: "AS-003", amountCents: toCents(1200000), date: monthsAgo(1), description: "Cash in bank", assetType: "Cash" },
  ]);

  // Bank accounts + statement lines
  const bankAccounts = await BankAccount.insertMany([
    { orgId, bankName: "HBL", accountNumberMasked: "****4521", accountType: "checking", currency: "PKR" },
    { orgId, bankName: "Meezan Bank", accountNumberMasked: "****7788", accountType: "savings", currency: "PKR" },
  ]);
  const bankLines: any[] = [];
  const paidPayments = await InvoicePayment.find({ orgId }).sort({ paidDate: 1 });
  for (const p of paidPayments) {
    bankLines.push({
      bankAccountId: bankAccounts[0]._id,
      date: p.paidDate,
      description: `Incoming transfer - ${p.reference}`,
      amountCents: p.amountCents,
      direction: "inflow",
      status: "matched",
      matchedInvoicePaymentId: p._id,
    });
  }
  for (let m = 5; m >= 0; m--) {
    bankLines.push(
      { bankAccountId: bankAccounts[0]._id, date: monthsAgo(m, 1), description: "Office rent - Landlord", amountCents: toCents(120000), direction: "outflow", status: "unmatched" },
      { bankAccountId: bankAccounts[0]._id, date: monthsAgo(m, 5), description: "AWS monthly bill", amountCents: toCents(45000 + m * 1500), direction: "outflow", status: "unmatched" },
      { bankAccountId: bankAccounts[0]._id, date: monthsAgo(m, 28), description: "Salary disbursement", amountCents: toCents(760000), direction: "outflow", status: "matched" },
    );
  }
  bankLines.push(
    { bankAccountId: bankAccounts[0]._id, date: monthsAgo(1, 25), description: "Incoming transfer - Nova Retail", amountCents: toCents(180000), direction: "inflow", status: "unmatched" },
    { bankAccountId: bankAccounts[0]._id, date: monthsAgo(0, 2), description: "Incoming transfer - Global Tech", amountCents: toCents(225000), direction: "inflow", status: "unmatched" },
    { bankAccountId: bankAccounts[1]._id, date: monthsAgo(4, 10), description: "Opening deposit", amountCents: toCents(2000000), direction: "inflow", status: "matched" },
    { bankAccountId: bankAccounts[1]._id, date: monthsAgo(1, 30), description: "Profit credit", amountCents: toCents(18500), direction: "inflow", status: "unmatched" },
    { bankAccountId: bankAccounts[1]._id, date: monthsAgo(0, 4), description: "Bank service charges", amountCents: toCents(1500), direction: "outflow", status: "ignored" },
  );
  await BankTransaction.insertMany(bankLines.map((l) => ({ orgId, ...l })));

  // Sample Saved Statement Files on disk and in DB
  const uploadDir = path.join(__dirname, "..", "..", "uploads", "statements", String(orgId));
  fs.mkdirSync(uploadDir, { recursive: true });

  // 1. Excel Workbook
  const excelRows = [
    { Date: "2026-10-01", Description: "Office rent - October", Debit: 120000, Credit: "" },
    { Date: "2026-10-05", Description: "AWS monthly bill", Debit: 48000, Credit: "" },
    { Date: "2026-10-12", Description: "Client payment - Acme Corp", Debit: "", Credit: 250000 },
    { Date: "2026-10-18", Description: "Client payment - Global Tech", Debit: "", Credit: 180000 },
    { Date: "2026-10-25", Description: "Incoming transfer - Nova Retail", Debit: "", Credit: 180000 },
  ];
  const ws = XLSX.utils.json_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "October Statement");
  const excelBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const excelStored = "demo_hbl_october.xlsx";
  fs.writeFileSync(path.join(uploadDir, excelStored), excelBuf);

  // 2. CSV File
  const csvContent =
    "Date,Description,Amount\n2026-10-01,Opening deposit,2000000\n2026-10-15,Profit credit,18500\n2026-10-20,Bank service charges,-1500\n";
  const csvStored = "demo_meezan_q3.csv";
  fs.writeFileSync(path.join(uploadDir, csvStored), Buffer.from(csvContent, "utf-8"));

  // 3. PDF Statement
  const pdfContent =
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000118 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n200\n%%EOF";
  const pdfStored = "demo_bank_confirmation.pdf";
  fs.writeFileSync(path.join(uploadDir, pdfStored), Buffer.from(pdfContent, "utf-8"));

  // 4. PNG Image (Deposit slip receipt)
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGYzEAAO1wDBH972k8AAAAAElFTkSuQmCC";
  const pngStored = "demo_deposit_slip.png";
  fs.writeFileSync(path.join(uploadDir, pngStored), Buffer.from(pngBase64, "base64"));

  await StatementFile.insertMany([
    {
      orgId,
      bankAccountId: bankAccounts[0]._id,
      originalName: "HBL_October_2026_Statement.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: excelBuf.length,
      storedName: excelStored,
      notes: "Official monthly bank statement in Excel format",
    },
    {
      orgId,
      bankAccountId: bankAccounts[1]._id,
      originalName: "Meezan_Q3_Statement.csv",
      mimeType: "text/csv",
      sizeBytes: Buffer.byteLength(csvContent),
      storedName: csvStored,
      notes: "Exported CSV statement from online banking",
    },
    {
      orgId,
      bankAccountId: bankAccounts[0]._id,
      originalName: "Bank_Confirmation_Letter.pdf",
      mimeType: "application/pdf",
      sizeBytes: Buffer.byteLength(pdfContent),
      storedName: pdfStored,
      notes: "Signed bank confirmation statement (PDF)",
    },
    {
      orgId,
      bankAccountId: bankAccounts[0]._id,
      originalName: "Deposit_Slip_AcmeCorp.png",
      mimeType: "image/png",
      sizeBytes: 78,
      storedName: pngStored,
      notes: "Cheque deposit counterfoil scan",
    },
  ]);

  console.log(`Demo data seeded for ${email} (org: ${org.name})`);
  console.log("4 clients, 6 projects, 7 categories, 38 expenses, 12 invoices, 16 payroll rows, 7 bookkeeping entries, 2 bank accounts with statement lines, 4 saved statement files (Excel, CSV, PDF, Image)");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

