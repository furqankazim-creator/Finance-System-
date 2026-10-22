import { Request, Response, NextFunction } from "express";
import { Organization } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

export const getMyOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Organization.findOne({ userId: req.user!.id });
    if (!org) return next(new AppError("Organization not found", 404));
    sendSuccess(res, org);
  } catch (err) { next(err); }
};

export const createOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Organization.findOne({ userId: req.user!.id });
    if (existing) return next(new AppError("Organization already exists for this user", 400));
    const org = await Organization.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, org, 201, "Organization created");
  } catch (err) { next(err); }
};

export const updateOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Organization.findOneAndUpdate(
      { userId: req.user!.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!org) return next(new AppError("Organization not found", 404));
    sendSuccess(res, org, 200, "Organization updated");
  } catch (err) { next(err); }
};
