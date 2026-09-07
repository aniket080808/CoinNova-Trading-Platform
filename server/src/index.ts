import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import notificationRoutes from "./routes/notifications.js";
import ordersRoutes from "./routes/orders.js";
import kycRoutes from "./routes/kyc.js";
import referralRoutes from "./routes/referrals.js";
import { startCronJobs } from "./services/cron.js";
import { startOrderEngine } from "./services/orderEngine.js";
import { ensureDatabaseSchema } from "./db/dbBootstrap.js";

ensureDatabaseSchema();
startCronJobs();
startOrderEngine();


const app = express();

// ─── Global middleware ───────────────────────────────────

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigin.includes(origin) || config.corsOrigin.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Cookie Parser for secure HTTP-only session cookies
app.use(cookieParser());

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

// AI rate limiting
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 15,
  message: { error: "AI rate limit reached, try again in a minute" },
});

// ─── Routes ──────────────────────────────────────────────

app.use("/auth", authRoutes);
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
app.use("/notifications", notificationRoutes);
app.use("/orders", ordersRoutes);
app.use("/kyc", kycRoutes);
app.use("/referrals", referralRoutes);

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

