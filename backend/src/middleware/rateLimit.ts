import rateLimit from "express-rate-limit";

const buildLimiter = (
  windowMs: number,
  max: number,
  message: string
) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        message,
      },
    },
  });

export const authLoginLimiter = buildLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts. Please try again in 15 minutes."
);

export const authSignupLimiter = buildLimiter(
  60 * 60 * 1000,
  10,
  "Too many signup attempts. Please try again later."
);

export const passwordResetRequestLimiter = buildLimiter(
  60 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again later."
);

export const passwordResetConfirmLimiter = buildLimiter(
  60 * 60 * 1000,
  10,
  "Too many password reset attempts. Please request a new reset link."
);
