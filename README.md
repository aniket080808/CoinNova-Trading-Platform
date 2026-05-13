# 🚀 CoinNova - Advanced Cryptocurrency Trading Platform



CoinNova is a state-of-the-art, full-stack cryptocurrency trading and management platform. It offers real-time market tracking, secure trading simulations, AI-driven insights, and a seamless financial management experience.

---

## ✨ Features

### 📈 Trading & Market
- **Real-time Data**: Live cryptocurrency price tracking via CoinGecko integration.
- **Trade Execution**: Seamless Buy/Sell orders with real-time balance updates.
- **Interactive Charts**: Professional-grade price visualization using Recharts.
- **Watchlist & Alerts**: Personalized asset tracking with custom price notification triggers.

### 💰 Wallet & Payments
- **Multi-Gateway Support**: Integrated with **Stripe** and **Razorpay** for global and regional deposits.
- **Transaction History**: Detailed logs of trades, deposits, and withdrawals.
- **Secure Balances**: Atomic balance updates with PostgreSQL and Drizzle ORM.

### 🤖 AI Insights
- **Smart Analysis**: AI-powered market insights and portfolio suggestions leveraging **Groq SDK**.
- **Portfolio Health**: Automated assessments of trading patterns.

### 🛡️ Security & Administration
- **Robust Auth**: Secure JWT-based authentication with Bcrypt hashing.
- **Admin Dashboard**: Specialized interface for managing users, transactions, and system settings.
- **Rate Limiting**: Protection against brute-force and AI abuse using `express-rate-limit`.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (Vite)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/UI](https://ui.shadcn.com/) (Radix UI)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) & [TanStack Query](https://tanstack.com/query)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon DB](https://neon.tech/))
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/) & [Razorpay](https://razorpay.com/)
- **Real-time**: [WebSockets (ws)](https://github.com/websockets/ws)
- **Scheduling**: [Node-cron](https://github.com/node-cron/node-cron)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (Neon DB recommended)
- Stripe & Razorpay API Keys

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/coinnova.git
   cd coinnova
   ```

2. **Setup Frontend**
   ```bash
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd server
   npm install
   ```

### Environment Configuration

Create a `.env` file in the `server` directory and provide the following:

```env
PORT=3001
DATABASE_URL=your_postgresql_url
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# AI
GROQ_API_KEY=your_groq_api_key
```

### Running the Project

**Start Backend:**
```bash
cd server
npm run dev
```

**Start Frontend:**
```bash
# In the root directory
npm run dev
```

---

## 📂 Project Structure

```text
├── src/                # Frontend Source
│   ├── components/     # UI Components (Shadcn)
│   ├── lib/            # API Clients & Utilities
│   ├── pages/          # React Pages
│   └── store/          # Zustand State Management
├── server/             # Backend Source
│   ├── src/
│   │   ├── routes/     # API Endpoints
│   │   ├── services/   # Business Logic
│   │   ├── db/         # Drizzle Schema & Migrations
│   │   └── index.ts    # Entry Point
├── public/             # Static Assets
└── package.json        # Project Config
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ for the Crypto Community</p>
