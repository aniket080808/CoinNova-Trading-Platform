import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

const smtpUser = optionalEnv("SMTP_USER");

export const config = {
  port: Number(env("PORT", "3001")),
  corsOrigin: process.env.NODE_ENV === "production" 
    ? ["https://coinnova.io"] // Replace with actual production domain
    : ["*"],

  // Database
  databaseUrl: env("DATABASE_URL"),

  // Auth
  jwtSecret: env("JWT_SECRET"),
  jwtExpiresIn: env("JWT_EXPIRES_IN", "7d"),
  adminEmail: env("ADMIN_EMAIL", "admin@gmail.com"),
  adminPassword: env("ADMIN_PASSWORD", "Admin123@"),
  adminId: "00000000-0000-0000-0000-000000000000",
  demoEmail: "demo@coinnova.io",
  demoPassword: "demo123",

  // Email
  smtp: {
    host: env("SMTP_HOST", "smtp.gmail.com"),
    port: Number(env("SMTP_PORT", "587")),
    user: smtpUser,
    pass: env("SMTP_PASS"),
    from: optionalEnv("SMTP_FROM", smtpUser ? `CoinNova <${smtpUser}>` : "CoinNova <noreply@coinnova.io>"),
  },

  // Stripe
  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
    webhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
    successUrl: env("STRIPE_SUCCESS_URL", "http://localhost:8080/wallet?deposit=success"),
    cancelUrl: env("STRIPE_CANCEL_URL", "http://localhost:8080/wallet?deposit=cancel"),
  },

  // Razorpay
  razorpay: {
    keyId: env("RAZORPAY_KEY_ID", ""),
    keySecret: env("RAZORPAY_KEY_SECRET", ""),
  },

  // Google OAuth
  google: {
    clientId: optionalEnv("GOOGLE_CLIENT_ID"),
    clientSecret: optionalEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri: optionalEnv("GOOGLE_REDIRECT_URI", "http://localhost:3001/auth/google/callback"),
    frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:8080"),
  },

  // Groq AI
  groqApiKey: env("GROQ_API_KEY"),

  // Portfolio Health Calculations
  portfolioHealth: {
    HHI_LIMIT: Number(process.env.HHI_LIMIT ?? "2500"),
    IDEAL_STABLE_RATIO_MIN: Number(process.env.IDEAL_STABLE_RATIO_MIN ?? "0.15"),
    IDEAL_STABLE_RATIO_MAX: Number(process.env.IDEAL_STABLE_RATIO_MAX ?? "0.30"),
    MAX_CONCENTRATION: Number(process.env.MAX_CONCENTRATION ?? "0.50"),
  },
} as const;
