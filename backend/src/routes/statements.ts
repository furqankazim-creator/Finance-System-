import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { validateObjectIdParam } from "../validation";
import {
  parseStatementFile,
  uploadStatementFile,
  getStatementFiles,
  downloadStatementFile,
  deleteStatementFile,
} from "../controllers/statementController";

const router = Router();

router.use(authenticate);

router.post("/parse", parseStatementFile);
router.get("/files", getStatementFiles);
router.post("/files", uploadStatementFile);
router.get("/files/:id", validateObjectIdParam(), validate, downloadStatementFile);
router.delete("/files/:id", validateObjectIdParam(), validate, deleteStatementFile);

export default router;

