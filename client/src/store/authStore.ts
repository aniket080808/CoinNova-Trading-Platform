import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  authApi, walletApi, tradesApi, watchlistApi, alertsApi, notificationsApi, ordersApi,
  setToken, clearToken, getToken, isAuthenticated,
  type AuthUser, type OrderItem,
} from "@/lib/api";
import { type Holding, type Transaction, type Alert, type NotificationItem, type Mode } from "./demo";

interface AuthState {
  mode: Mode;
  user: AuthUser | null;
  loading: boolean;
  
  // Live state
  walletUSD: number;
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: string[];
  alerts: Alert[];
  notifications: NotificationItem[];
  orders: OrderItem[];

  // Actions
  setMode: (m: Mode) => void;
  setUser: (u: AuthUser | null) => void;
  setLoading: (v: boolean) => void;

  login: (email: string, password: string) => Promise<any>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;

  syncWallet: () => Promise<void>;
  syncHoldings: () => Promise<void>;
  syncTransactions: () => Promise<void>;
  syncWatchlist: () => Promise<void>;
  syncAlerts: () => Promise<void>;
  syncNotifications: () => Promise<void>;
  syncOrders: () => Promise<void>;
  syncAll: () => Promise<void>;

  // Live operations
  deposit: (amount: number) => Promise<{ url: string }>;
  withdraw: (amount: number, bank: string) => Promise<void>;
  transfer: (amount: number, recipient: string) => Promise<void>;
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number, transactionPin?: string, reason?: string, confidence?: number) => Promise<void>;
  sell: (coinId: string, amount: number, price: number, transactionPin?: string, reason?: string, confidence?: number) => Promise<void>;
  placeOrder: (data: {
    coinId: string;
    symbol: string;
    type: "limit" | "stop_loss" | "take_profit";
    side: "buy" | "sell";
    targetPrice: number;
    amount: number;
    pin?: string;
    transactionPin?: string;
    reason?: string;
    confidence?: number;
  }) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  toggleWatch: (coinId: string) => Promise<void>;
  addAlert: (coinId: string, symbol: string, direction: "above" | "below", price: number) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mode: "demo",
      user: null,
      loading: false,
      walletUSD: 0,
      holdings: [],
      transactions: [],
      watchlist: [],
      alerts: [],
      notifications: [],
      orders: [],

      setMode: (mode) => set({ mode }),
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await authApi.login(email, password);
          if (res.status === "2FA_REQUIRED") {
            setToken(res.token!); // temp token
            set({ loading: false });
            return res;
          }
          setToken(res.token!);
          set({ user: res.user!, mode: "live", loading: false });
          await get().syncAll();
          return res;
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ loading: true });
        try {
          const res = await authApi.register(name, email, password);
          setToken(res.token);
          set({ user: res.user, mode: "live", loading: false });
          await get().syncAll();
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      logout: () => {
        clearToken();
        set({ user: null, mode: "demo", walletUSD: 0, holdings: [], transactions: [], watchlist: [], alerts: [], notifications: [], orders: [] });
      },

      fetchMe: async () => {
        if (!isAuthenticated()) return;
        try {
          const res = await authApi.me();
          set({ user: res.user, mode: "live" });
          await get().syncAll();
        } catch {
          clearToken();
          set({ user: null, mode: "demo" });
        }
      },

      syncWallet: async () => {
        try { const res = await walletApi.getBalance(); set({ walletUSD: res.balanceUsd }); } catch (e) { console.error(e); }
      },
      syncHoldings: async () => {
        try { const res = await tradesApi.portfolio(); set({ holdings: res }); } catch (e) { console.error(e); }
      },
      syncTransactions: async () => {
        try { const res = await tradesApi.history(); set({ transactions: res }); } catch (e) { console.error(e); }
      },
      syncWatchlist: async () => {
        try { const res = await watchlistApi.list(); set({ watchlist: res }); } catch (e) { console.error(e); }
      },
      syncAlerts: async () => {
        try { const res = await alertsApi.list(); set({ alerts: res }); } catch (e) { console.error(e); }
      },
      syncNotifications: async () => {
        try {
          const res = await notificationsApi.list();
          set({ notifications: res.notifications });
        } catch (e) {
          console.error(e);
        }
      },
      syncOrders: async () => {
        try {
          const res = await ordersApi.list("all");
          set({ orders: res.orders });
        } catch (e) {
          console.error(e);
        }
      },
      syncAll: async () => {
        if (get().mode !== "live") return;
        await Promise.all([
          get().syncWallet(),
          get().syncHoldings(),
          get().syncTransactions(),
          get().syncWatchlist(),
          get().syncAlerts(),
          get().syncNotifications(),
          get().syncOrders(),
        ]);
      },

      deposit: async (amount, transactionPin?) => {
        return await walletApi.deposit(amount, transactionPin);
      },

      withdraw: async (amount, bank, transactionPin?) => {
        await walletApi.withdraw(amount, bank, transactionPin);
        await get().syncWallet();
        await get().syncTransactions();
      },

      transfer: async (amount, recipient, transactionPin?) => {
        await walletApi.transfer(amount, recipient, transactionPin);
        await get().syncWallet();
        await get().syncTransactions();
      },

      buy: async (coin, usd, price, transactionPin?, reason?, confidence?) => {
        await tradesApi.buy(coin, usd, price, transactionPin, reason, confidence);
        await get().syncAll();
      },

      sell: async (coinId, amount, price, transactionPin?, reason?, confidence?) => {
        await tradesApi.sell(coinId, amount, price, transactionPin, reason, confidence);
        await get().syncAll();
      },

      placeOrder: async (data) => {
        await ordersApi.create(data);
        await get().syncAll();
      },

      cancelOrder: async (id) => {
        await ordersApi.cancel(id);
        await get().syncAll();
      },


      toggleWatch: async (coinId) => {
        const s = get();
        if (s.watchlist.includes(coinId)) {
          await watchlistApi.remove(coinId);
        } else {
          await watchlistApi.add(coinId);
        }
        await get().syncWatchlist();
      },

      addAlert: async (coinId, symbol, direction, price) => {
        await alertsApi.create(coinId, symbol, direction, price);
        await get().syncAlerts();
      },

      removeAlert: async (id) => {
        await alertsApi.remove(id);
        await get().syncAlerts();
      },

      markNotificationRead: async (id) => {
        try {
          await notificationsApi.markRead(id);
          set((s) => ({
            notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }));
        } catch (_) {}
      },

      markAllNotificationsRead: async () => {
        try {
          await notificationsApi.markAllRead();
          set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
          }));
        } catch (_) {}
      },

      clearNotifications: async () => {
        try {
          await notificationsApi.clearAll();
          set({ notifications: [] });
        } catch (_) {}
      },
    }),
    {
      name: "coinnova-auth-storage",
      partialize: (state) => ({ user: state.user, mode: state.mode }),
    }
  )
);
