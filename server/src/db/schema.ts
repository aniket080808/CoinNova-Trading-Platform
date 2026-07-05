import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  uniqueIndex,
  index,
  integer,
  bigint,
  json,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const txTypeEnum = pgEnum("tx_type", [
  "buy",
  "sell",
  "deposit",
  "withdraw",
  "transfer",
]);
export const txStatusEnum = pgEnum("tx_status", [
  "completed",
  "pending",
  "failed",
]);
export const alertDirectionEnum = pgEnum("alert_direction", [
  "above",
  "below",
]);
export const otpTypeEnum = pgEnum("otp_type", [
  "email_verification",
  "password_reset",
  "two_factor",
  "pin_setup",
  "pin_reset",
  "email_change"
]);
// export const currencyEnum = pgEnum("currency_pref", ["USD", "INR"]);
// export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);

// ─── Users ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
  
  // Transaction PIN fields
  transactionPin: text("transaction_pin"),
  transactionPinAttempts: numeric("transaction_pin_attempts").default("0").notNull(),
  pinLockedUntil: timestamp("pin_locked_until"),
  
  // Preferences & Progress
  currencyPreference: varchar("currency_preference", { length: 10 }).default("USD").notNull(),
  xp: numeric("xp").default("0").notNull(),
  level: numeric("level").default("1").notNull(),
  
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Wallets ─────────────────────────────────────────────

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  balanceUsd: numeric("balance_usd", { precision: 18, scale: 8 })
    .default("0")
    .notNull(),
});

// ─── Holdings ────────────────────────────────────────────

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coinId: varchar("coin_id", { length: 100 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    image: text("image").default(""),
    amount: numeric("amount", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
    avgPrice: numeric("avg_price", { precision: 18, scale: 8 })
      .default("0")
      .notNull(),
  },
  (t) => [uniqueIndex("holdings_user_coin_idx").on(t.userId, t.coinId)]
);

// ─── Transactions ────────────────────────────────────────

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: txTypeEnum("type").notNull(),
  coinId: varchar("coin_id", { length: 100 }),
  symbol: varchar("symbol", { length: 20 }),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  price: numeric("price", { precision: 18, scale: 8 }),
  total: numeric("total", { precision: 18, scale: 8 }).notNull(),
  status: txStatusEnum("status").default("pending").notNull(),
  toDest: text("to_dest"),
  stripeSessionId: text("stripe_session_id"),
  reason: varchar("reason", { length: 50 }),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Watchlist ───────────────────────────────────────────

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coinId: varchar("coin_id", { length: 100 }).notNull(),
  },
  (t) => [uniqueIndex("watchlist_user_coin_idx").on(t.userId, t.coinId)]
);

// ─── Alerts ──────────────────────────────────────────────

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coinId: varchar("coin_id", { length: 100 }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    direction: alertDirectionEnum("direction").notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("alerts_user_idx").on(t.userId),
    index("alerts_coin_idx").on(t.coinId),
    index("alerts_active_idx").on(t.active),
  ]
);

// ─── AI Chats ────────────────────────────────────────────

