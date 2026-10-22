import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  payTransaction,
} from "../controllers/transactionController";

const router = Router();

router.use(authenticate);

router.get("/", getTransactions);
router.get("/:id", getTransaction);
router.post("/", createTransaction);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);
router.post("/:id/pay", payTransaction);

export default router;
