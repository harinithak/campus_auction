import mongoose from "mongoose";

export const LISTING_STATUSES = [
  "scheduled",
  "live",
  "cancelled",
  "unsold",
  "pending_seller",
  "approved",
  "rejected",
  "handover_complete",
  "pickup_failed",
];

const listingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    condition: {
      type: String,
      enum: ["new", "like_new", "good", "fair"],
      required: true,
    },
    imageUrl: { type: String, default: "" },
    pickupLocation: { type: String, required: true },
    startingPriceCents: { type: Number, required: true, min: 0 },
    reserveCents: { type: Number, default: 0, min: 0 },
    incrementCents: { type: Number, required: true, min: 1 },
    currentBidCents: { type: Number, default: 0, min: 0 },
    publicMaxCents: { type: Number, default: 0, min: 0 },
    leadingBidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bidCount: { type: Number, default: 0 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    originalEndsAt: { type: Date, required: true },
    extensionCount: { type: Number, default: 0 },
    status: { type: String, enum: LISTING_STATUSES, default: "scheduled", index: true },
    provisionalWinnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sellerDecisionAt: { type: Date, default: null },
    handoverNote: { type: String, default: "" },
    bidVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", description: "text", category: "text" });
listingSchema.index({ status: 1, endsAt: 1 });
listingSchema.index({ category: 1, status: 1, startingPriceCents: 1 });

export const Listing = mongoose.model("Listing", listingSchema);
