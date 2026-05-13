import "dotenv/config";

function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

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
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
    from: env("SMTP_FROM", "CoinNova <noreply@coinnova.io>"),
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

  // Groq AI
  groqApiKey: env("GROQ_API_KEY"),
} as const;
