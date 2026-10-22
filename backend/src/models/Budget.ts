import mongoose, { Document, Schema } from "mongoose";

export interface IBudget extends Document {
  orgId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  plannedAmountCents: number; // stored in cents
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: [true, "Category is required"],
      index: true,
    },
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: 2000,
      max: 2100,
    },
    plannedAmountCents: {
      type: Number,
      required: [true, "Planned amount is required"],
      min: 0,
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

BudgetSchema.index(
  { orgId: 1, categoryId: 1, year: 1, month: 1 },
  { unique: true }
);

export default mongoose.model<IBudget>("Budget", BudgetSchema);
