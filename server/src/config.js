import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/campus-auction?replicaSet=rs0&directConnection=true",
  jwtSecret: process.env.JWT_SECRET || "dev-change-me",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  antiSnipeWindowMs: Number(process.env.ANTI_SNIPE_WINDOW_MS || 120000),
  antiSnipeExtendMs: Number(process.env.ANTI_SNIPE_EXTEND_MS || 120000),
  maxUnansweredQuestions: Number(process.env.MAX_UNANSWERED_QUESTIONS || 5),
  openaiKey: process.env.OPENAI_API_KEY || "",
};