export const aiChats = pgTable("ai_chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── OTP Codes ───────────────────────────────────────────

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  type: otpTypeEnum("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Trading Replays ─────────────────────────────────────

export const tradingReplays = pgTable("trading_replays", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  coinId: varchar("coin_id", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  difficulty: varchar("difficulty", { length: 50 }).notNull(),
  startCapital: numeric("start_capital", { precision: 18, scale: 8 }).notNull(),
  finalBalance: numeric("final_balance", { precision: 18, scale: 8 }).notNull(),
  userReturn: numeric("user_return", { precision: 18, scale: 8 }).notNull(),
  buyAndHoldReturn: numeric("buy_and_hold_return", { precision: 18, scale: 8 }).notNull(),
  totalTrades: integer("total_trades").notNull(),
  winRate: numeric("win_rate", { precision: 18, scale: 8 }).notNull(),
  maxDrawdown: numeric("max_drawdown", { precision: 18, scale: 8 }).notNull(),
  averageHoldingTime: numeric("average_holding_time", { precision: 18, scale: 8 }).notNull(),
  replayDuration: integer("replay_duration").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Replay Transactions ─────────────────────────────────

export const replayTransactions = pgTable("replay_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  replayId: uuid("replay_id")
    .notNull()
    .references(() => tradingReplays.id, { onDelete: "cascade" }),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  action: varchar("action", { length: 20 }).notNull(), // 'buy' | 'sell'
  price: numeric("price", { precision: 18, scale: 8 }).notNull(),
  quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
  cashBalance: numeric("cash_balance", { precision: 18, scale: 8 }).notNull(),
  portfolioValue: numeric("portfolio_value", { precision: 18, scale: 8 }).notNull(),
});

// ─── Replay Reviews ──────────────────────────────────────

export const replayReviews = pgTable("replay_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  replayId: uuid("replay_id")
    .notNull()
    .references(() => tradingReplays.id, { onDelete: "cascade" }),
  critique: text("critique").notNull(),
  aiGrade: varchar("ai_grade", { length: 5 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 20 }).default("v1").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Trade Journals ──────────────────────────────────────

export const tradeJournals = pgTable("trade_journals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .references(() => transactions.id, { onDelete: "cascade" }),
  notes: text("notes").notNull(),
  sentiment: varchar("sentiment", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Behavioral Analysis ─────────────────────────────────

export const behaviorAnalysis = pgTable("behavior_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  fomoScore: integer("fomo_score").notNull(),
  panicScore: integer("panic_score").notNull(),
  disciplineScore: integer("discipline_score").notNull(),
  fomoExplanation: text("fomo_explanation"),
  panicExplanation: text("panic_explanation"),
  disciplineExplanation: text("discipline_explanation"),
  topStrength: text("top_strength"),
  topWeakness: text("top_weakness"),
  advice: json("advice"),
  promptVersion: varchar("prompt_version", { length: 20 }).default("v1").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Portfolio Health History ────────────────────────────

export const portfolioHealthHistory = pgTable("portfolio_health_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  diversificationScore: integer("diversification_score").notNull(),
  stabilityScore: integer("stability_score").notNull(),
  qualityScore: integer("quality_score").notNull(),
  concentrationScore: integer("concentration_score").notNull(),
  strengths: json("strengths"),
  weaknesses: json("weaknesses"),
  recommendations: json("recommendations"),
  metrics: json("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Behavior Insights (Phase 1 — Behavioral Intelligence Engine) ─────────

export const behaviorInsights = pgTable("behavior_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  behaviorScore: integer("behavior_score").notNull(),
  fomoScore: integer("fomo_score").notNull(),
  panicScore: integer("panic_score").notNull(),
  disciplineScore: integer("discipline_score").notNull(),
  confidenceAccuracy: integer("confidence_accuracy").notNull(),
  patterns: json("patterns"),
  mistakes: json("mistakes"),
  calibration: json("calibration"),
  personality: json("personality"),
  aiCoaching: json("ai_coaching"),
  aiVersion: varchar("ai_version", { length: 20 }).default("v1").notNull(),
  tradeCount: integer("trade_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Achievements ────────────────────────────────────────

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  unlockRule: varchar("unlock_rule", { length: 100 }).notNull(),
  unlocked: boolean("unlocked").default(false).notNull(),
  unlockedAt: timestamp("unlocked_at"),
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Daily Behavior History ──────────────────────────────

export const behaviorHistoryDaily = pgTable("behavior_history_daily", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  behaviorScore: integer("behavior_score").notNull(),
  radarValues: json("radar_values").notNull(),
  personality: varchar("personality", { length: 50 }).notNull(),
  grade: varchar("grade", { length: 5 }).notNull(),
  strengths: json("strengths").notNull(),
  weaknesses: json("weaknesses").notNull(),
  trend: integer("trend").notNull(), // e.g. +8 or -5
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
