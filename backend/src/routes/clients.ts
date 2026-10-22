import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientDeleteImpact,
} from "../controllers/clientController";
import { validate } from "../middleware/validate";
import {
  clientCreateValidation,
  clientUpdateValidation,
  validateObjectIdParam,
} from "../validation";

const router = Router();

router.use(authenticate);

router.get("/", getClients);
router.get("/:id/dependencies", validateObjectIdParam(), validate, getClientDeleteImpact);
router.get("/:id", validateObjectIdParam(), validate, getClient);
router.post("/", clientCreateValidation, validate, createClient);
router.put("/:id", validateObjectIdParam(), clientUpdateValidation, validate, updateClient);
router.delete("/:id", validateObjectIdParam(), validate, deleteClient);

export default router;
