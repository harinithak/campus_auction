/**
 * Pure auction-price math. Money is integer cents.
 * Earlier max wins ties. Public price is the minimum needed to beat the runner-up.
 */
export function nextMinimumBid(listing) {
  if (!listing.currentBidCents) return listing.startingPriceCents;
  return listing.currentBidCents + listing.incrementCents;
}

export function resolveProxyBids(listing, autoBids) {
  const increment = listing.incrementCents;
  const starting = listing.startingPriceCents;
  const eligible = [...autoBids]
    .filter((b) => b.maxCents >= starting)
    .sort((a, b) => {
      if (b.maxCents !== a.maxCents) return b.maxCents - a.maxCents;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  if (!eligible.length) {
    return {
      leader: null,
      publicBidCents: listing.currentBidCents || 0,
      publicMaxCents: 0,
    };
  }

  const winner = eligible[0];
  const runnerUp = eligible.find(
    (b) => String(b.userId) !== String(winner.userId)
  );

  let publicBidCents = starting;
  if (runnerUp) {
    publicBidCents = Math.min(winner.maxCents, runnerUp.maxCents + increment);
  }

  if (listing.currentBidCents && listing.currentBidCents > publicBidCents) {
    publicBidCents = Math.min(winner.maxCents, listing.currentBidCents);
  }

  if (publicBidCents < starting) publicBidCents = starting;
  if (publicBidCents > winner.maxCents) publicBidCents = winner.maxCents;

  return {
    leader: winner,
    publicBidCents,
    publicMaxCents: winner.maxCents,
  };
}

export function shouldExtend(now, endsAt, windowMs) {
  return endsAt.getTime() - now.getTime() > 0 && endsAt.getTime() - now.getTime() <= windowMs;
}

export function isBidOnTime(now, endsAt) {
  return now.getTime() < endsAt.getTime();
}
