import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  Organization,
  Client,
  Project,
  ExpenseCategory,
  Expense,
  Invoice,
  InvoicePayment,
} from "../models";
import { toCents } from "../utils/money";

dotenv.config();

const seedDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not set");

    await mongoose.connect(uri);
    console.log("✅  Connected to MongoDB");

    // Clear existing data
    await Promise.all([
      Organization.deleteMany({}),
      Client.deleteMany({}),
      Project.deleteMany({}),
      ExpenseCategory.deleteMany({}),
      Expense.deleteMany({}),
      Invoice.deleteMany({}),
      InvoicePayment.deleteMany({}),
    ]);
    console.log("🗑️   Cleared existing data");

    // Create org
    const org = await Organization.create({
      name: "Tech Startup Inc.",
      currency: "USD",
      fiscalYearStart: 1,
      userId: "demo-user-id",
    });
    console.log("✅  Created organization");

    // Create clients
    const clients = await Client.insertMany([
      { orgId: org._id, name: "Acme Corp", email: "contact@acme.com", phone: "+1-555-0101", company: "Acme Corp", isActive: true },
      { orgId: org._id, name: "Global Tech", email: "info@globaltech.com", phone: "+1-555-0102", company: "Global Tech Inc.", isActive: true },
      { orgId: org._id, name: "CloudFirst Systems", email: "hello@cloudfirst.io", phone: "+1-555-0103", company: "CloudFirst", isActive: true },
    ]);
    console.log("✅  Created 3 clients");

    // Create projects
    const projects = await Project.insertMany([
      { orgId: org._id, clientId: clients[0]._id, name: "Website Redesign", budgetCents: toCents(50000), status: "active", startDate: new Date("2024-01-15") },
      { orgId: org._id, clientId: clients[0]._id, name: "Mobile App Development", budgetCents: toCents(120000), status: "active" },
      { orgId: org._id, clientId: clients[1]._id, name: "API Integration", budgetCents: toCents(35000), status: "completed" },
      { orgId: org._id, clientId: clients[1]._id, name: "Cloud Migration", budgetCents: toCents(80000), status: "active" },
      { orgId: org._id, clientId: clients[2]._id, name: "Security Audit", budgetCents: toCents(25000), status: "active" },
    ]);
    console.log("✅  Created 5 projects");

    // Create categories
    const categories = await ExpenseCategory.insertMany([
      { orgId: org._id, name: "Salaries", type: "fixed", color: "#3b82f6", isActive: true },
      { orgId: org._id, name: "Cloud Infrastructure", type: "variable", color: "#10b981", isActive: true },
      { orgId: org._id, name: "Office Rent", type: "fixed", color: "#f59e0b", isActive: true },
      { orgId: org._id, name: "Software Licenses", type: "opex", color: "#8b5cf6", isActive: true },
      { orgId: org._id, name: "Marketing", type: "opex", color: "#ef4444", isActive: true },
      { orgId: org._id, name: "Hardware & Equipment", type: "variable", color: "#06b6d4", isActive: true },
      { orgId: org._id, name: "Client Revenue", type: "revenue", color: "#10b981", isActive: true },
    ]);
    console.log("✅  Created 7 expense categories");

    // Create expenses (30 total)
    const expenseData = [
      { vendor: "AWS", categoryId: categories[1]._id, amount: 5000, date: new Date("2024-01-05") },
      { vendor: "Office Depot", categoryId: categories[5]._id, amount: 2300, date: new Date("2024-01-10") },
      { vendor: "HubSpot", categoryId: categories[3]._id, amount: 800, date: new Date("2024-01-12") },
      { vendor: "Google Ads", categoryId: categories[4]._id, amount: 3500, date: new Date("2024-01-15") },
      { vendor: "Slack", categoryId: categories[3]._id, amount: 600, date: new Date("2024-01-18") },
      { vendor: "Shopify", categoryId: categories[3]._id, amount: 299, date: new Date("2024-01-20") },
      { vendor: "Azure", categoryId: categories[1]._id, amount: 4200, date: new Date("2024-01-22") },
      { vendor: "LinkedIn Ads", categoryId: categories[4]._id, amount: 2000, date: new Date("2024-01-25") },
      { vendor: "Domain.com", categoryId: categories[3]._id, amount: 120, date: new Date("2024-01-28") },
      { vendor: "Dell Computers", categoryId: categories[5]._id, amount: 8500, date: new Date("2024-02-01") },
      { vendor: "AWS", categoryId: categories[1]._id, amount: 5200, date: new Date("2024-02-05") },
      { vendor: "Mailchimp", categoryId: categories[3]._id, amount: 400, date: new Date("2024-02-08") },
      { vendor: "Facebook Ads", categoryId: categories[4]._id, amount: 4000, date: new Date("2024-02-12") },
      { vendor: "Stripe Fees", categoryId: categories[3]._id, amount: 2100, date: new Date("2024-02-15") },
      { vendor: "Figma", categoryId: categories[3]._id, amount: 480, date: new Date("2024-02-18") },
      { vendor: "GitHub Enterprise", categoryId: categories[3]._id, amount: 231, date: new Date("2024-02-20") },
      { vendor: "DataDog", categoryId: categories[3]._id, amount: 950, date: new Date("2024-02-22") },
      { vendor: "Zoom", categoryId: categories[3]._id, amount: 156, date: new Date("2024-02-25") },
      { vendor: "AWS", categoryId: categories[1]._id, amount: 5100, date: new Date("2024-02-28") },
      { vendor: "Google Cloud", categoryId: categories[1]._id, amount: 3800, date: new Date("2024-03-02") },
      { vendor: "Notion", categoryId: categories[3]._id, amount: 480, date: new Date("2024-03-05") },
      { vendor: "Monday.com", categoryId: categories[3]._id, amount: 600, date: new Date("2024-03-08") },
      { vendor: "Canva", categoryId: categories[3]._id, amount: 180, date: new Date("2024-03-10") },
      { vendor: "Twilio", categoryId: categories[3]._id, amount: 750, date: new Date("2024-03-12") },
      { vendor: "Typeform", categoryId: categories[3]._id, amount: 99, date: new Date("2024-03-15") },
      { vendor: "Grammarly Business", categoryId: categories[3]._id, amount: 180, date: new Date("2024-03-18") },
      { vendor: "Adobe Creative Cloud", categoryId: categories[3]._id, amount: 600, date: new Date("2024-03-20") },
      { vendor: "MailerLite", categoryId: categories[3]._id, amount: 299, date: new Date("2024-03-22") },
      { vendor: "SEMrush", categoryId: categories[4]._id, amount: 399, date: new Date("2024-03-25") },
      { vendor: "Airtable", categoryId: categories[3]._id, amount: 480, date: new Date("2024-03-28") },
    ];

    for (const exp of expenseData) {
      await Expense.create({
        orgId: org._id,
        projectId: Math.random() > 0.5 ? projects[Math.floor(Math.random() * projects.length)]._id : undefined,
        ...exp,
        amountCents: toCents(exp.amount),
        source: "manual",
      });
    }
    console.log("✅  Created 30 expenses");

    // Create invoices (10 total)
    for (let i = 1; i <= 10; i++) {
      const invoiceDate = new Date(2024, Math.floor((i - 1) / 3), 5 + i * 2);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await Invoice.create({
        orgId: org._id,
        clientId: clients[i % clients.length]._id,
        projectId: projects[i % projects.length]._id,
        invoiceNumber: `INV-${String(i).padStart(4, "0")}`,
        amountCents: toCents(15000 + i * 2000),
        issueDate: invoiceDate,
        dueDate,
        status: i <= 5 ? "paid" : "sent",
        description: `Invoice for ${projects[i % projects.length].name}`,
      });

      // Add payment if paid
      if (i <= 5) {
        await InvoicePayment.create({
          orgId: org._id,
          invoiceId: invoice._id,
          amountCents: invoice.amountCents,
          paidDate: new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000),
          method: ["bank_transfer", "credit_card", "cheque"][i % 3],
          reference: `PAY-${i}`,
        });
      }
    }
    console.log("✅  Created 10 invoices");

    console.log("\n🎉  Seed complete! You now have:");
    console.log("  • 1 organization");
    console.log("  • 3 clients");
    console.log("  • 5 projects");
    console.log("  • 7 expense categories");
    console.log("  • 30 expenses");
    console.log("  • 10 invoices (5 paid, 5 sent)");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌  Seed failed:", error);
    process.exit(1);
  }
};

seedDB();
