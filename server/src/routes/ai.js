import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/errors.js";
import { confirmAssistant, planAssistant } from "../services/aiAgent.js";

export const aiRouter = Router();

aiRouter.post(
  "/plan",
  requireAuth,
  asyncHandler(async (req, res) => {
    const maxSpendCents = Number(req.body?.maxSpendCents);
    const result = await planAssistant({
      userId: req.user._id,
      message: req.body?.message,
      maxSpendCents,
    });
    res.json(result);
  })
);

aiRouter.post(
  "/confirm",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await confirmAssistant({
      userId: req.user._id,
      confirmToken: req.body?.confirmToken,
      accept: Boolean(req.body?.accept),
    });
    res.json(result);
  })
);
