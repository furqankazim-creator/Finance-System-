import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { AppError } from "./errorHandler";

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const issues = errors.array();
    const firstIssue = issues[0];
    const message =
      typeof firstIssue?.msg === "string" ? firstIssue.msg : "Validation failed";
    throw new AppError(message, 400, issues);
  }
  next();
};
