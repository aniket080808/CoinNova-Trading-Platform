import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";

// Route imports
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import tradeRoutes from "./routes/trades.js";
import watchlistRoutes from "./routes/watchlist.js";
import alertRoutes from "./routes/alerts.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/user.js";
import coinsRoutes from "./routes/coins.js";
import razorpayRoutes from "./routes/razorpay.js";
import replayRoutes from "./routes/replay.js";
import journalRoutes from "./routes/journal.js";
import behaviorRoutes from "./routes/behavior.js";
import { startCronJobs } from "./services/cron.js";

startCronJobs();

const app = express();
app.set("trust proxy", true);

// ─── Global middleware ───────────────────────────────────

// CORS
const allowedOrigins = new Set(config.corsOrigin.map((value) => value.replace(/\/$/, "")));
const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, "");
  if (allowedOrigins.has(normalizedOrigin)) return true;
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(normalizedOrigin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(normalizedOrigin)) return true;
  if (/^https:\/\/[^/]+\.netlify\.app$/i.test(normalizedOrigin)) return true;
  if (/^https:\/\/[^/]+\.onrender\.com$/i.test(normalizedOrigin)) return true;

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin) || config.corsOrigin.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Parse JSON (skip for Stripe webhook which needs raw body)
app.use((req, res, next) => {
  if (req.path === "/wallet/webhook") return next();
  express.json()(req, res, next);
});

// Security & Cache Headers to prevent BFCache/back-button access to stale data
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many requests, try again later" },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 15,
  message: { error: "AI rate limit reached, try again in a minute" },
});

// ─── Routes ──────────────────────────────────────────────

app.use("/auth", authLimiter, authRoutes);
app.use("/wallet", walletRoutes);
app.use("/trades", tradeRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/alerts", alertRoutes);
app.use("/ai", aiLimiter, aiRoutes);
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);
app.use("/coins", coinsRoutes);
app.use("/razorpay", razorpayRoutes);
app.use("/replay", replayRoutes);
app.use("/journal", journalRoutes);
app.use("/behavior", behaviorRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Error handler ───────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ───────────────────────────────────────────────

app.listen(config.port, "0.0.0.0", () => {
  console.log(`
  ╔═════════════════════════════════════════════════════╗
  ║   🚀 CoinNova API running on :${config.port}        ║
  ║   CORS: ${config.corsOrigin.toString().padEnd(28)}  ║
  ╚═════════════════════════════════════════════════════╝
  `);
});

export default app;
// Hot-reload trigger

