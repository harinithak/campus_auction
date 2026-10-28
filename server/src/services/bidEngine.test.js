import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProxyBids } from "../utils/bidMath.js";

describe("seller cancel vs live bidding (policy)", () => {
  it("does not resolve a leader for an empty auto-bid set after cancel", () => {
    const listing = { startingPriceCents: 1000, incrementCents: 100, currentBidCents: 1500 };
    const result = resolveProxyBids(listing, []);
    assert.equal(result.leader, null);
  });
});
