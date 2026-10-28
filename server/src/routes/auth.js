import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { privateUser, signToken } from "../middleware/auth.js";
import { asyncHandler, httpError } from "../utils/errors.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, campus } = req.body || {};
    if (!name || !email || !password) throw httpError(400, "Name, email, and password are required");
    if (String(password).length < 6) throw httpError(400, "Password must be at least 6 characters");
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) throw httpError(409, "Email already registered");
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      campus: campus || "Main Campus",
    });
    res.status(201).json({ token: signToken(user), user: privateUser(user) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || "").toLowerCase() });
    if (!user) throw httpError(401, "Invalid email or password");
    const ok = await bcrypt.compare(password || "", user.passwordHash);
    if (!ok) throw httpError(401, "Invalid email or password");
    res.json({ token: signToken(user), user: privateUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: privateUser(req.user) });
  })
);
