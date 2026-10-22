import mongoose, { Document, Schema } from "mongoose";

export interface IBankAccount extends Document {
  orgId: mongoose.Types.ObjectId;
  bankName: string;
  accountNumberMasked: string; // e.g., "****1234"
  accountType: "checking" | "savings" | "credit";
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
      maxlength: 100,
    },
    accountNumberMasked: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      maxlength: 50,
    },
    accountType: {
      type: String,
      enum: ["checking", "savings", "credit"],
      default: "checking",
    },
    currency: {
      type: String,
      required: [true, "Currency is required"],
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "USD",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

BankAccountSchema.index({ orgId: 1, isActive: 1 });

export default mongoose.model<IBankAccount>("BankAccount", BankAccountSchema);
