import mongoose, { Document, Schema } from "mongoose";

export interface IProjectEstimate extends Document {
  orgId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId | null;
  clientId?: mongoose.Types.ObjectId | null;
  title: string;
  estimatedManHours: number;
  hourlyCostCentsUsed: number;
  baseCostCents: number;
  profitMarginPct: number;
  finalBidCostCents: number;
  notes?: string;
  status: "draft" | "sent" | "won" | "lost";
  createdAt: Date;
  updatedAt: Date;
}

const ProjectEstimateSchema = new Schema<IProjectEstimate>(
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
      default: null,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    estimatedManHours: {
      type: Number,
      required: [true, "Estimated man hours is required"],
      min: [0.1, "Man hours must be greater than 0"],
    },
    hourlyCostCentsUsed: {
      type: Number,
      required: true,
      min: 0,
    },
    baseCostCents: {
      type: Number,
      required: true,
      min: 0,
    },
    profitMarginPct: {
      type: Number,
      required: true,
      min: 0,
      max: 500,
    },
    finalBidCostCents: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "won", "lost"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

ProjectEstimateSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.model<IProjectEstimate>("ProjectEstimate", ProjectEstimateSchema);
