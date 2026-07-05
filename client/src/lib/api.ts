/**
 * CoinNova API client — handles all communication with the Express backend.
 * Automatically attaches JWT from localStorage and handles 401 redirects.
 */

// When running locally, prefer the local backend on port 3001.
// When building for production or a deployed environment, use the configured API URL or the deployed Render backend fallback.
const DEFAULT_API_URL = "https://coinnova-trading-platform.onrender.com";
const isLocalHost = (hostname: string) => ["localhost", "127.0.0.1", "::1"].includes(hostname);

export function resolveApiBase(hostname: string, configuredUrl: string | undefined, isProd: boolean) {
  const trimmedUrl = configuredUrl?.trim();
  const isLocalConfiguredUrl = !!trimmedUrl && /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1)(:\d+)?(\/|$)/i.test(trimmedUrl);

  if (trimmedUrl && (!isProd || !isLocalConfiguredUrl)) {
    return trimmedUrl.replace(/\/$/, "");
  }

  if (isLocalHost(hostname)) return `http://${hostname}:3001`;
  if (isProd) return DEFAULT_API_URL;
  return "/api";
}

const currentHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const envApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE = resolveApiBase(currentHostname, envApiUrl, import.meta.env.PROD);

export function getApiBase() {
  return API_BASE;
}

export function getGoogleAuthUrl() {
  return `${getApiBase()}/auth/google`;
}

// ─── Token management ────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("coinnova-token");
}

export function setToken(token: string) {
  localStorage.setItem("coinnova-token", token);
}

export function clearToken() {
  localStorage.removeItem("coinnova-token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Core fetch wrapper ─────────────────────────────────

interface ApiOptions {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    // Redirect to login if not already there
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError("Session expired", 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status, data.details);
  }

  return data as T;
}

// ─── Auth API ────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  emailVerified: boolean;
  hasPin?: boolean;
  twoFactorEnabled?: boolean;
  currencyPreference?: "USD" | "INR";
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiFetch<{ token: string; user: AuthUser; message: string }>("/auth/register", {
      method: "POST", body: { name, email, password }, skipAuth: true,
    }),

  login: (email: string, password: string) =>
    apiFetch<{ token?: string; user?: AuthUser; requiresTwoFactor?: boolean; message?: string }>("/auth/login", {
      method: "POST", body: { email, password }, skipAuth: true,
    }),

  me: () => apiFetch<{ user: AuthUser }>("/auth/me"),

  verifyOtp: (email: string, code: string, type: "email_verification" | "two_factor" | "pin_setup" | "pin_reset" | "password_reset") =>
    apiFetch<{ token: string; user: AuthUser; message: string }>("/auth/verify-otp", {
      method: "POST", body: { email, code, type }, skipAuth: true,
    }),

  forgot: (email: string) =>
    apiFetch<{ message: string }>("/auth/forgot", {
      method: "POST", body: { email }, skipAuth: true,
    }),

  reset: (email: string, code: string, password: string) =>
    apiFetch<{ message: string }>("/auth/reset", {
      method: "POST", body: { email, code, password }, skipAuth: true,
    }),

  resendOtp: () =>
    apiFetch<{ message: string }>("/auth/resend-otp", { method: "POST" }),
};

// ─── Wallet API ──────────────────────────────────────────

export const walletApi = {
  getBalance: () =>
    apiFetch<{ balanceUsd: number }>("/wallet"),

  deposit: (amount: number, transactionPin?: string) =>
    apiFetch<{ url: string; sessionId: string }>("/wallet/deposit", {
      method: "POST", body: { amount, transactionPin },
    }),

  confirmDeposit: (sessionId: string) =>
    apiFetch<{ message: string; balanceUsd: number }>("/wallet/deposit/confirm", {
      method: "POST", body: { sessionId },
    }),

  withdraw: (amount: number, bank: string, transactionPin?: string) =>
    apiFetch<{ message: string; balanceUsd: number }>("/wallet/withdraw", {
      method: "POST", body: { amount, bank, transactionPin },
    }),

  transfer: (amount: number, recipient: string, transactionPin?: string) =>
    apiFetch<{ message: string; balanceUsd: number }>("/wallet/transfer", {
      method: "POST", body: { amount, recipient, transactionPin },
    }),
};

// ─── Trades API ──────────────────────────────────────────

