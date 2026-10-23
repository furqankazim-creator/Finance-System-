import { Request, Response, NextFunction } from "express";
import { Organization } from "../models";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";

export const getMyOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let org = await Organization.findOne({ userId: req.user!.id });
    if (!org) {
      org = await Organization.create({
        name: "My Organization",
        currency: "PKR",
        fiscalYearStart: 1,
        userId: req.user!.id,
      });
    }
    sendSuccess(res, org);
  } catch (err) {
    next(err);
  }
};

export const createOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await Organization.findOne({ userId: req.user!.id });
    if (existing) return next(new AppError("Organization already exists for this user", 400));
    const org = await Organization.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, org, 201, "Organization created");
  } catch (err) {
    next(err);
  }
};

export const updateOrg = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowed = [
      "name",
      "currency",
      "fiscalYearStart",
      "taxId",
      "email",
      "phone",
      "address",
      "city",
      "country",
      "invoicePrefix",
      "paymentTermsDays",
      "partnerEmails",
      "weeklyDigestEnabled",
      "monthlyDigestEnabled",
      "notes",
    ];
    const updateData: Record<string, any> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }
    const org = await Organization.findOneAndUpdate(
      { userId: req.user!.id },
      { $set: updateData },
      { new: true, runValidators: true, upsert: true }
    );
    sendSuccess(res, org, 200, "Organization updated successfully");
  } catch (err) {
    next(err);
  }
};
