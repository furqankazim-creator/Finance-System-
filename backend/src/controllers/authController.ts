import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import User from "../models/User";
import Organization from "../models/Organization";
import { AppError } from "../middleware/errorHandler";
import { comparePassword, hashPassword, signToken } from "../utils/auth";
import { seedDefaultChartOfAccounts } from "./accountController";
import { sendMail } from "../utils/mailer";

const getFrontendUrl = () =>
  process.env.FRONTEND_URL ||
  process.env.CORS_ORIGIN ||
  "http://localhost:5173";

const buildResetUrl = (token: string) =>
  `${getFrontendUrl().replace(/\/$/, "")}/reset-password/${token}`;

const passwordResetExpiryMs =
  Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60) * 60 * 1000;

export const signUp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError("Email is already registered", 409);
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Every user gets a personal organization to scope their data to
    const org = await Organization.create({
      name: `${fullName}'s Organization`,
      currency: "PKR",
      fiscalYearStart: 1,
      userId: user.id,
    });
    await seedDefaultChartOfAccounts(org._id);

    const token = signToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role || "admin",
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const signIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    const token = signToken(user);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role || "admin",
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    const responseData: Record<string, unknown> = {};

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + passwordResetExpiryMs);
      await user.save();

      const resetUrl = buildResetUrl(rawToken);
      const mailResult = await sendMail({
        to: user.email,
        subject: "Reset your TGT Finance password",
        text: `We received a request to reset your password. Use this link within 60 minutes: ${resetUrl}`,
        html: `
          <p>We received a request to reset your TGT Finance password.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>This link expires in 60 minutes.</p>
        `,
      });

      if (process.env.NODE_ENV !== "production") {
        responseData.resetUrl = resetUrl;
        if (mailResult.previewUrl) {
          responseData.previewUrl = mailResult.previewUrl;
        }
      }
    }

    res.status(200).json({
      success: true,
      message:
        "If an account exists for that email, a password reset link has been generated.",
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      throw new AppError("Password reset link is invalid or has expired", 400);
    }

    user.password = await hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now sign in.",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role || "admin",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError("Current password and new password are required", 400);
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw new AppError("New password must be at least 8 characters", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const matches = await comparePassword(currentPassword, user.password);
    if (!matches) {
      throw new AppError("Current password is incorrect", 400);
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
