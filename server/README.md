# CoinNova — Backend reference (Neon + Express)

The Lovable preview hosts the **frontend only**. Use this folder as a starting point for your own server, then point `VITE_API_URL` at it.

## Stack
- **Express** + TypeScript
- **Drizzle ORM** + **Neon** (Postgres)
- **JWT** auth + **speakeasy** (TOTP 2FA)
-- **Resend** (HTTP API) for email (verification, reset, alerts)
- **Stripe** & **Razorpay** test-mode for "Add balance"
- **Groq** SDK for AI (chat, risk analysis, suggestions)

## Env vars
```
DATABASE_URL=postgres://...neon.tech/db
JWT_SECRET=change-me
GROQ_API_KEY=gsk_...
RESEND_API_KEY=re_xxx
RESEND_FROM="CoinNova <no-reply@example.com>"
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

## Suggested routes
```
POST   /auth/register             { name, email, password }
POST   /auth/login                { email, password } -> needs2fa
POST   /auth/2fa/verify           { tempToken, code } -> jwt
POST   /auth/forgot               { email }
POST   /auth/reset                { token, password }

GET    /me
GET    /wallet
POST   /wallet/deposit            (Stripe / Razorpay test)
POST   /wallet/withdraw           { amount, bank }
POST   /wallet/transfer           { amount, recipient }

POST   /trades/buy                { coinId, usd, price }
POST   /trades/sell               { coinId, amount, price }
GET    /trades                    history
GET    /portfolio                 holdings + P/L

GET    /watchlist                 / POST / DELETE
GET    /alerts                    / POST / DELETE

POST   /ai/chat                   { messages[] }   -> Groq llama-3.3-70b
POST   /ai/risk                   { coinId }       -> low/med/high + reasoning
POST   /ai/suggest                { portfolio }    -> suggestions

GET    /admin/users               (role=admin)
GET    /admin/transactions
```

## Drizzle schema (sketch)
```ts
users(id, name, email, password_hash, totp_secret, role, created_at)
user_roles(user_id, role)              // separate table — never trust client
wallets(user_id, balance_usd)
holdings(user_id, coin_id, amount, avg_price)
transactions(id, user_id, type, coin_id, amount, price, total, status, created_at)
watchlist(user_id, coin_id)
alerts(id, user_id, coin_id, direction, price, active)
ai_chats(id, user_id, role, content, created_at)
```

## AI (Groq) example
```ts
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const r = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    { role: "system", content: "You are Nova, a friendly crypto educator. Never give financial advice." },
    ...messages,
  ],
});
```

## Deploy
- Render / Railway / Fly.io — free tier works for a semester project
- Set CORS to your Lovable preview URL
- Frontend: set `VITE_API_URL` and replace the mock AI replies in `src/components/ai/ChatWidget.tsx` with a real fetch.

## Security checklist
- bcrypt passwords (12+ rounds)
- JWT with short TTL + refresh
- Rate-limit auth & AI routes (express-rate-limit)
- Validate all inputs with zod
- RLS-equivalent: always scope queries by `user_id`
- Roles in `user_roles`, never on the user row
