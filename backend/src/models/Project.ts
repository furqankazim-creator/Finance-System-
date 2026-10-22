import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  orgId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  budgetCents: number; // stored in cents
  status: "active" | "on-hold" | "completed" | "cancelled";
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [200, "Project name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    budgetCents: {
      type: Number,
      required: [true, "Budget is required"],
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "on-hold", "completed", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ orgId: 1, status: 1 });
ProjectSchema.index({ orgId: 1, clientId: 1 });
ProjectSchema.index({ orgId: 1, name: 1 });

export default mongoose.model<IProject>("Project", ProjectSchema);
