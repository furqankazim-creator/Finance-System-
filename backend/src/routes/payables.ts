import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getPayablesReceivables } from "../controllers/payablesController";

const router = Router();

router.use(authenticate);

router.get("/", getPayablesReceivables);

export default router;
