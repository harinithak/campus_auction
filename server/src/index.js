import http from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { listingsRouter } from "./routes/listings.js";
import { bidsRouter } from "./routes/bids.js";
import { lifecycleRouter } from "./routes/lifecycle.js";
import { questionsRouter } from "./routes/questions.js";
import { alertsRouter, notificationsRouter } from "./routes/notifications.js";
import { aiRouter } from "./routes/ai.js";
import { setIo } from "./realtime.js";
import { startCloser } from "./services/closer.js";

const app = express();
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, serverTime: new Date() });
});
app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/bids", bidsRouter);
app.use("/api/lifecycle", lifecycleRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/ai", aiRouter);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientOrigin, methods: ["GET", "POST"] },
});
setIo(io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    socket.userId = payload.sub;
  } catch {
    /* public auction rooms still allowed */
  }
  next();
});

io.on("connection", (socket) => {
  if (socket.userId) socket.join(`user:${socket.userId}`);
  socket.on("join:listing", (listingId) => {
    if (listingId) socket.join(`listing:${listingId}`);
  });
  socket.on("leave:listing", (listingId) => {
    if (listingId) socket.leave(`listing:${listingId}`);
  });
});

async function main() {
  if (!config.mongoUri.includes("replicaSet=rs0")) {
    console.warn(
      "Mongo URI is missing replicaSet=rs0; transactions and replica-set behavior may not work correctly."
    );
  }
  await mongoose.connect(config.mongoUri);
  startCloser();
  server.listen(config.port, () => {
    console.log(`campus-auction API on :${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
