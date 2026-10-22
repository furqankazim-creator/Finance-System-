# Finance Management System — Phase 1

A full-stack web application for managing finances, built with **Next.js 14**, **Express**, **MongoDB**, and **Supabase Auth**. Phase 1 focuses on core bookkeeping: manual expense & invoice entry, client/project management, and P&L reporting.

---

## 📋 Feature Overview

### Phase 1 (Complete)
- ✅ User authentication (Supabase)
- ✅ Organization setup (single org per account)
- ✅ CRUD for clients, projects, expense categories
- ✅ Manual expense entry (linked to categories & projects)
- ✅ Manual invoice entry & payment recording
- ✅ Dashboard with current month metrics, top expenses, outstanding invoices
- ✅ P&L report with monthly trends and category breakdown
- ✅ All money values stored as integers (cents) to avoid float errors

### Phase 2+ (Future)
- Bank statement upload & parsing (CSV/PDF)
- AI auto-categorization & reconciliation suggestions
- AI-written monthly summaries
- Natural language Q&A over financial data
- Receipt OCR
- Payroll management
- Budget tracking & alerts

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14 (App Router), TypeScript, React, Tailwind CSS, shadcn/ui, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB + Mongoose |
| **Auth** | Supabase (JWT-based) |
| **Storage** | Supabase Storage (future phases) |
| **Deployment** | Vercel (frontend), Railway/Render (backend) |

---

## 📁 Project Structure

```
Finance Management System/
├── frontend/                    # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/             # Login/signup pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   └── layout.tsx          # Root layout with auth context
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (button, input, table, etc.)
│   │   ├── layout/             # Sidebar, header
│   │   ├── forms/              # Form components (future)
│   │   └── charts/             # Chart components (future)
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   ├── auth-context.tsx    # Auth context provider
│   │   ├── api.ts              # Axios instance with auth intercept
│   │   └── utils.ts            # Helpers (formatCurrency, toCents, etc.)
│   ├── types/                  # TypeScript interfaces
│   └── hooks/                  # React hooks (use-toast)
│
└── backend/                     # Express server
    ├── src/
    │   ├── config/
    │   │   └── database.ts      # MongoDB connection
    │   ├── models/              # Mongoose schemas
    │   │   ├── Organization.ts
    │   │   ├── Client.ts
    │   │   ├── Project.ts
    │   │   ├── ExpenseCategory.ts
    │   │   ├── Expense.ts
    │   │   ├── Invoice.ts
    │   │   ├── InvoicePayment.ts
    │   │   ├── BankAccount.ts
    │   │   ├── BankTransaction.ts
    │   │   ├── Payroll.ts
    │   │   ├── Budget.ts
    │   │   ├── AiInsight.ts
    │   │   └── index.ts
    │   ├── middleware/
    │   │   ├── auth.ts          # Supabase JWT verification
    │   │   ├── errorHandler.ts  # Error handling
    │   │   └── validate.ts      # Request validation
    │   ├── controllers/         # Business logic
    │   │   ├── organizationController.ts
    │   │   ├── clientController.ts
    │   │   ├── projectController.ts
    │   │   ├── categoryController.ts
    │   │   ├── expenseController.ts
    │   │   ├── invoiceController.ts
    │   │   ├── dashboardController.ts
    │   │   └── reportController.ts
    │   ├── routes/              # Express route handlers
    │   │   ├── organizations.ts
    │   │   ├── clients.ts
    │   │   ├── projects.ts
    │   │   ├── categories.ts
    │   │   ├── expenses.ts
    │   │   ├── invoices.ts
    │   │   ├── dashboard.ts
    │   │   └── reports.ts
    │   ├── utils/
    │   │   ├── money.ts         # Currency helpers
    │   │   └── response.ts      # API response formatting
    │   ├── scripts/
    │   │   └── seed.ts          # Seed script for local dev
    │   └── server.ts            # Express app entry point
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── dist/                    # Compiled output

```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm/yarn
- **MongoDB** (local or cloud, e.g., MongoDB Atlas)
- **Supabase** project (for auth)
- Git

### 1. Clone & Install Dependencies

```bash
cd "Finance Management System"

# Frontend
cd frontend
npm install

# Backend (in a separate terminal)
cd backend
npm install
```

### 2. Configure Environment Variables

**Backend** — Create `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finance_management
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Frontend** — Create `.env.local`:
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas:** Skip this step; update `MONGODB_URI` to your cloud connection string.

### 4. Seed the Database (Optional)

Populate the database with demo data (3 clients, 5 projects, 30 expenses, 10 invoices):

```bash
cd backend
npm run seed
```

### 5. Start the Development Servers

**Backend** (from `backend/` directory):
```bash
npm run dev
```

Expected output:
```
✅  MongoDB connected: localhost
🚀  Server running on http://localhost:5000
📡  API base: http://localhost:5000/api/v1
```

**Frontend** (from `frontend/` directory, in a new terminal):
```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
```

### 6. Open in Browser

Navigate to `http://localhost:3000` and sign up or log in with your Supabase credentials.

---

## 📊 Database Schema Overview

All money values are stored as **integers (cents)** to avoid floating-point rounding errors:
- `$19.99` is stored as `1999` (cents)
- Convert at API boundary using `toCents()` and `toDollars()` helpers

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Organization** | Owns all data, scoped by `userId` | `name`, `currency`, `fiscalYearStart` |
| **Client** | Customer/vendor | `name`, `email`, `phone`, `company` |
| **Project** | Work for a client | `name`, `clientId`, `budgetCents`, `status` |
| **ExpenseCategory** | Categorizes spending | `name`, `type` (fixed/variable/cogs/opex/revenue), `color` |
| **Expense** | Money out | `vendor`, `categoryId`, `amountCents`, `date`, `projectId` |
| **Invoice** | Money in (billed to client) | `invoiceNumber`, `clientId`, `amountCents`, `issueDate`, `status` |
| **InvoicePayment** | Payment received | `invoiceId`, `amountCents`, `paidDate`, `method` |
| **BankAccount** | (Phase 2+) Bank details | `bankName`, `accountNumberMasked`, `currency` |
| **BankTransaction** | (Phase 2+) Bank import | `description`, `amountCents`, `matchedExpenseId` |

