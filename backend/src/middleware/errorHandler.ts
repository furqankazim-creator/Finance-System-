import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors;

  const mongooseError = err as CustomError & {
    name?: string;
    code?: number;
    keyValue?: Record<string, unknown>;
  };

  if (mongooseError.name === "ValidationError") {
    statusCode = 400;
    errors = Object.values((mongooseError as any).errors || {}).map(
      (issue: any) => ({
        path: issue.path,
        message: issue.message,
      })
    );
    message = errors?.[0]?.message || "Validation failed";
  } else if (mongooseError.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (mongooseError.code === 11000) {
    statusCode = 409;
    const field = Object.keys(mongooseError.keyValue || {})[0];
    message = field
      ? `${field} already exists`
      : "A record with this value already exists";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        errors,
      }),
    },
  });
};

export class AppError extends Error {
  statusCode: number;
  errors?: any[];

  constructor(message: string, statusCode: number = 500, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
