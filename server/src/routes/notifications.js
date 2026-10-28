import { Router } from "express";
import { Notification } from "../models/Notification.js";
import { Alert } from "../models/Alert.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";

export const notificationsRouter = Router();
export const alertsRouter = Router();

notificationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({
      notifications: rows.map((n) => ({
        id: String(n._id),
        title: n.title,
        body: n.body,
        kind: n.kind,
        listingId: n.listingId ? String(n.listingId) : null,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  })
);

notificationsRouter.post(
  "/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  })
);

alertsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ alerts: rows });
  })
);

alertsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const keywords = String(req.body?.keywords || "").trim();
    if (keywords.length < 2) throw httpError(400, "Add keywords for this wanted alert");
    const alert = await Alert.create({
      userId: req.user._id,
      keywords,
      category: String(req.body?.category || ""),
      maxPriceCents: Number(req.body?.maxPriceCents || 0),
    });
    res.status(201).json({ alert });
  })
);

alertsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await Alert.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ ok: true });
  })
);
