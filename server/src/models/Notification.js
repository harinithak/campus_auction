import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", default: null },
    kind: {
      type: String,
      enum: [
        "bid",
        "outbid",
        "extended",
        "closing",
        "decision",
        "handover",
        "alert",
        "question",
        "cancel",
        "ai",
      ],
      required: true,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
