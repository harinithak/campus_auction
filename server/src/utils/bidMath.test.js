import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBidOnTime,
  nextMinimumBid,
  resolveProxyBids,
  shouldExtend,
} from "./bidMath.js";

describe("bidMath", () => {
  it("accepts bids strictly before closing time", () => {
    const ends = new Date("2026-01-01T12:00:00.000Z");
    assert.equal(isBidOnTime(new Date("2026-01-01T11:59:59.999Z"), ends), true);
    assert.equal(isBidOnTime(new Date("2026-01-01T12:00:00.000Z"), ends), false);
  });

  it("first bid minimum is starting price", () => {
    assert.equal(
      nextMinimumBid({ startingPriceCents: 1000, currentBidCents: 0, incrementCents: 100 }),
      1000
    );
    assert.equal(
      nextMinimumBid({ startingPriceCents: 1000, currentBidCents: 1000, incrementCents: 100 }),
      1100
    );
  });

  it("auto vs auto: higher max wins at runner-up plus increment", () => {
    const listing = { startingPriceCents: 500, incrementCents: 100, currentBidCents: 0 };
    const result = resolveProxyBids(listing, [
      { userId: "a", maxCents: 2000, createdAt: "2026-01-01T10:00:00Z" },
      { userId: "b", maxCents: 1500, createdAt: "2026-01-01T10:01:00Z" },
    ]);
    assert.equal(result.leader.userId, "a");
    assert.equal(result.publicBidCents, 1600);
    assert.equal(result.publicMaxCents, 2000);
  });

  it("auto vs auto: earlier max wins ties at the tied max", () => {
    const listing = { startingPriceCents: 500, incrementCents: 100, currentBidCents: 0 };
    const result = resolveProxyBids(listing, [
      { userId: "early", maxCents: 2000, createdAt: "2026-01-01T10:00:00Z" },
      { userId: "late", maxCents: 2000, createdAt: "2026-01-01T10:05:00Z" },
    ]);
    assert.equal(result.leader.userId, "early");
    assert.equal(result.publicBidCents, 2000);
  });

  it("extends only inside the anti-snipe window", () => {
    const ends = new Date("2026-01-01T12:00:00.000Z");
    assert.equal(shouldExtend(new Date("2026-01-01T11:58:01.000Z"), ends, 120000), true);
    assert.equal(shouldExtend(new Date("2026-01-01T11:50:00.000Z"), ends, 120000), false);
    assert.equal(shouldExtend(new Date("2026-01-01T12:00:00.000Z"), ends, 120000), false);
  });
});
