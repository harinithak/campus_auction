import { Router } from "express";
import { Listing } from "../models/Listing.js";
import { Bid } from "../models/Bid.js";
import { AutoBid } from "../models/AutoBid.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";
import { serializeListing } from "../serializers.js";
import { matchWantedAlerts } from "../services/alerts.js";
import { notifyMany } from "../services/notify.js";
import { emitListing } from "../realtime.js";

export const listingsRouter = Router();

const CATEGORIES = ["textbooks", "electronics", "furniture", "clothing", "bikes", "other"];

function parseListingBody(body, { partial = false } = {}) {
  const data = {};
  const fields = [
    "title",
    "description",
    "category",
    "condition",
    "imageUrl",
    "pickupLocation",
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = String(body[f] || "").trim();
  }
  if (body.startingPriceCents !== undefined) data.startingPriceCents = Number(body.startingPriceCents);
  if (body.reserveCents !== undefined) data.reserveCents = Number(body.reserveCents || 0);
  if (body.incrementCents !== undefined) data.incrementCents = Number(body.incrementCents);
  if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
  if (body.endsAt !== undefined) data.endsAt = new Date(body.endsAt);

  if (!partial) {
    for (const f of ["title", "description", "category", "condition", "pickupLocation"]) {
      if (!data[f]) throw httpError(400, `${f} is required`);
    }
    if (!CATEGORIES.includes(data.category)) throw httpError(400, "Invalid category");
    if (!Number.isInteger(data.startingPriceCents) || data.startingPriceCents < 0) {
      throw httpError(400, "startingPriceCents must be integer cents");
    }
    if (!Number.isInteger(data.incrementCents) || data.incrementCents < 1) {
      throw httpError(400, "incrementCents must be a positive integer");
    }
    if (Number.isNaN(data.startsAt.getTime()) || Number.isNaN(data.endsAt.getTime())) {
      throw httpError(400, "Valid startsAt and endsAt required");
    }
    if (data.endsAt <= data.startsAt) throw httpError(400, "endsAt must be after startsAt");
  }
  return data;
}

listingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { q, category, condition, status, minCents, maxCents, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (status) filter.status = status;
    else filter.status = { $in: ["live", "scheduled"] };
    if (minCents || maxCents) {
      filter.startingPriceCents = {};
      if (minCents) filter.startingPriceCents.$gte = Number(minCents);
      if (maxCents) filter.startingPriceCents.$lte = Number(maxCents);
    }
    if (q) {
      const escaped = String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: new RegExp(escaped, "i") },
        { description: new RegExp(escaped, "i") },
        { category: new RegExp(escaped, "i") },
      ];
    }
    let query = Listing.find(filter);
    if (sort === "ending") query = query.sort({ endsAt: 1 });
    else if (sort === "price") query = query.sort({ startingPriceCents: 1 });
    else query = query.sort({ createdAt: -1 });

    const rows = await query.populate("sellerId", "name campus").limit(60);
    res.json({ listings: rows.map((l) => serializeListing(l)), serverTime: new Date() });
  })
);

listingsRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Listing.find({ sellerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("sellerId", "name campus");
    res.json({ listings: rows.map((l) => serializeListing(l)) });
  })
);

listingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id).populate("sellerId", "name campus").populate(
      "leadingBidderId",
      "name"
    );
    if (!listing) throw httpError(404, "Listing not found");
    res.json({ listing: serializeListing(listing), serverTime: new Date() });
  })
);

listingsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = parseListingBody(req.body);
    const now = new Date();
    const status = data.startsAt <= now ? "live" : "scheduled";
    const listing = await Listing.create({
      ...data,
      sellerId: req.user._id,
      originalEndsAt: data.endsAt,
      status,
    });
    await matchWantedAlerts(listing);
    const populated = await listing.populate("sellerId", "name campus");
    res.status(201).json({ listing: serializeListing(populated) });
  })
);

listingsRouter.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Not your listing");
    if (listing.bidCount > 0) throw httpError(409, "Cannot edit a listing after bids exist");
    if (!["scheduled", "live"].includes(listing.status)) {
      throw httpError(409, "This listing can no longer be edited");
    }
    const data = parseListingBody(req.body, { partial: true });
    if (data.endsAt) data.originalEndsAt = data.endsAt;
    Object.assign(listing, data);
    if (listing.startsAt <= new Date() && listing.status === "scheduled") listing.status = "live";
    await listing.save();
    await listing.populate("sellerId", "name campus");
    res.json({ listing: serializeListing(listing) });
  })
);

listingsRouter.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Not your listing");
    if (!["scheduled", "live"].includes(listing.status)) {
      throw httpError(409, "This auction can no longer be cancelled");
    }
    listing.status = "cancelled";
    await listing.save();
    const bidderIds = await Bid.distinct("userId", { listingId: listing._id });
    await AutoBid.deleteMany({ listingId: listing._id });
    await notifyMany(bidderIds.map(String), {
      kind: "cancel",
      listingId: listing._id,
      title: "Auction cancelled",
      body: `The seller cancelled “${listing.title}”. No sale will complete.`,
    });
    emitListing(String(listing._id), "auction:cancelled", { id: String(listing._id) });
    res.json({ listing: serializeListing(listing) });
  })
);
