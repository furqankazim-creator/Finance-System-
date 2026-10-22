import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getExpenses, getExpense, createExpense, updateExpense, deleteExpense } from "../controllers/expenseController";
import { validate } from "../middleware/validate";
import {
  expenseCreateValidation,
  expenseUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getExpenses);
router.get("/:id", validateObjectIdParam(), validate, getExpense);
router.post("/", expenseCreateValidation, validate, createExpense);
router.put("/:id", validateObjectIdParam(), expenseUpdateValidation, validate, updateExpense);
router.delete("/:id", validateObjectIdParam(), validate, deleteExpense);

export default router;
