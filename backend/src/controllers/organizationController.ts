import { Request, Response, NextFunction } from "express";
import { Organization } from "../models";
import User, { UserRole } from "../models/User";
import { sendSuccess } from "../utils/response";
import { AppError } from "../middleware/errorHandler";
import { hashPassword } from "../utils/auth";

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

export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await Organization.findOne({ userId: req.user!.id });
    const orgId = org?._id;

    const query: any = {
      $or: [{ _id: req.user!.id }],
    };
    if (orgId) {
      query.$or.push({ organizationId: orgId });
    }

    const team = await User.find(query)
      .select("fullName email role createdAt")
      .sort({ createdAt: 1 });

    sendSuccess(res, team);
  } catch (err) {
    next(err);
  }
};

export const inviteTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
      throw new AppError("Full name, email, password, and role are required", 400);
    }
    let org = await Organization.findOne({ userId: req.user!.id });
    if (!org) {
      org = await Organization.create({
        name: "My Organization",
        currency: "PKR",
        fiscalYearStart: 1,
        userId: req.user!.id,
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError("A user with this email address already exists", 409);
    }

    const hashedPassword = await hashPassword(password);
    const newMember = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role as UserRole,
      organizationId: org._id,
    });

    sendSuccess(
      res,
      {
        id: newMember.id,
        fullName: newMember.fullName,
        email: newMember.email,
        role: newMember.role,
        createdAt: newMember.createdAt,
      },
      201,
      "Team member added successfully"
    );
  } catch (err) {
    next(err);
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!["admin", "accountant", "auditor", "viewer"].includes(role)) {
      throw new AppError("Invalid role", 400);
    }
    const member = await User.findById(userId);
    if (!member) throw new AppError("Team member not found", 404);

    member.role = role as UserRole;
    await member.save();

    sendSuccess(res, { id: member.id, role: member.role }, 200, "Member role updated");
  } catch (err) {
    next(err);
  }
};

export const removeTeamMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    if (userId === req.user!.id) {
      throw new AppError("You cannot remove your own primary admin account", 400);
    }
    await User.findByIdAndDelete(userId);
    sendSuccess(res, null, 200, "Team member removed");
  } catch (err) {
    next(err);
  }
};
