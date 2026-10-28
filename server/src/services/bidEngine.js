import mongoose from "mongoose";
import { config } from "../config.js";
import { AutoBid } from "../models/AutoBid.js";
import { Bid } from "../models/Bid.js";
import { Listing } from "../models/Listing.js";
import { httpError } from "../utils/errors.js";
import { isBidOnTime, resolveProxyBids, shouldExtend } from "../utils/bidMath.js";
import { emitListing } from "../realtime.js";
import { notify } from "./notify.js";

function withSession(session) {
  return session ? { session } : {};
}

async function loadAutoBids(listingId, session) {
  return AutoBid.find({ listingId }).session(session || null);
}

function transactionsSupported() {
  try {
    const type = mongoose.connection.client.topology.description.type;
    return type === "ReplicaSetWithPrimary" || type === "Sharded" || type === "LoadBalanced";
  } catch {
    return false;
  }
}

async function withOptionalTxn(work) {
  let session = null;
  if (transactionsSupported()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }
  try {
    const result = await work(session);
    if (session) await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        /* standalone Mongo has no txn */
      }
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

function snapshot(listing) {
  return {
    id: String(listing._id),
    currentBidCents: listing.currentBidCents,
    publicMaxCents: listing.publicMaxCents,
    leadingBidderId: listing.leadingBidderId ? String(listing.leadingBidderId) : null,
    bidCount: listing.bidCount,
    endsAt: listing.endsAt,
    extensionCount: listing.extensionCount,
    bidVersion: listing.bidVersion,
    status: listing.status,
  };
}

async function placeBidOnce({ userId, listingId, amountCents, proxy }) {
  return withOptionalTxn(async (session) => {
    const now = new Date();
    const listing = await Listing.findById(listingId).session(session);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) === String(userId)) {
      throw httpError(400, "You cannot bid on your own listing");
    }
    if (listing.status === "cancelled") throw httpError(409, "Seller cancelled this auction");
    if (listing.status !== "live") throw httpError(409, "Auction is not live");
    if (!isBidOnTime(now, listing.endsAt)) {
      throw httpError(409, "Auction closed: bids must arrive before server closing time");
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw httpError(400, "Bid must be a positive integer in cents");
    }

    const existing = await AutoBid.findOne({ listingId, userId }).session(session);
    const createdAt = existing?.createdAt || now;
    await AutoBid.findOneAndUpdate(
      { listingId, userId },
      {
        $set: { maxCents: amountCents, updatedAt: now },
        $setOnInsert: { createdAt, listingId, userId },
      },
      { upsert: true, ...withSession(session) }
    );

    const autos = await loadAutoBids(listingId, session);
    const resolved = resolveProxyBids(listing, autos);
    if (!resolved.leader || String(resolved.leader.userId) !== String(userId)) {
      const leaderMax = resolved.leader?.maxCents || 0;
      if (amountCents <= leaderMax && String(resolved.leader?.userId) !== String(userId)) {
        throw httpError(
          409,
          "Another bidder already holds an equal or higher max (earlier max wins ties)"
        );
      }
    }

    const prevLeader = listing.leadingBidderId;
    const prevAmount = listing.currentBidCents;
    const nextEnds = shouldExtend(now, listing.endsAt, config.antiSnipeWindowMs)
      ? new Date(now.getTime() + config.antiSnipeExtendMs)
      : listing.endsAt;
    const extended = nextEnds.getTime() !== listing.endsAt.getTime();

    const updated = await Listing.findOneAndUpdate(
      {
        _id: listingId,
        status: "live",
        endsAt: { $gt: now },
        bidVersion: listing.bidVersion,
      },
      {
        $set: {
          currentBidCents: resolved.publicBidCents,
          publicMaxCents: resolved.publicMaxCents,
          leadingBidderId: resolved.leader.userId,
          endsAt: nextEnds,
        },
        $inc: { bidCount: 1, bidVersion: 1, extensionCount: extended ? 1 : 0 },
      },
      { new: true, ...withSession(session) }
    );

    if (!updated) {
      throw httpError(409, "Concurrent bid won the race — refresh and try again");
    }

    const bidDocs = await Bid.create(
      [
        {
          listingId,
          userId,
          amountCents: resolved.publicBidCents,
          maxShownCents: resolved.publicMaxCents,
          kind: proxy ? "proxy" : "manual",
          serverTime: now,
        },
      ],
      session ? { session } : undefined
    );
    const bid = Array.isArray(bidDocs) ? bidDocs[0] : bidDocs;

    emitListing(String(listingId), "auction:update", snapshot(updated));
    emitListing(String(listingId), "bid:new", {
      id: String(bid._id),
      userId: String(userId),
      amountCents: bid.amountCents,
      maxShownCents: bid.maxShownCents,
      kind: bid.kind,
      serverTime: bid.serverTime,
    });

    if (extended) {
      emitListing(String(listingId), "auction:extended", {
        endsAt: updated.endsAt,
        extensionCount: updated.extensionCount,
      });
    }

    if (prevLeader && String(prevLeader) !== String(updated.leadingBidderId) && prevAmount) {
      await notify(prevLeader, {
        kind: "outbid",
        listingId,
        title: "You were outbid",
        body: `${updated.title} is now at $${(updated.currentBidCents / 100).toFixed(2)}.`,
      });
    }

    await notify(userId, {
      kind: "bid",
      listingId,
      title: proxy ? "Proxy bid armed" : "Bid placed",
      body: `Leading price $${(updated.currentBidCents / 100).toFixed(2)}. Public max $${(updated.publicMaxCents / 100).toFixed(2)}.`,
    });

    return { listing: updated, bid, serverTime: now };
  });
}

export async function placeBid(args) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await placeBidOnce(args);
    } catch (err) {
      lastError = err;
      if (err.status !== 409 || !String(err.message).includes("Concurrent")) throw err;
    }
  }
  throw lastError;
}

export { snapshot as listingSnapshot };
