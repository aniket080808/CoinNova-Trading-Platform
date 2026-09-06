import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Holding, type Transaction, type Alert, type NotificationItem, type Mode } from "./demo";

interface DemoState {
  walletUSD: number;
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: string[];
  alerts: Alert[];
  notifications: NotificationItem[];

  // Actions
  reset: () => void;
  syncWallet: () => Promise<void>;
  deposit: (usd: number, label?: string) => void;
  withdraw: (usd: number, dest?: string) => boolean;
  transferOut: (usd: number, dest: string) => boolean;
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number, pin?: string, reason?: string, confidence?: number) => boolean;
  sell: (coinId: string, amount: number, price: number, pin?: string, reason?: string, confidence?: number) => boolean;
  toggleWatch: (coinId: string) => void;
  addAlert: (a: any) => void;
  removeAlert: (id: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  addNotification: (item: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
}

const DEMO_DEFAULTS = {
  walletUSD: 100000,
  holdings: [],
  transactions: [],
  watchlist: ["bitcoin", "ethereum", "solana"],
  alerts: [],
  notifications: [
    {
      id: "notif-welcome",
      type: "system" as const,
      title: "Welcome to CoinNova!",
      message: "Your virtual trading wallet has been funded with $100,000.00 demo cash.",
      read: false,
      createdAt: Date.now() - 3600 * 1000,
    },
    {
      id: "notif-charts",
      type: "alert" as const,
      title: "Pro Charts Available",
      message: "Explore real spot candlestick charts with technical indicators on Coin pages.",
      read: false,
      createdAt: Date.now() - 1800 * 1000,
    },
  ],
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...DEMO_DEFAULTS,

      reset: () => set(DEMO_DEFAULTS),

      syncWallet: async () => {},

      deposit: (usd, label = "Card deposit") =>
        set((s) => ({
          walletUSD: s.walletUSD + usd,
          transactions: [{ id: uid(), type: "deposit", amount: usd, total: usd, status: "completed", createdAt: Date.now(), mode: "demo", to: label }, ...s.transactions],
          notifications: [
            {
              id: uid(),
              type: "deposit",
              title: "Deposit Confirmed",
              message: `Added $${usd.toLocaleString()} to your wallet balance.`,
              read: false,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        })),

      withdraw: (usd, dest = "Bank ****1234") => {
        const s = get();
        if (usd > s.walletUSD) return false;
        set({
          walletUSD: s.walletUSD - usd,
          transactions: [{ id: uid(), type: "withdraw", amount: usd, total: usd, status: "pending", createdAt: Date.now(), mode: "demo", to: dest }, ...s.transactions],
          notifications: [
            {
              id: uid(),
              type: "withdraw",
              title: "Withdrawal Requested",
              message: `Withdrawal of $${usd.toLocaleString()} to ${dest} is processing.`,
              read: false,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        });
        return true;
      },

      transferOut: (usd, dest) => {
        const s = get();
        if (usd > s.walletUSD) return false;
        set({
          walletUSD: s.walletUSD - usd,
          transactions: [{ id: uid(), type: "transfer", amount: usd, total: usd, status: "completed", createdAt: Date.now(), mode: "demo", to: dest }, ...s.transactions],
        });
        return true;
      },

      buy: (coin, usd, price, pin?, reason?, confidence?) => {
        const s = get();
        if (usd <= 0 || usd > s.walletUSD) return false;
        const amount = usd / price;
        const existing = s.holdings.find((h) => h.coinId === coin.id);
        const newHoldings = existing
          ? s.holdings.map((h) => h.coinId === coin.id ? { ...h, amount: h.amount + amount, avgPrice: (h.avgPrice * h.amount + price * amount) / (h.amount + amount) } : h)
          : [...s.holdings, { coinId: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image, amount, avgPrice: price }];
        set({
          walletUSD: s.walletUSD - usd,
          holdings: newHoldings,
          transactions: [{ id: uid(), type: "buy", coinId: coin.id, symbol: coin.symbol, amount, price, total: usd, status: "completed", createdAt: Date.now(), mode: "demo", reason, confidence }, ...s.transactions],
          notifications: [
            {
              id: uid(),
              type: "trade",
              title: `Bought ${amount.toFixed(4)} ${coin.symbol.toUpperCase()}`,
              message: `Filled order for $${usd.toFixed(2)} at $${price.toFixed(2)}`,
              read: false,
              link: `/coin/${coin.id}`,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        });
        return true;
      },

      sell: (coinId, amount, price, pin?, reason?, confidence?) => {
        const s = get();
        const h = s.holdings.find((x) => x.coinId === coinId);
        if (!h || amount <= 0 || amount > h.amount) return false;
        const usd = amount * price;
        const newHoldings = h.amount - amount < 1e-10
          ? s.holdings.filter((x) => x.coinId !== coinId)
          : s.holdings.map((x) => (x.coinId === coinId ? { ...x, amount: x.amount - amount } : x));
        set({
          walletUSD: s.walletUSD + usd,
          holdings: newHoldings,
          transactions: [{ id: uid(), type: "sell", coinId, symbol: h.symbol, amount, price, total: usd, status: "completed", createdAt: Date.now(), mode: "demo", reason, confidence }, ...s.transactions],
          notifications: [
            {
              id: uid(),
              type: "trade",
              title: `Sold ${amount.toFixed(4)} ${h.symbol.toUpperCase()}`,
              message: `Filled order for $${usd.toFixed(2)} at $${price.toFixed(2)}`,
              read: false,
              link: `/coin/${coinId}`,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        });
        return true;
      },

      toggleWatch: (id) => set((s) => ({
        watchlist: s.watchlist.includes(id) ? s.watchlist.filter((x) => x !== id) : [...s.watchlist, id],
      })),

      addAlert: (a) => {
        const newAlert = { ...a, id: uid(), active: true, createdAt: Date.now() };
        set((s) => ({
          alerts: [...s.alerts, newAlert],
          notifications: [
            {
              id: uid(),
              type: "alert",
              title: `Price Alert Set: ${a.symbol.toUpperCase()}`,
              message: `Alert configured for price ${a.direction} $${a.price}`,
              read: false,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        }));
      },

      removeAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearNotifications: () => set({ notifications: [] }),

      addNotification: (item) =>
        set((s) => ({
          notifications: [
            {
              ...item,
              id: uid(),
              read: false,
              createdAt: Date.now(),
            },
            ...s.notifications,
          ],
        })),
    }),
    { name: "coinnova-demo-storage" }
  )
);
