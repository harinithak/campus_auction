import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";

export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = await User.findById(payload.sub).select("-passwordHash");
    }
  } catch {
    req.user = null;
  }
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Sign in required" });
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ error: "Account not found" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), name: user.name }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

export function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    campus: user.campus,
  };
}

export function privateUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    campus: user.campus,
  };
}
