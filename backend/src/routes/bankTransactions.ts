import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateObjectIdParam } from "../validation";
import {
  getBankTransactions,
  createBankTransaction,
  importBankTransactions,
  updateBankTransaction,
  deleteBankTransaction,
  matchToInvoice,
  matchToExpense,
} from "../controllers/bankController";
import { exportBankTransactions } from "../controllers/statementController";

const router = Router();

router.use(authenticate);

router.get("/export", exportBankTransactions);
router.get("/", getBankTransactions);
router.post(
  "/",
  [
    body("bankAccountId").isMongoId().withMessage("Bank account is required"),
    body("date").isISO8601().withMessage("Date is required"),
    body("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 500 }),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
    body("direction").isIn(["inflow", "outflow"]).withMessage("Direction is invalid"),
  ],
  validate,
  createBankTransaction
);
router.post(
  "/import",
  [body("bankAccountId").isMongoId().withMessage("Bank account is required")],
  validate,
  importBankTransactions
);
router.put(
  "/:id",
  validateObjectIdParam(),
  [body("status").optional().isIn(["unmatched", "matched", "ignored"])],
  validate,
  updateBankTransaction
);
router.delete("/:id", validateObjectIdParam(), validate, deleteBankTransaction);
router.post(
  "/:id/match-invoice",
  validateObjectIdParam(),
  [body("invoiceId").isMongoId().withMessage("Invoice is required")],
  validate,
  matchToInvoice
);
router.post(
  "/:id/match-expense",
  validateObjectIdParam(),
  [body("categoryId").isMongoId().withMessage("Category is required")],
  validate,
  matchToExpense
);

export default router;

