import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  forgotPassword,
  getMe,
  resetPassword,
  signIn,
  signUp,
} from "../controllers/authController";
import { validate } from "../middleware/validate";
import {
  authSignInValidation,
  authSignUpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../validation";
import {
  authLoginLimiter,
  authSignupLimiter,
  passwordResetConfirmLimiter,
  passwordResetRequestLimiter,
} from "../middleware/rateLimit";

const router = Router();

router.post("/signup", authSignupLimiter, authSignUpValidation, validate, signUp);
router.post("/login", authLoginLimiter, authSignInValidation, validate, signIn);
router.post(
  "/forgot-password",
  passwordResetRequestLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword
);
router.post(
  "/reset-password/:token",
  passwordResetConfirmLimiter,
  resetPasswordValidation,
  validate,
  resetPassword
);
router.get("/me", authenticate, getMe);

export default router;
