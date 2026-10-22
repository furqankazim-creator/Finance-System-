import mongoose, { Document, Schema } from "mongoose";

export interface IExpenseCategory extends Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  parentCategoryId?: mongoose.Types.ObjectId;
  type: "fixed" | "variable" | "cogs" | "opex" | "revenue";
  color?: string; // hex color for UI display
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    parentCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      default: null,
    },
    type: {
      type: String,
      enum: ["fixed", "variable", "cogs", "opex", "revenue"],
      required: [true, "Category type is required"],
    },
    color: {
      type: String,
      trim: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code"],
      default: "#6366f1",
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

ExpenseCategorySchema.index({ orgId: 1, name: 1 }, { unique: true });
ExpenseCategorySchema.index({ orgId: 1, type: 1 });

export default mongoose.model<IExpenseCategory>(
  "ExpenseCategory",
  ExpenseCategorySchema
);
