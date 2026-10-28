import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    askerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: 500 },
    answer: { type: String, default: "" },
    hidden: { type: Boolean, default: false },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Question = mongoose.model("Question", questionSchema);
