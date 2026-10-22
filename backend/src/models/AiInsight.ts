import mongoose, { Document, Schema } from "mongoose";

export interface IAiInsight extends Document {
  orgId: mongoose.Types.ObjectId;
  type: "summary" | "anomaly" | "forecast" | "alert";
  content: string;
  relatedPeriod?: string; // e.g. "2024-01"
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AiInsightSchema = new Schema<IAiInsight>(
  {
    orgId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["summary", "anomaly", "forecast", "alert"],
      required: [true, "Insight type is required"],
    },
    content: {
      type: String,
      required: [true, "Insight content is required"],
      trim: true,
    },
    relatedPeriod: {
      type: String,
      trim: true,
      maxlength: 10,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

AiInsightSchema.index({ orgId: 1, type: 1, createdAt: -1 });
AiInsightSchema.index({ orgId: 1, isRead: 1 });

export default mongoose.model<IAiInsight>("AiInsight", AiInsightSchema);
