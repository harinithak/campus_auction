import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    keywords: { type: String, required: true, trim: true },
    category: { type: String, default: "" },
    maxPriceCents: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Alert = mongoose.model("Alert", alertSchema);
