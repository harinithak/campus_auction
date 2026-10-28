# QuadBid (campus-auction)

Student marketplace with **fairness first**: server-clock bidding, atomic listing updates, public maxes, then wanted alerts, Q&A, and a sandboxed AI assistant last.

## Stack

- React (Vite) + Express + Mongoose + MongoDB
- Money stored as **integer cents**
- Bids use **atomic `findOneAndUpdate` on the listing** (`status`, `endsAt`, `bidVersion`) so two simultaneous bids cannot both win. If MongoDB is a replica set (Docker Compose or Atlas), the listing + auto-bid + bid history writes also run in a **transaction**. A local standalone `mongod` still enforces the listing compare-and-set.
- Collections: users, listings, bids, autobids, notifications, alerts, questions
- Text indexes for keyword search

## Run

```bash
docker compose up -d
copy .env.example .env   # Windows
npm install
npm install --prefix server
npm install --prefix client
npm run seed
npm test
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000/api/health

Demo accounts (password `password123`): `maya@campus.edu`, `leo@campus.edu`, `priya@campus.edu`

## Why this order

1. Core flow (auth, listings, live room, atomic bids, close/handover, pop-up notifications) because every other feature hangs off it.
2. Anti-snipe extensions, proxy bidding, wanted alerts, Q&A — trust and “don’t miss the item.”
3. AI last: it only calls public search + the same auto-bid API, requires explicit confirm + max limit, and never exposes account details.

## Closing-time rule

A bid is accepted only if **server now &lt; endsAt**. A bid at the exact closing millisecond is rejected.

## Seller cancel mid-auction

Allowed while `live` or `scheduled`. Status becomes `cancelled`, proxy bids are cleared, and bidders are notified. No sale completes.
