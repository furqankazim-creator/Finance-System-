# TGT Finance — Operational Workflow

_A practical, in-order guide to running your books through this system — from first login to monthly close. Pairs with `PRODUCT_ROADMAP.md` (gap analysis) — this document is the "how to actually use it" companion._

---

## 0. One-time setup

| Step | Where | What happens |
|---|---|---|
| 1 | `/signup` | Create your account. An Organization is auto-created for you (currency: PKR, fiscal year starts January) — no separate setup step needed. |
| 2 | `/chart-of-accounts` | A default Chart of Accounts is auto-seeded on first visit (20 standard accounts: Cash, Accounts Receivable, Accounts Payable, Owner's Capital, Service Revenue, Rent Expense, etc.). Add or edit accounts here if your business needs different ones. |
| 3 | `/categories` | Add expense categories (Software & SaaS, Marketing, Travel...) — these are separate from Chart of Accounts and used for day-to-day expense tagging and P&L COGS/OPEX grouping. |
| 4 | `/clients` | Add your clients before creating projects or invoices for them. |

---

## 1. Daily / weekly operations

### Recording money movements — two ways in, same place they land

**A. Quick day-to-day entries** — for the common case:
- New expense → `/expenses` → "+ New expense" (vendor, category, amount, optionally tag a project and a Chart-of-Accounts account)
- New invoice → `/invoices` → "+ New invoice" (client, amount, due date, optionally tag a project and a revenue account)
- Client paid you → `/invoices` → find the invoice → "Record payment"

**B. Formal bookkeeping** — for anything that should post directly to the Chart of Accounts (capital injections, loans, asset purchases, or expenses/revenue you want ledger-grade tracking on):
- `/bookkeeping` → pick the tile matching what happened (Capital / Liabilities / Assets / Revenue / Expenses) → "+ Add"
- Every entry gets a reference number (`TXN-0001`, `TXN-0002`...) and posts against a real account

**Both paths feed the same Dashboard and P&L** — logging an expense on `/expenses` or logging one on `/bookkeeping` both count toward your totals. Use A for routine day-to-day spend, B when you want it tied to a specific ledger account (loans, capital, fixed assets).

### Payroll
- `/payroll` → "+ New payroll entry" per employee, per month (gross, deductions → net computed automatically)
- Feeds: Costing's per-hour rate, and Payables & Receivables (pending payroll shows as money you owe)

---

## 2. Weekly / as-needed checks

- **`/payables-receivables`** — see what clients owe you (unpaid invoices) and what you owe (open loans + pending payroll) in one place. Check this before committing to new spend.
- **`/projects`** — each project card shows Budget vs. Spent vs. Billed, computed live from tagged expenses/invoices. Watch for projects running over budget.

---

## 3. Monthly — pricing and cost review

1. **`/costing`** → check "Recorded in Bookkeeping this month" against your manually-entered overhead figure — click "Use this" if they've drifted apart.
2. Confirm monthly capacity hours is still accurate (changes if you hire/lose someone).
3. Look at "Monthly cost by project" and "Project allocation %" — see where the money actually went this month.
4. For any new proposal: enter estimated man-hours + margin in "Project estimate for proposal" — watch the live preview, save when ready. The rate used is locked into that estimate permanently, even if your rate changes later.

---

## 4. Monthly close — reporting

1. **`/dashboard`** — the first stop. Revenue, Expenses, Unpaid invoices, Net cash for the current month vs. last month. Income vs Expense chart (12 months) and Top 5 Income/Expense breakdown.
2. **`/reports`** (P&L) — pick a month (and optionally a single project) → Revenue, COGS, OpEx, Net Profit, with a full category breakdown. This now uses the *exact same* revenue/expense calculation as the Dashboard (they were verified to disagree before a fix earlier this session — confirmed consistent now).
3. **Chart of Accounts snapshot** (on Dashboard) — Total Assets / Liabilities / Capital, reflecting what's been recorded in Bookkeeping specifically.

---

## 5. How the data actually connects (verified, not assumed)

```
Bookkeeping (Transaction) ──┬──► Chart of Accounts (every entry posts to a real account)
                             ├──► Dashboard: Income vs Expense chart, Top 5 Income/Expense
                             ├──► Dashboard: Chart of Accounts snapshot
                             ├──► Costing: "recorded overhead" reference
                             └──► Reports (P&L): revenue + OPEX totals

Invoices (paid) ─────────────┬──► Dashboard revenue, Income chart, Top Income donut (if tagged to an account)
                              ├──► Payables & Receivables (unpaid = receivable)
                              └──► Projects: "billed" figure

Expenses ─────────────────────┬──► Dashboard expenses, Expense chart, Top Expense donut
                              ├──► Projects: "spent" figure (if tagged to a project)
                              └──► Costing: "cost by project" chart (this month)

Payroll ──────────────────────┬──► Payables & Receivables (pending = payable)
                              └──► Costing: monthly payroll cost → per-hour rate

Costing rate ─────────────────► Project Estimates (bid pricing)
```

**Known limits, stated plainly:**
- Tagging an expense/invoice to a Chart-of-Accounts account is *optional* — untagged entries show up as "Uncategorized" in the income/expense breakdowns rather than being dropped.
- The Chart of Accounts snapshot only reflects what's been recorded via `/bookkeeping` specifically — it is not a full balance sheet.
- Marking payroll "paid" does not automatically create a Bookkeeping expense entry — log it separately on `/bookkeeping` if you want it to count toward the Income vs Expense chart.
- Bookkeeping entries aren't project-scoped, so the per-project figures (Projects page, Costing's project breakdown, P&L's project filter) only ever reflect Expenses/Invoices, never Bookkeeping entries.

---

## 6. Is this "done" for a software company?

**What's now solid** (verified this session, not just built): password reset, rate limiting on every auth endpoint, real input validation on writes, delete-confirmation with dependency checks before removing a client/project/category, and the full Bookkeeping ↔ Chart of Accounts ↔ Costing ↔ Dashboard ↔ Payables loop — all cross-checked against real data, including one cross-page inconsistency (P&L vs. Dashboard) that was found and fixed today.

**Still genuinely missing** — see `PRODUCT_ROADMAP.md` for the full list, but the two that matter most for "a software company" specifically:
- **No team members** — still one user per organization; nobody can invite a co-founder or bookkeeper into the same books
- **No organization settings page** — can't rename the org or change currency/fiscal year from the UI after signup

Everything else outstanding (recurring invoices, PDF/email delivery, CSV export, receipt attachments, automated tests, CI/CD) is real but lower-stakes than those two — the system is safe to run your own books in today; it isn't yet ready to hand to a team or resell as multi-tenant SaaS.
