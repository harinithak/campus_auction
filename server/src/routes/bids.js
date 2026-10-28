import { Router } from "express";
import { Bid } from "../models/Bid.js";
import { AutoBid } from "../models/AutoBid.js";
import { Listing } from "../models/Listing.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";
import { placeBid } from "../services/bidEngine.js";
import { serializeBid, serializeListing } from "../serializers.js";

export const bidsRouter = Router();

bidsRouter.get(
  "/:listingId",
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) throw httpError(404, "Listing not found");
    const bids = await Bid.find({ listingId: listing._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "name");
    const autos = await AutoBid.find({ listingId: listing._id }).select("userId maxCents createdAt");
    res.json({
      bids: bids.map(serializeBid),
      publicMaxes: autos.map((a) => ({
        userId: String(a.userId),
        maxCents: a.maxCents,
        since: a.createdAt,
      })),
      serverTime: new Date(),
    });
  })
);

bidsRouter.post(
  "/:listingId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const amountCents = Number(req.body?.amountCents);
    const proxy = Boolean(req.body?.proxy);
    const result = await placeBid({
      userId: req.user._id,
      listingId: req.params.listingId,
      amountCents,
      proxy,
    });
    res.status(201).json({
      listing: serializeListing(result.listing),
      bid: serializeBid(result.bid),
      serverTime: result.serverTime,
    });
  })
);
