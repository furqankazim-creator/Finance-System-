import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  getPayments,
  downloadInvoicePdf,
} from "../controllers/invoiceController";
import { validate } from "../middleware/validate";
import {
  invoiceCreateValidation,
  invoicePaymentValidation,
  invoiceUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getInvoices);
router.get("/:id", validateObjectIdParam(), validate, getInvoice);
router.get("/:id/pdf", validateObjectIdParam(), validate, downloadInvoicePdf);
router.post("/", invoiceCreateValidation, validate, createInvoice);
router.put("/:id", validateObjectIdParam(), invoiceUpdateValidation, validate, updateInvoice);
router.delete("/:id", validateObjectIdParam(), validate, deleteInvoice);

router.post(
  "/:id/payments",
  validateObjectIdParam(),
  invoicePaymentValidation,
  validate,
  addPayment
);
router.get("/:id/payments", validateObjectIdParam(), validate, getPayments);

export default router;
