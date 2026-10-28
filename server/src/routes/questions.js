import { Router } from "express";
import { Listing } from "../models/Listing.js";
import { Question } from "../models/Question.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";
import { config } from "../config.js";
import { notify } from "../services/notify.js";

export const questionsRouter = Router();

questionsRouter.get(
  "/:listingId",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) throw httpError(404, "Listing not found");
    const isSeller = req.user && String(listing.sellerId) === String(req.user._id);
    const filter = { listingId: listing._id };
    if (!isSeller) filter.hidden = false;
    const rows = await Question.find(filter).sort({ createdAt: 1 }).populate("askerId", "name");
    res.json({
      questions: rows.map((q) => ({
        id: String(q._id),
        body: q.body,
        answer: q.answer,
        hidden: q.hidden,
        askerName: q.askerId?.name || "Student",
        createdAt: q.createdAt,
        answeredAt: q.answeredAt,
      })),
    });
  })
);

questionsRouter.post(
  "/:listingId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) === String(req.user._id)) {
      throw httpError(400, "Sellers answer questions rather than asking them");
    }
    const unanswered = await Question.countDocuments({
      listingId: listing._id,
      askerId: req.user._id,
      answer: "",
      hidden: false,
    });
    if (unanswered >= config.maxUnansweredQuestions) {
      throw httpError(
        429,
        `You already have ${config.maxUnansweredQuestions} unanswered questions on this auction`
      );
    }
    const body = String(req.body?.body || "").trim();
    if (body.length < 4) throw httpError(400, "Question is too short");
    const q = await Question.create({ listingId: listing._id, askerId: req.user._id, body });
    await notify(listing.sellerId, {
      kind: "question",
      listingId: listing._id,
      title: "New auction question",
      body: `${req.user.name} asked about “${listing.title}”.`,
    });
    res.status(201).json({
      question: {
        id: String(q._id),
        body: q.body,
        answer: "",
        hidden: false,
        askerName: req.user.name,
        createdAt: q.createdAt,
      },
    });
  })
);

questionsRouter.post(
  "/:listingId/:questionId/answer",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Only the seller can answer");
    const q = await Question.findOne({ _id: req.params.questionId, listingId: listing._id });
    if (!q) throw httpError(404, "Question not found");
    q.answer = String(req.body?.answer || "").trim();
    q.answeredAt = new Date();
    await q.save();
    await notify(q.askerId, {
      kind: "question",
      listingId: listing._id,
      title: "Your question was answered",
      body: `Seller replied on “${listing.title}”.`,
    });
    res.json({ ok: true });
  })
);

questionsRouter.post(
  "/:listingId/:questionId/hide",
  requireAuth,
  asyncHandler(async (req, res) => {
    const listing = await Listing.findById(req.params.listingId);
    if (!listing) throw httpError(404, "Listing not found");
    if (String(listing.sellerId) !== String(req.user._id)) throw httpError(403, "Only the seller can hide spam");
    const q = await Question.findOne({ _id: req.params.questionId, listingId: listing._id });
    if (!q) throw httpError(404, "Question not found");
    q.hidden = true;
    await q.save();
    res.json({ ok: true });
  })
);
