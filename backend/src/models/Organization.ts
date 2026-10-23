import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  currency: string;
  fiscalYearStart: number; // month 1-12
  userId: string; // user ID who owns this org
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  invoicePrefix?: string;
  paymentTermsDays?: number;
  partnerEmails?: string[];
  weeklyDigestEnabled?: boolean;
  monthlyDigestEnabled?: boolean;
  notes?: string;
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
    taxId: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "Pakistan",
    },
    invoicePrefix: {
      type: String,
      trim: true,
      default: "INV-",
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
    },
    partnerEmails: {
      type: [String],
      default: [],
    },
    weeklyDigestEnabled: {
      type: Boolean,
      default: true,
    },
    monthlyDigestEnabled: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IOrganization>("Organization", OrganizationSchema);
