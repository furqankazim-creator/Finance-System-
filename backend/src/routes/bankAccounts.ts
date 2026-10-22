import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateObjectIdParam } from "../validation";
import {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from "../controllers/bankController";

const router = Router();

router.use(authenticate);

const accountBody = [
  body("bankName").trim().notEmpty().withMessage("Bank name is required").isLength({ max: 100 }),
  body("accountNumberMasked").trim().notEmpty().withMessage("Account number is required").isLength({ max: 50 }),
  body("accountType").optional().isIn(["checking", "savings", "credit"]).withMessage("Account type is invalid"),
  body("currency").optional().isLength({ min: 3, max: 3 }).withMessage("Currency must be a 3-letter code"),
];

router.get("/", getBankAccounts);
router.post("/", accountBody, validate, createBankAccount);
router.put("/:id", validateObjectIdParam(), validate, updateBankAccount);
router.delete("/:id", validateObjectIdParam(), validate, deleteBankAccount);

export default router;
