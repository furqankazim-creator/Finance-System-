import mongoose, { Document, Schema } from "mongoose";

export interface IInvoice extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId | null;
  invoiceNumber: string;
  amountCents: number; // stored in cents
  issueDate: Date;
  dueDate: Date;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description?: string;
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
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
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    amountCents: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    issueDate: {
      type: Date,
      required: [true, "Issue date is required"],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    status: {
      type: String,
      enum: ["draft", "sent", "paid", "overdue", "cancelled"],
      default: "draft",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

InvoiceSchema.index({ orgId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ orgId: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ orgId: 1, clientId: 1, issueDate: -1 });

export default mongoose.model<IInvoice>("Invoice", InvoiceSchema);
