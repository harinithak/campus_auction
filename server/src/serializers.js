export function serializeListing(listing, extra = {}) {
  const seller = listing.sellerId;
  const leader = listing.leadingBidderId;
  return {
    id: String(listing._id),
    seller: seller?.name
      ? { id: String(seller._id), name: seller.name, campus: seller.campus }
      : { id: String(seller) },
    title: listing.title,
    description: listing.description,
    category: listing.category,
    condition: listing.condition,
    imageUrl: listing.imageUrl,
    pickupLocation: listing.pickupLocation,
    startingPriceCents: listing.startingPriceCents,
    reserveCents: listing.reserveCents,
    incrementCents: listing.incrementCents,
    currentBidCents: listing.currentBidCents,
    publicMaxCents: listing.publicMaxCents,
    leadingBidderId: leader?._id ? String(leader._id) : leader ? String(leader) : null,
    leadingBidderName: leader?.name || null,
    bidCount: listing.bidCount,
    startsAt: listing.startsAt,
    endsAt: listing.endsAt,
    originalEndsAt: listing.originalEndsAt,
    extensionCount: listing.extensionCount,
    status: listing.status,
    provisionalWinnerId: listing.provisionalWinnerId
      ? String(listing.provisionalWinnerId)
      : null,
    handoverNote: listing.handoverNote,
    bidVersion: listing.bidVersion,
    createdAt: listing.createdAt,
    ...extra,
  };
}

export function serializeBid(bid) {
  return {
    id: String(bid._id),
    userId: bid.userId?._id ? String(bid.userId._id) : String(bid.userId),
    userName: bid.userId?.name || "Student",
    amountCents: bid.amountCents,
    maxShownCents: bid.maxShownCents,
    kind: bid.kind,
    serverTime: bid.serverTime,
  };
}
