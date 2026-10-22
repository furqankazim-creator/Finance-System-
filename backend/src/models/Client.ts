import mongoose, { Document, Schema } from "mongoose";

export interface IClient extends Document {
  orgId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
      maxlength: [100, "Client name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
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

ClientSchema.index({ orgId: 1, name: 1 });
ClientSchema.index({ orgId: 1, isActive: 1 });

export default mongoose.model<IClient>("Client", ClientSchema);
