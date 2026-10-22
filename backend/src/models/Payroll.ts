import mongoose, { Document, Schema } from "mongoose";

export interface IPayroll extends Document {
  orgId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId | null;
  employeeName: string;
  employeeEmail?: string;
  role?: string;
  month: number; // 1-12
  year: number;
  grossCents: number; // stored in cents
  deductionsCents: number; // stored in cents
  netCents: number; // stored in cents
  paidDate?: Date;
  status: "pending" | "paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
      maxlength: 100,
    },
    employeeEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    role: {
      type: String,
      trim: true,
      maxlength: 100,
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
    grossCents: {
      type: Number,
      required: [true, "Gross amount is required"],
      min: 0,
    },
    deductionsCents: {
      type: Number,
      required: [true, "Deductions amount is required"],
      min: 0,
      default: 0,
    },
    netCents: {
      type: Number,
      required: [true, "Net amount is required"],
      min: 0,
    },
    paidDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
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

PayrollSchema.index({ orgId: 1, year: -1, month: -1 });

export default mongoose.model<IPayroll>("Payroll", PayrollSchema);
