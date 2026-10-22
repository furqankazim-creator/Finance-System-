import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getAccounts, getAccount, createAccount, updateAccount, deleteAccount, getSummary } from "../controllers/accountController";

const router = Router();

router.use(authenticate);

router.get("/", getAccounts);
router.get("/summary", getSummary);
router.get("/:id", getAccount);
router.post("/", createAccount);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

export default router;
