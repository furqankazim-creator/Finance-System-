import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryDeleteImpact,
} from "../controllers/categoryController";
import { validate } from "../middleware/validate";
import {
  categoryCreateValidation,
  categoryUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getCategories);
router.get("/:id/dependencies", validateObjectIdParam(), validate, getCategoryDeleteImpact);
router.get("/:id", validateObjectIdParam(), validate, getCategory);
router.post("/", categoryCreateValidation, validate, createCategory);
router.put("/:id", validateObjectIdParam(), categoryUpdateValidation, validate, updateCategory);
router.delete("/:id", validateObjectIdParam(), validate, deleteCategory);

export default router;
