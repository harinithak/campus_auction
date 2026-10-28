import { Router } from "express";
import { Listing } from "../models/Listing.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";
import { serializeListing } from "../serializers.js";
import { notify } from "../services/notify.js";
import { emitListing } from "../realtime.js";

export const lifecycleRouter = Router();

lifecycleRouter.post(
  "/:id/decision",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Not your listing");
    if (listing.status !== "pending_seller") throw httpError(409, "No provisional winner to decide");
    const approve = req.body?.decision === "approve";
    listing.status = approve ? "approved" : "rejected";
    listing.sellerDecisionAt = new Date();
    listing.handoverNote = String(req.body?.note || "").slice(0, 400);
    await listing.save();
    if (listing.provisionalWinnerId) {
      await notify(listing.provisionalWinnerId, {
        kind: "decision",
        listingId: listing._id,
        title: approve ? "Seller approved the sale" : "Seller rejected the sale",
        body: approve
          ? `Arrange pickup for “${listing.title}” at ${listing.pickupLocation}.`
          : `The seller rejected “${listing.title}”.`,
      });
    }
    emitListing(String(listing._id), "auction:update", { status: listing.status });
    res.json({ listing: serializeListing(listing) });
  })
);

lifecycleRouter.post(
  "/:id/handover",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Not your listing");
    if (listing.status !== "approved") throw httpError(409, "Sale is not in handover");
    const ok = req.body?.result === "complete";
    listing.status = ok ? "handover_complete" : "pickup_failed";
    listing.handoverNote = String(req.body?.note || listing.handoverNote).slice(0, 400);
    await listing.save();
    if (listing.provisionalWinnerId) {
      await notify(listing.provisionalWinnerId, {
        kind: "handover",
        listingId: listing._id,
        title: ok ? "Pickup complete" : "Pickup failed",
        body: ok
          ? `Handover for “${listing.title}” is marked complete.`
          : `Seller marked pickup failed for “${listing.title}”.`,
      });
    }
    emitListing(String(listing._id), "auction:update", { status: listing.status });
    res.json({ listing: serializeListing(listing) });
  })
);
