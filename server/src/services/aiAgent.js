import { Listing } from "../models/Listing.js";
import { httpError } from "../utils/errors.js";
import { placeBid } from "./bidEngine.js";

const pending = new Map();

function publicListing(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    category: doc.category,
    condition: doc.condition,
    currentBidCents: doc.currentBidCents,
    startingPriceCents: doc.startingPriceCents,
    publicMaxCents: doc.publicMaxCents,
    endsAt: doc.endsAt,
    status: doc.status,
  };
}

export async function planAssistant({ userId, message, maxSpendCents }) {
  if (!message?.trim()) throw httpError(400, "Say what you are looking for");
  if (!Number.isInteger(maxSpendCents) || maxSpendCents <= 0) {
    throw httpError(400, "Set a maximum spend limit in cents");
  }

  const q = message.trim();
  const listings = await Listing.find({
    status: { $in: ["live", "scheduled"] },
    $text: { $search: q },
  })
    .limit(8)
    .select("-__v");

  const fallback = listings.length
    ? listings
    : await Listing.find({
        status: { $in: ["live", "scheduled"] },
        $or: [
          { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { description: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { category: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ],
      }).limit(8);

  const safe = fallback
    .filter((l) => String(l.sellerId) !== String(userId))
    .map(publicListing);

  const proposal = safe[0]
    ? {
        type: "proxy_bid",
        listingId: safe[0].id,
        title: safe[0].title,
        maxCents: Math.min(
          maxSpendCents,
          Math.max(safe[0].startingPriceCents, safe[0].currentBidCents || 0)
        ),
      }
    : null;

  const token = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  pending.set(token, {
    userId: String(userId),
    proposal,
    maxSpendCents,
    expires: Date.now() + 10 * 60 * 1000,
  });

  return {
    reply:
      safe.length === 0
        ? "I only search public live listings. Nothing matched. Try different keywords."
        : `I found ${safe.length} public listing(s). I never see other students’ emails or passwords. If you want a proxy bid, confirm explicitly — I will not bid until you do, and I will cap at your max.`,
    listings: safe,
    proposal,
    confirmToken: proposal ? token : null,
    needsConfirmation: Boolean(proposal),
  };
}

export async function confirmAssistant({ userId, confirmToken, accept }) {
  const row = pending.get(confirmToken);
  if (!row || row.userId !== String(userId) || row.expires < Date.now()) {
    throw httpError(400, "Confirmation expired. Run the assistant again.");
  }
  pending.delete(confirmToken);
  if (!accept) return { reply: "Cancelled. No bid was placed." };
  if (!row.proposal) throw httpError(400, "Nothing to confirm");
  if (row.proposal.maxCents > row.maxSpendCents) {
    throw httpError(400, "Proposed bid exceeds your maximum limit");
  }
  const result = await placeBid({
    userId,
    listingId: row.proposal.listingId,
    amountCents: row.proposal.maxCents,
    proxy: true,
  });
  return {
    reply: `Proxy bid placed on “${row.proposal.title}” up to $${(row.proposal.maxCents / 100).toFixed(2)}.`,
    listingId: row.proposal.listingId,
    currentBidCents: result.listing.currentBidCents,
  };
}
