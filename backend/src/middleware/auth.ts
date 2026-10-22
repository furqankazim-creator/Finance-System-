import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

// Extend Express Request to carry the decoded user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
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
      };

      req.user = {
        id: decoded.id,
        email: decoded.email,
      };
    } catch (error) {
      throw new AppError("Invalid or expired authentication token", 401);
    }

    next();
  } catch (err) {
    next(err);
  }
};
