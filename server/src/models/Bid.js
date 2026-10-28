import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amountCents: { type: Number, required: true },
    maxShownCents: { type: Number, required: true },
    kind: { type: String, enum: ["manual", "proxy"], required: true },
    serverTime: { type: Date, required: true },
  },
  { timestamps: true }
);

bidSchema.index({ listingId: 1, createdAt: -1 });

export const Bid = mongoose.model("Bid", bidSchema);
