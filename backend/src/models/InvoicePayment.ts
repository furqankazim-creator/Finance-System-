import mongoose, { Document, Schema } from "mongoose";

export interface IInvoicePayment extends Document {
  orgId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  amountCents: number; // stored in cents
  paidDate: Date;
  method: "bank_transfer" | "credit_card" | "cash" | "cheque" | "other";
  reference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: [true, "Invoice ID is required"],
      index: true,
    },
    amountCents: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    paidDate: {
      type: Date,
      required: [true, "Payment date is required"],
    },
    method: {
      type: String,
      enum: ["bank_transfer", "credit_card", "cash", "cheque", "other"],
      required: [true, "Payment method is required"],
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 200,
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

InvoicePaymentSchema.index({ orgId: 1, paidDate: -1 });

export default mongoose.model<IInvoicePayment>(
  "InvoicePayment",
  InvoicePaymentSchema
);
