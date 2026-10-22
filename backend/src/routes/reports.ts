import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getPLReport } from "../controllers/reportController";

const router = Router();

router.use(authenticate);

router.get("/pl", getPLReport);

export default router;
