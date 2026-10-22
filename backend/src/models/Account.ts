import mongoose, { Document, Schema } from "mongoose";

export interface IAccount extends Document {
  orgId: mongoose.Types.ObjectId;
  accountNumber: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  parentAccountId?: mongoose.Types.ObjectId | null;
  normalBalance: "debit" | "credit";
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      maxlength: 20,
    },
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [150, "Account name cannot exceed 150 characters"],
    },
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
      required: [true, "Account type is required"],
    },
    parentAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    normalBalance: {
      type: String,
      enum: ["debit", "credit"],
      required: [true, "Normal balance is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AccountSchema.index({ orgId: 1, accountNumber: 1 }, { unique: true });
AccountSchema.index({ orgId: 1, type: 1 });

export default mongoose.model<IAccount>("Account", AccountSchema);
