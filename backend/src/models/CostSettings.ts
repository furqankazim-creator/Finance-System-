import mongoose, { Document, Schema } from "mongoose";

export interface ICostSettings extends Document {
  orgId: mongoose.Types.ObjectId;
  monthlyOverheadCents: number;
  monthlyCapacityHours: number;
  defaultProfitMarginPct: number;
  createdAt: Date;
  updatedAt: Date;
}

const CostSettingsSchema = new Schema<ICostSettings>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      unique: true,
      index: true,
    },
    monthlyOverheadCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyCapacityHours: {
      type: Number,
      default: 160,
      min: 1,
    },
    defaultProfitMarginPct: {
      type: Number,
      default: 30,
      min: 0,
      max: 500,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICostSettings>("CostSettings", CostSettingsSchema);
