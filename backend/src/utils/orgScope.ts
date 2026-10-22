import type { Model, Types } from "mongoose";
import { Organization } from "../models";
import { AppError } from "../middleware/errorHandler";

type OrgScopedDocument = {
  _id: Types.ObjectId;
  orgId: Types.ObjectId;
};

export const getOrgIdForUser = async (userId: string) => {
  const org = await Organization.findOne({ userId });
  if (!org) {
    throw new AppError(
      "Organization not found. Please set up your organization first.",
      404
    );
  }

  return org._id;
};

export const assertBelongsToOrg = async <T extends OrgScopedDocument>(
  model: Model<T>,
  recordId: unknown,
  orgId: unknown,
  label: string
) => {
  const record = await model.findOne({ _id: recordId, orgId });
  if (!record) {
    throw new AppError(`${label} not found`, 404);
  }

  return record;
};