All tables are indexed by `orgId` for multi-tenancy scoping.

---

## 🔑 Key API Endpoints

Base URL: `http://localhost:5000/api/v1`

All endpoints require `Authorization: Bearer <supabase_jwt_token>` header.

### Organizations
- `GET /organizations/me` — Get my org
- `POST /organizations` — Create org
- `PUT /organizations/me` — Update org

### Clients
- `GET /clients?page=1&limit=20&search=...` — List clients
- `GET /clients/:id` — Get client
- `POST /clients` — Create client
- `PUT /clients/:id` — Update client
- `DELETE /clients/:id` — Delete client

### Projects
- `GET /projects?status=active` — List projects
- `POST /projects` — Create project
- `PUT /projects/:id` — Update project
- `DELETE /projects/:id` — Delete project

### Expenses
- `GET /expenses?categoryId=...&from=2024-01-01&to=2024-01-31` — List expenses
- `POST /expenses` — Record expense
- `PUT /expenses/:id` — Update expense
- `DELETE /expenses/:id` — Delete expense

### Invoices
- `GET /invoices?status=sent` — List invoices
- `POST /invoices` — Create invoice
- `PUT /invoices/:id` — Update invoice
- `DELETE /invoices/:id` — Delete invoice
- `POST /invoices/:id/payments` — Record payment
- `GET /invoices/:id/payments` — Get payments for invoice

### Dashboard & Reports
- `GET /dashboard` — Current month metrics, top expenses, outstanding invoices
- `GET /reports/pl?from=2024-01-01&to=2024-01-31` — P&L report with monthly comparison

---

## 💾 Money Handling

**All amounts in the database are stored as integers representing cents.**

### Examples

Frontend form input (`$19.99`):
```typescript
import { toCents } from "@/lib/utils";
const amountCents = toCents(19.99); // 1999
```

API response display:
```typescript
import { formatCurrency } from "@/lib/utils";
const display = formatCurrency(1999); // "$19.99"
```

Backend helpers:
```typescript
import { toCents, toDollars, formatCurrency } from "../utils/money";

toCents(19.99);           // 1999
toDollars(1999);          // 19.99
formatCurrency(1999);     // "$19.99"
```

---

## 🧪 Testing Locally

### Manual Testing with Demo Data

1. After running `npm run seed`, you have:
   - 3 clients (Acme Corp, Global Tech, CloudFirst Systems)
   - 5 projects
   - 30 expenses
   - 10 invoices (5 paid, 5 sent)

2. Log in with your Supabase user
3. Navigate to Dashboard, Clients, Projects, Expenses, Invoices, Reports

### API Testing with cURL or Postman

```bash
# Get dashboard stats
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/v1/dashboard

# Get P&L report
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:5000/api/v1/reports/pl?from=2024-01-01&to=2024-01-31"
```

---

## 📝 How to Extend (Phase 2+)

### Adding Bank Import

1. Create `/backend/src/controllers/bankImportController.ts`
2. Parse CSV/PDF bank statements → populate `BankTransaction`
3. Implement fuzzy matching (amount + date + description) against expenses/invoices
4. Create matching UI in frontend

### Adding AI Features

1. Use Claude Sonnet (via API) for reasoning & summaries
2. Use Claude Haiku for bulk categorization (cheaper)
3. Call AI from backend; cache results in `AiInsight` model
4. Display insights on dashboard

### Adding Payroll

1. Create `/backend/src/controllers/payrollController.ts`
2. Add payroll CRUD endpoints
3. Create frontend page for employee records
4. Deduct payroll from cash flow in reports

---

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Ensure MongoDB is running: `mongod` (local) or check MongoDB Atlas connection string in `.env`
- Verify `MONGODB_URI` is correct

### "Unauthorized" API errors
- Check Supabase credentials in `.env` (both frontend and backend)
- Verify the JWT token is valid and not expired
- Confirm `Authorization: Bearer` header is included in requests

### "CORS errors"
- Verify `CORS_ORIGIN` in backend `.env` matches frontend URL (`http://localhost:3000`)

### "Expense not showing in reports"
- Ensure the expense date is within the report date range
- Check that the expense category type (fixed/variable/cogs/opex) is correct

---

## 📦 Build & Deploy

### Build Frontend
```bash
cd frontend
npm run build
# Output: .next/
```

### Build Backend
```bash
cd backend
npm run build
# Output: dist/
```

### Deploy Frontend (Vercel)
```bash
# Assumes Vercel CLI installed
vercel
```

Set env vars in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (production backend URL)

### Deploy Backend (Railway / Render)

1. Connect your GitHub repo
2. Set env vars:
   - `MONGODB_URI` (production MongoDB)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - `CORS_ORIGIN` (production frontend URL)
3. Deploy

---

## 📄 License

MIT

---

## 🤝 Contributing

Contributions welcome. Please fork, create a feature branch, and submit a PR.

---

## 📞 Support

For questions or issues, refer to:
- [Next.js Docs](https://nextjs.org/docs)
- [Express Docs](https://expressjs.com)
- [Mongoose Docs](https://mongoosejs.com)
- [Supabase Docs](https://supabase.com/docs)
- [Recharts Docs](https://recharts.org)

---

**Happy budgeting! 💰**
