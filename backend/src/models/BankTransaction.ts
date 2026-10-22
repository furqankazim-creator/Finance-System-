import mongoose, { Document, Schema } from "mongoose";

export interface IBankTransaction extends Document {
  orgId: mongoose.Types.ObjectId;
  bankAccountId: mongoose.Types.ObjectId;
  date: Date;
  description: string;
  amountCents: number; // stored in cents
  direction: "inflow" | "outflow";
  rawText?: string;
  matchedExpenseId?: mongoose.Types.ObjectId;
  matchedInvoicePaymentId?: mongoose.Types.ObjectId;
  aiCategory?: string;
  aiConfidence?: number;
  status: "unmatched" | "matched" | "ignored";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankTransactionSchema = new Schema<IBankTransaction>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: "BankAccount",
      required: [true, "Bank account is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Transaction date is required"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Transaction description is required"],
      trim: true,
      maxlength: 500,
    },
    amountCents: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    direction: {
      type: String,
      enum: ["inflow", "outflow"],
      required: [true, "Direction is required"],
    },
    rawText: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    matchedExpenseId: {
      type: Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
    },
    matchedInvoicePaymentId: {
      type: Schema.Types.ObjectId,
      ref: "InvoicePayment",
      default: null,
    },
    aiCategory: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    aiConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    status: {
      type: String,
      enum: ["unmatched", "matched", "ignored"],
      default: "unmatched",
      index: true,
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

BankTransactionSchema.index({ orgId: 1, status: 1, date: -1 });
BankTransactionSchema.index({ orgId: 1, bankAccountId: 1, date: -1 });

export default mongoose.model<IBankTransaction>(
  "BankTransaction",
  BankTransactionSchema
);
