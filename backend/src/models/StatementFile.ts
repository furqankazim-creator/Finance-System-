import mongoose, { Document, Schema } from "mongoose";

export interface IStatementFile extends Document {
  orgId: mongoose.Types.ObjectId;
  bankAccountId?: mongoose.Types.ObjectId | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storedName: string; // file name on disk
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StatementFileSchema = new Schema<IStatementFile>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: "BankAccount", default: null },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    storedName: { type: String, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

export default mongoose.model<IStatementFile>("StatementFile", StatementFileSchema);