export const tradesApi = {
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number, transactionPin?: string, reason?: string, confidence?: number) =>
    apiFetch<{ message: string; balanceUsd: number }>("/trades/buy", {
      method: "POST", body: { coinId: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image, usd, price, transactionPin, reason, confidence },
    }),

  sell: (coinId: string, amount: number, price: number, transactionPin?: string, reason?: string, confidence?: number) =>
    apiFetch<{ message: string; balanceUsd: number }>("/trades/sell", {
      method: "POST", body: { coinId, amount, price, transactionPin, reason, confidence },
    }),

  history: () => apiFetch<any[]>("/trades"),

  portfolio: () => apiFetch<any[]>("/trades/portfolio"),
};

// ─── Watchlist API ───────────────────────────────────────

export const watchlistApi = {
  list: () => apiFetch<string[]>("/watchlist"),
  add: (coinId: string) => apiFetch("/watchlist/" + coinId, { method: "POST" }),
  remove: (coinId: string) => apiFetch("/watchlist/" + coinId, { method: "DELETE" }),
};

// ─── Alerts API ──────────────────────────────────────────

export const alertsApi = {
  list: () => apiFetch<any[]>("/alerts"),
  create: (coinId: string, symbol: string, direction: "above" | "below", price: number) =>
    apiFetch("/alerts", { method: "POST", body: { coinId, symbol, direction, price } }),
  remove: (id: string) => apiFetch(`/alerts/${id}`, { method: "DELETE" }),
};

// ─── AI API ──────────────────────────────────────────────

export const aiApi = {
  chat: (messages: { role: "user" | "assistant"; content: string }[], context?: string) =>
    apiFetch<{ reply: string }>("/ai/chat", { method: "POST", body: { messages, context } }),

  /** SSE streaming chat — returns a ReadableStream */
  chatStream: async (messages: { role: "user" | "assistant"; content: string }[], context?: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, context }),
    });
    return res.body;
  },

  risk: (coinId: string, coinName: string, price?: number, change24h?: number, marketCap?: number) =>
    apiFetch<{ level: string; factors: string[]; recommendation: string }>("/ai/risk", {
      method: "POST", body: { coinId, coinName, price, change24h, marketCap },
    }),

  suggest: (holdings: any[], walletBalance: number) =>
    apiFetch<{ suggestions: any[] }>("/ai/suggest", {
      method: "POST", body: { holdings, walletBalance },
    }),

  history: () => apiFetch<any[]>("/ai/history"),

  replayReview: (data: {
    coinId: string; symbol: string; difficulty: string;
    userReturn: number; buyAndHoldReturn: number; totalTrades: number;
    winRate: number; maxDrawdown: number; averageHoldingTime: number;
    trades?: any[];
  }) => apiFetch<{ aiGrade: string; critique: string; promptVersion: string }>("/ai/replay-review", { method: "POST", body: data }),

  journalAnalysis: () => apiFetch<{
    fomoScore: number;
    panicScore: number;
    disciplineScore: number;
    fomoExplanation: string;
    panicExplanation: string;
    disciplineExplanation: string;
    topStrength: string;
    topWeakness: string;
    advice: string[];
  }>("/ai/journal-analysis", { method: "POST" }),
  journalAnalysisHistory: () => apiFetch<any[]>("/ai/journal-analysis/history"),

  explainBehavior: (data: any) =>
    apiFetch<{ explanation: string }>("/ai/explain-behavior", { method: "POST", body: data }),

  portfolioHealth: (data: { holdings: any[]; walletBalance: number }) =>
    apiFetch<{
      overallScore: number;
      categories: {
        diversification: { score: number; reason: string; recommendation: string; contribution: number };
        stability: { score: number; reason: string; recommendation: string; contribution: number };
        quality: { score: number; reason: string; recommendation: string; contribution: number };
        concentration: { score: number; reason: string; recommendation: string; contribution: number };
      };
      metrics: { hhi: number; stableRatio: number; bluechipRatio: number; concentrationRisk: number; largestAsset: any };
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    }>("/ai/portfolio-health", { method: "POST", body: data }),

  portfolioHealthHistory: () => apiFetch<any[]>("/ai/portfolio-health/history"),
};

// ─── Replay API ──────────────────────────────────────────

