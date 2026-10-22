# TGT Finance — Product Assessment & Roadmap

_Last reviewed: 2026-07-30. This document reflects the actual state of the codebase as verified by reading the backend routes/controllers/models and the frontend pages — not the older `README.md` / `BUILD_COMPLETE.md` files, which describe an earlier planned stack (Next.js, Supabase) that no longer matches what's actually running (Vite + React, custom JWT auth)._

## Verdict

**Good enough to run a small company's day-to-day bookkeeping today. Not yet ready to sell as a multi-tenant SaaS product to other companies**, or to hand to an accountant/auditor as the system of record, without the gaps below closed — especially the security and data-integrity items in Section 2.

The core bookkeeping loop (log expenses, send invoices, get paid, see a P&L) is real, persisted, and works end to end. What's missing is everything around that loop: team access, money safety nets, and the operational scaffolding (tests, deploys, backups) a company depends on once real money and real people touch it.

---

## 1. What's actually built and working

| Area | Status |
|---|---|
| Auth | Signup/login/JWT, bcrypt password hashing, auto-creates one Organization per user |
| Clients | Full CRUD |
| Categories | Full CRUD, typed (fixed/variable/cogs/opex/revenue) |
| Projects | Full CRUD, budget vs. spent vs. billed tracking |
| Expenses | Full CRUD, categorized, optionally linked to a project |
| Invoices | Full CRUD, status lifecycle (draft → sent → paid/overdue), payment recording |
| Payroll | Full CRUD, gross/deductions/net in cents, monthly |
| Dashboard | Real MongoDB aggregations: current vs. previous month, 6-month revenue/expense chart, top expense categories, outstanding invoices, quick-add modal |
| P&L Report | Real aggregation by month/project, COGS vs. OPEX breakdown |
| Money handling | All amounts stored as integer cents — no float rounding bugs |
| Data isolation | Every query scoped by `orgId` — one user cannot see another's data |

This is a legitimate full-stack app: MongoDB persistence, no mock data left in any page, all six core entities wired end-to-end and verified in a real browser session.

---

## 2. Critical gaps — fix before trusting this with real company money

These aren't "nice to haves." Any one of them can lose data or leak it.

| # | Gap | Why it matters |
|---|---|---|
| 1 | **No password reset flow** | A locked-out user has no recovery path except you editing MongoDB by hand. |
| 2 | **No rate limiting on `/auth/login`** | Nothing stops a brute-force password-guessing script. |
| 3 | **JWT has no revocation / refresh rotation** | Token is valid for 7 days flat; a stolen token can't be invalidated short of rotating the whole secret (which logs out every user, as we just saw firsthand). |
| 4 | **Single user per organization** | The `Organization` schema has one `userId`. There is no way to invite a co-founder, bookkeeper, or accountant into the same books — everyone needs their own separate, disconnected org. |
| 5 | **No audit log** | No record of who changed or deleted what. If an invoice amount is edited, the old value is gone. |
| 6 | **No input validation on most write endpoints** | `express-validator` is installed but not actually wired into any route — Mongoose schema validation is the only safety net, so malformed requests fail with raw Mongoose errors instead of clean 400s. |
| 7 | **Deletes don't check for dependents** | Deleting a Client or Project doesn't warn about or block deletion when Invoices/Expenses/Projects still reference it — it silently orphans those records. |
| 8 | **No backup strategy** | Nothing documented or automated for MongoDB backups/point-in-time recovery. |

---

## 3. Features that exist as data models but have no working feature behind them

These were scaffolded (probably in an earlier planning pass) and then never finished. Worth knowing they're dead weight, not silently-working features:

| Model / Route | State |
|---|---|
| `models/BankAccount.ts`, `models/BankTransaction.ts` | Model exists; `routes/bankAccounts.ts` is a literal stub returning `[]` with a "coming in Phase 2" message. No controller file exists at all. No frontend page. |
| `models/Budget.ts` | Model exists. No controller, no route, no frontend — completely unreachable. |
| `models/AiInsight.ts` | Model exists. No controller, no route, no frontend — completely unreachable. |
| `papaparse`, `xlsx`, `pdf-parse` npm packages | Installed in `backend/package.json`, never imported anywhere in the codebase. Presumably intended for bank statement / receipt import. |
| `Expense.receiptUrl`, `Invoice.pdfUrl` schema fields | Exist on the model; nothing ever writes to them — no file upload endpoint, no cloud storage integration (no S3/Cloudinary/etc. dependency installed), no PDF generation. |

