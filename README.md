# (campus-auction)

Student marketplace with **fairness first**: server-clock bidding, atomic listing updates, public maxes, then wanted alerts, Q&A, and a sandboxed AI assistant last.

## Stack

- React (Vite) + Express + Mongoose + MongoDB
- Money stored as **integer cents**
- Bids use **atomic `findOneAndUpdate` on the listing** (`status`, `endsAt`, `bidVersion`) so two simultaneous bids cannot both win. If MongoDB is a replica set (Docker Compose or Atlas), the listing + auto-bid + bid history writes also run in a **transaction**. A local standalone `mongod` still enforces the listing compare-and-set.
- Collections: users, listings, bids, autobids, notifications, alerts, questions
- Text indexes for keyword search

