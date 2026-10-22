import { Response } from "express";

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode = 200,
  message?: string,
  pagination?: PaginationMeta
) => {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data,
    ...(pagination && { pagination }),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown[]
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(errors && { errors }),
    },
  });
};

export const buildPagination = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
