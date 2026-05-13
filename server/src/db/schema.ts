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

