import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateObjectIdParam } from "../validation";
import { getAllPayments, deletePayment } from "../controllers/bankController";

const router = Router();

router.use(authenticate);

// Recording a payment reuses POST /invoices/:id/payments
router.get("/", getAllPayments);
router.delete("/:id", validateObjectIdParam(), validate, deletePayment);

export default router;