---

## 4. Missing features, by priority

### P0 — needed before any non-technical teammate touches this
- **Password reset** ("forgot password" email flow)
- **Organization/account settings page** — right now there is no UI to rename the org, change currency, change fiscal-year start, or update your own profile/password after signup
- **Team members with roles** (owner / accountant / viewer) — single-user-per-org is the biggest structural limitation for "a software company" specifically, since finance is rarely a one-person job
- **Confirm-before-delete with dependency warnings** (e.g. "This client has 3 invoices — delete anyway?")
- **Rate limiting** on auth endpoints (`express-rate-limit` is a 10-minute install)

### P1 — needed to look and behave like a real product
- **Recurring expenses/invoices** — SaaS subscriptions and rent repeat monthly; right now every single one has to be re-entered by hand every month
- **PDF invoice generation + email delivery** — right now an "invoice" is a database row with no artifact you can actually send a client
- **CSV/Excel export** — for handing data to an accountant or filing taxes (`papaparse`/`xlsx` are already installed, just unused)
- **File attachments for receipts** — needs a small file-upload endpoint + object storage (S3-compatible or Cloudinary free tier)
- **Multi-currency support** — `Organization.currency` exists but every amount is hardcoded to USD formatting in the frontend
- **Due-date reminders** — email or in-app nudge when an invoice is about to go overdue
- **Real bank account / reconciliation feature** — either build it out or remove the dead stub and models so the codebase doesn't lie about what exists

### P2 — differentiators once the basics are solid
- **AI insights** (the `AiInsight` model hints this was planned): spend anomaly detection, cash-flow forecasting, auto-categorization of expenses from vendor name
- **Bank feed integration** (Plaid or similar) for auto-imported transactions
- **Tax fields** (VAT/sales tax) on invoices and expenses, plus a tax report
- **Mobile-responsive layout** — the sidebar is currently a fixed-width desktop shell with no collapse/hamburger behavior on small screens
- **Notification center** in-app, not just email

---

## 5. Operational / engineering gaps (not user-facing, but real)

| Gap | Detail |
|---|---|
| **Zero automated tests** | No unit, integration, or e2e tests anywhere in the repo. Every verification so far has been manual (including the ones I ran this session). One bad refactor away from silent breakage. |
| **No CI/CD** | No GitHub Actions or equivalent — nothing runs tests or typechecks on push. |
| **No Docker / deployment config** | No `Dockerfile`, no `docker-compose.yml` for this project (there's an unrelated one in a sibling "Ai Marketplace" folder). Deploying this today means manually reproducing the dev setup on a server. |
| **No error tracking / logging service** | Errors only go to `console.error` and stdout — nothing like Sentry, and no log aggregation. |
| **Stale/contradictory root docs** | `README.md`, `BUILD_COMPLETE.md`, `IMPLEMENTATION_SUMMARY.md`, `FINAL_CHECKLIST.md` all describe an earlier, different plan (Next.js frontend, Supabase auth) that isn't what's actually running. Worth consolidating into one accurate doc so a new engineer isn't misled. |
| **Dead frontend artifacts** | `frontend/next.config.js` and `frontend/next-env.d.ts` are leftovers from an abandoned Next.js attempt — the app is actually Vite. Harmless but confusing. |

---

## 6. Suggested order of work

1. **Harden what exists** (Section 2) — password reset, rate limiting, delete-confirmation with dependency checks, basic input validation on write routes.
2. **Make it a team product** — org settings page, invite teammates with roles. This is the single biggest gap for "a software company" specifically.
3. **Close the loop on invoices** — PDF generation + email delivery + due-date reminders. Right now you can create an invoice but not actually send one.
4. **Recurring transactions** — biggest time-saver for ongoing SaaS-style expenses.
5. **Export & attachments** — CSV export, receipt uploads.
6. **Clean house** — remove or finish the dead `BankAccount`/`Budget`/`AiInsight` stubs, update the root docs to match reality, add a test suite and a CI workflow.
7. **P2 differentiators** once the above is solid — AI insights, bank feeds, tax handling.

None of this needs a rewrite — the CRUD foundation, the org-scoped data model, and the cents-based money handling are all solid and worth building on directly.
