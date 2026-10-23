import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getPLReport,
  getExecutiveReport,
  sendExecutiveReportEmail,
  downloadExecutiveReportPdf,
  triggerScheduledDigest,
} from "../controllers/reportController";

const router = Router();

router.use(authenticate);

router.get("/pl", getPLReport);
router.get("/executive", getExecutiveReport);
router.get("/executive/pdf", downloadExecutiveReportPdf);
router.post("/send-summary", sendExecutiveReportEmail);
router.post("/dispatch-scheduled", triggerScheduledDigest);

export default router;
