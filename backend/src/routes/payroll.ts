import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getPayrolls, getPayroll, createPayroll, updatePayroll, deletePayroll } from "../controllers/payrollController";
import { validate } from "../middleware/validate";
import {
  payrollCreateValidation,
  payrollUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getPayrolls);
router.get("/:id", validateObjectIdParam(), validate, getPayroll);
router.post("/", payrollCreateValidation, validate, createPayroll);
router.put("/:id", validateObjectIdParam(), payrollUpdateValidation, validate, updatePayroll);
router.delete("/:id", validateObjectIdParam(), validate, deletePayroll);

export default router;
