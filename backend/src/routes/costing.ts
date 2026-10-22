import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getSettings,
  updateSettings,
  getRate,
  getEstimates,
  createEstimate,
  updateEstimate,
  deleteEstimate,
} from "../controllers/costingController";

const router = Router();

router.use(authenticate);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/rate", getRate);
router.get("/estimates", getEstimates);
router.post("/estimates", createEstimate);
router.put("/estimates/:id", updateEstimate);
router.delete("/estimates/:id", deleteEstimate);

export default router;
