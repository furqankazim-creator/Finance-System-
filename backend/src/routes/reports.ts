import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getPLReport,
  getExecutiveReport,
  sendExecutiveReportEmail,
} from "../controllers/reportController";

const router = Router();

router.use(authenticate);

router.get("/pl", getPLReport);
router.get("/executive", getExecutiveReport);
router.post("/send-summary", sendExecutiveReportEmail);

export default router;
