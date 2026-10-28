import { Bid } from "../models/Bid.js";
import { Listing } from "../models/Listing.js";
import { emitListing } from "../realtime.js";
import { notify, notifyMany } from "./notify.js";

export async function activateScheduled() {
  const now = new Date();
  const due = await Listing.find({ status: "scheduled", startsAt: { $lte: now } });
  for (const listing of due) {
    listing.status = "live";
    await listing.save();
    emitListing(String(listing._id), "auction:update", {
      id: String(listing._id),
      status: "live",
    });
  }
}

export async function closeExpired() {
  const now = new Date();
  const expired = await Listing.find({ status: "live", endsAt: { $lte: now } });
  for (const listing of expired) {
    const metReserve =
      listing.leadingBidderId &&
      listing.currentBidCents >= Math.max(listing.reserveCents, listing.startingPriceCents ? 0 : 0) &&
      (listing.reserveCents === 0 || listing.currentBidCents >= listing.reserveCents);

    if (metReserve) {
      listing.status = "pending_seller";
      listing.provisionalWinnerId = listing.leadingBidderId;
    } else {
      listing.status = "unsold";
      listing.provisionalWinnerId = null;
    }
    await listing.save();

    emitListing(String(listing._id), "auction:closed", {
      id: String(listing._id),
      status: listing.status,
      provisionalWinnerId: listing.provisionalWinnerId,
      currentBidCents: listing.currentBidCents,
    });

    const bidders = await Bid.distinct("userId", { listingId: listing._id });
    if (listing.status === "pending_seller") {
      await notify(listing.sellerId, {
        kind: "closing",
        listingId: listing._id,
        title: "Approve this sale",
        body: `"${listing.title}" ended with a provisional winner. Approve or reject.`,
      });
      await notify(listing.provisionalWinnerId, {
        kind: "closing",
        listingId: listing._id,
        title: "You are the provisional winner",
        body: `Waiting on the seller to approve “${listing.title}”.`,
      });
    } else {
      await notify(listing.sellerId, {
        kind: "closing",
        listingId: listing._id,
        title: "Auction ended unsold",
        body: `"${listing.title}" closed without meeting reserve.`,
      });
      await notifyMany(bidders.map(String), {
        kind: "closing",
        listingId: listing._id,
        title: "Auction unsold",
        body: `"${listing.title}" closed without a sale.`,
      });
    }
  }
}

export function startCloser() {
  const tick = async () => {
    try {
      await activateScheduled();
      await closeExpired();
    } catch (err) {
      console.error("closer", err.message);
    }
  };
  tick();
  return setInterval(tick, 2000);
}
