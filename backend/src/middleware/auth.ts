import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";
import { UserRole } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        organizationId?: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No authentication token provided", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role?: UserRole;
        organizationId?: string;
      };

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || "admin",
        organizationId: decoded.organizationId,
      };
    } catch (error) {
      throw new AppError("Invalid or expired authentication token", 401);
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const requireRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }
    const currentRole = req.user.role || "admin";
    // Admins always have full permissions
    if (currentRole === "admin" || roles.includes(currentRole)) {
      return next();
    }
    return next(
      new AppError(
        `Access forbidden: requires one of roles [${roles.join(", ")}]`,
        403
      )
    );
  };
};
