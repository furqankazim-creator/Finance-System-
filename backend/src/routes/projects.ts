import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectDeleteImpact,
} from "../controllers/projectController";
import { validate } from "../middleware/validate";
import {
  projectCreateValidation,
  projectUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);
router.get("/:id/dependencies", validateObjectIdParam(), validate, getProjectDeleteImpact);
router.get("/:id", validateObjectIdParam(), validate, getProject);
router.post("/", projectCreateValidation, validate, createProject);
router.put("/:id", validateObjectIdParam(), projectUpdateValidation, validate, updateProject);
router.delete("/:id", validateObjectIdParam(), validate, deleteProject);

export default router;
