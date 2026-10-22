import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  orgId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  parentTransactionId?: mongoose.Types.ObjectId | null;
  type: "equity" | "liability" | "asset" | "revenue" | "expense";
  transactionRef: string;
  amountCents: number;
  paidCents: number;
  date: Date;
  description?: string;
  investorName?: string;
  debtor?: string;
  assetType?: string;
  pictureUrl?: string;
  location?: string;
  status: "open" | "settled";
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
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
      required: [true, "Account is required"],
      index: true,
    },
    parentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    type: {
      type: String,
      enum: ["equity", "liability", "asset", "revenue", "expense"],
      required: [true, "Transaction type is required"],
    },
    transactionRef: {
      type: String,
      required: [true, "Transaction reference is required"],
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    amountCents: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    paidCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    investorName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    debtor: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    assetType: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    pictureUrl: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["open", "settled"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ orgId: 1, transactionRef: 1 }, { unique: true });
TransactionSchema.index({ orgId: 1, type: 1, date: -1 });
TransactionSchema.index({ orgId: 1, accountId: 1 });
TransactionSchema.index({ orgId: 1, type: 1, status: 1 });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