export const replayApi = {
  history: () => apiFetch<any[]>("/replay/history"),
  trades: (replayId: string) => apiFetch<any[]>(`/replay/${replayId}/trades`),
  save: (data: {
    coinId: string; symbol: string; difficulty: string;
    startCapital: number; finalBalance: number;
    userReturn: number; buyAndHoldReturn: number;
    totalTrades: number; winRate: number; maxDrawdown: number;
    averageHoldingTime: number; replayDuration: number;
    trades: any[];
    review?: { critique: string; aiGrade: string; promptVersion?: string };
  }) => apiFetch<{ replay: any; review: any }>("/replay/save", { method: "POST", body: data }),
};

// ─── Journal API ─────────────────────────────────────────

export const journalApi = {
  list: () => apiFetch<any[]>("/journal"),
  save: (data: { transactionId?: string; notes: string }) =>
    apiFetch<any>("/journal", { method: "POST", body: data }),
  delete: (id: string) => apiFetch<{ message: string }>(`/journal/${id}`, { method: "DELETE" }),
};

// ─── Coins extended API ──────────────────────────────────

export const coinsApi = {
  historyRange: (coinId: string, from: number, to: number) =>
    apiFetch<{ prices: [number, number][] }>(`/coins/${coinId}/history-range?from=${from}&to=${to}`),
  search: (query: string) => apiFetch<{ coins: any[] }>(`/coins/search/${encodeURIComponent(query)}`),
};


export const userApi = {
  requestPinOtp: (action: "setup" | "reset") =>
    apiFetch<{ message: string; otp?: string; debug?: any }>('/user/pin/request-otp', { method: 'POST', body: { action } }),
  
  setPin: (pin: string, otp: string) =>
    apiFetch<{ message: string }>("/user/pin/set", { method: "POST", body: { pin, otp } }),
  
  changePin: (oldPin: string, newPin: string, otp: string) =>
    apiFetch<{ message: string }>("/user/pin/change", { method: "POST", body: { oldPin, newPin, otp } }),
  
  forgotPin: (newPin: string, otp: string) =>
    apiFetch<{ message: string }>("/user/pin/forgot", { method: "POST", body: { newPin, otp } }),

  updateSettings: (settings: { name?: string; currencyPreference?: "USD" | "INR"; twoFactorEnabled?: boolean }) =>
    apiFetch<{ message: string }>("/user/settings", { method: "POST", body: settings }),

  requestEmailChangeOtp: () =>
    apiFetch<{ message: string }>("/user/email/request-otp", { method: "POST" }),

  verifyEmailChange: (newEmail: string, otp: string) =>
    apiFetch<{ message: string }>("/user/email/verify", { method: "POST", body: { newEmail, otp } }),
};


// ─── Admin API ───────────────────────────────────────────

export const adminApi = {
  stats: () => apiFetch<{ users: number; transactions: number; totalVolume: number }>("/admin/stats"),
  users: () => apiFetch<any[]>("/admin/users"),
  transactions: () => apiFetch<any[]>("/admin/transactions"),
  approveWithdrawal: (id: string) => apiFetch(`/admin/withdrawals/${id}/approve`, { method: "POST" }),
  rejectWithdrawal: (id: string) => apiFetch(`/admin/withdrawals/${id}/reject`, { method: "POST" }),
  deleteUser: (id: string) => apiFetch(`/admin/users/${id}`, { method: "DELETE" }),
};

// ─── Razorpay API ────────────────────────────────────────

export const razorpayApi = {
  createOrder: (amount: number, transactionPin: string, rate: number) =>
    apiFetch<{ orderId: string; key: string; amount: number; currency: string }>("/razorpay/order", {
      method: "POST",
      body: { amount, transactionPin, rate },
    }),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    amountUsd: number;
  }) =>
    apiFetch<{ message: string }>("/razorpay/verify", {
      method: "POST",
      body: data,
    }),
};

// ─── Behavior API (Trading DNA Engine) ────────
export const behaviorApi = {
  scan: () => apiFetch<any>("/behavior/scan", { method: "POST" }),
  guardian: (trade: any) => apiFetch<any>("/behavior/guardian", { method: "POST", body: trade }),
  history: () => apiFetch<any[]>("/behavior/history"),
  achievements: () => apiFetch<any[]>("/behavior/achievements"),
};


const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: "POST", body }),
  put: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export default api;
