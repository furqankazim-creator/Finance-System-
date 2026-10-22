import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  currency: string;
  fiscalYearStart: number; // month 1-12
  userId: string; // Supabase user ID who owns this org
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      default: "PKR",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    fiscalYearStart: {
      type: Number,
      required: [true, "Fiscal year start month is required"],
      min: 1,
      max: 12,
      default: 1, // January
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>("Organization", OrganizationSchema);
