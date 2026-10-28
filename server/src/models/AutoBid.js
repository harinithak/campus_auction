import mongoose from "mongoose";

const autoBidSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    maxCents: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

autoBidSchema.index({ listingId: 1, userId: 1 }, { unique: true });
autoBidSchema.index({ listingId: 1, maxCents: -1, createdAt: 1 });

export const AutoBid = mongoose.model("AutoBid", autoBidSchema);
