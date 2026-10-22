// Must load env vars before anything else is imported — middleware/auth.ts and
// utils/auth.ts read process.env.JWT_SECRET at module-evaluation time, so if this
// runs after those imports they silently fall back to the default dev secret.
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import connectDB from "./config/database";
import { errorHandler } from "./middleware/errorHandler";

// Route imports
import orgRoutes from "./routes/organizations";
import clientRoutes from "./routes/clients";
import projectRoutes from "./routes/projects";
import categoryRoutes from "./routes/categories";
import expenseRoutes from "./routes/expenses";
import invoiceRoutes from "./routes/invoices";
import bankAccountRoutes from "./routes/bankAccounts";
import bankTransactionRoutes from "./routes/bankTransactions";
import paymentRoutes from "./routes/payments";
import statementRoutes from "./routes/statements";
import dashboardRoutes from "./routes/dashboard";
import authRoutes from "./routes/auth";
import reportRoutes from "./routes/reports";
import payrollRoutes from "./routes/payroll";
import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import payablesRoutes from "./routes/payables";
import costingRoutes from "./routes/costing";

const app = express();
const PORT = Number(process.env.PORT || 5000);

// ─── Connect to MongoDB ──────────────────────────────────────────────────────
connectDB();

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

// ─── Global Middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid Network Errors
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/organizations", orgRoutes);
apiRouter.use("/clients", clientRoutes);
apiRouter.use("/projects", projectRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/expenses", expenseRoutes);
apiRouter.use("/invoices", invoiceRoutes);
apiRouter.use("/bank-accounts", bankAccountRoutes);
apiRouter.use("/bank-transactions", bankTransactionRoutes);
apiRouter.use("/payments", paymentRoutes);
apiRouter.use("/statements", statementRoutes);
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/reports", reportRoutes);
apiRouter.use("/payroll", payrollRoutes);
apiRouter.use("/accounts", accountRoutes);
apiRouter.use("/transactions", transactionRoutes);
apiRouter.use("/payables-receivables", payablesRoutes);
apiRouter.use("/costing", costingRoutes);

app.use("/api/v1", apiRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: "Route not found" } });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  console.log(`📦  Environment: ${process.env.NODE_ENV}`);
  console.log(`📡  API base: http://localhost:${PORT}/api/v1`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `❌  Port ${PORT} is already in use. Stop the existing server or set PORT to a different value in backend/.env.`
    );
    process.exit(1);
  }

  console.error("❌  Server failed to start:", error);
  process.exit(1);
});

export default app;
