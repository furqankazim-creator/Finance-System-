import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getMyOrg, createOrg, updateOrg } from "../controllers/organizationController";
import { validate } from "../middleware/validate";
import {
  organizationCreateValidation,
  organizationUpdateValidation,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/me", getMyOrg);
router.post("/", organizationCreateValidation, validate, createOrg);
router.put("/me", organizationUpdateValidation, validate, updateOrg);

export default router;
