import { Router } from "express";
import { authenticate, requireRoles } from "../middleware/auth";
import {
  getMyOrg,
  createOrg,
  updateOrg,
  getTeam,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
} from "../controllers/organizationController";
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

// RBAC Team Management Routes
router.get("/team", getTeam);
router.post("/team/invite", requireRoles("admin"), inviteTeamMember);
router.patch("/team/:userId/role", requireRoles("admin"), updateMemberRole);
router.delete("/team/:userId", requireRoles("admin"), removeTeamMember);

export default router;
