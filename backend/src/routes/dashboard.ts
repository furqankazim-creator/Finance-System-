import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getDashboard, getIncomeExpenseBreakdown } from "../controllers/dashboardController";

const router = Router();

router.use(authenticate);

router.get("/", getDashboard);
router.get("/income-expense", getIncomeExpenseBreakdown);

export default router;
