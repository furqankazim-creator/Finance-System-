import mongoose, { Document, Schema } from "mongoose";

export interface IExpense extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId | null;
  vendor: string;
  description?: string;
  amountCents: number; // stored in cents to avoid float errors
  date: Date;
  source: "manual" | "bank" | "ocr";
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: [true, "Category is required"],
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    vendor: {
      type: String,
      required: [true, "Vendor is required"],
      trim: true,
      maxlength: [200, "Vendor name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    amountCents: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    source: {
      type: String,
      enum: ["manual", "bank", "ocr"],
      default: "manual",
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

ExpenseSchema.index({ orgId: 1, date: -1 });
ExpenseSchema.index({ orgId: 1, categoryId: 1, date: -1 });
ExpenseSchema.index({ orgId: 1, projectId: 1, date: -1 });

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
