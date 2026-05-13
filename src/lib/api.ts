/**
 * CoinNova API client — handles all communication with the Express backend.
 * Automatically attaches JWT from localStorage and handles 401 redirects.
 */

// When on localhost, connect directly to port 3001.
// When accessed via a tunnel (Pinggy, etc.), use the /api proxy on the same origin.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = import.meta.env.VITE_API_URL ?? (isLocal ? `http://${window.location.hostname}:3001` : '/api');

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
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number, transactionPin?: string) =>
    apiFetch<{ message: string; balanceUsd: number }>("/trades/buy", {
      method: "POST", body: { coinId: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image, usd, price, transactionPin },
    }),

  sell: (coinId: string, amount: number, price: number, transactionPin?: string) =>
    apiFetch<{ message: string; balanceUsd: number }>("/trades/sell", {
      method: "POST", body: { coinId, amount, price, transactionPin },
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
};

// ─── User API ────────────────────────────────────────────
export const userApi = {
  requestPinOtp: (action: "setup" | "reset") =>
    apiFetch<{ message: string }>("/user/pin/request-otp", { method: "POST", body: { action } }),
  
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

const api = {
  get: <T = any>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: "POST", body }),
  put: <T = any>(path: string, body?: any) => apiFetch<T>(path, { method: "PUT", body }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export default api;
