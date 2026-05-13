import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  authApi, walletApi, tradesApi, watchlistApi, alertsApi,
  setToken, clearToken, getToken, isAuthenticated,
  type AuthUser,
} from "@/lib/api";
import { type Holding, type Transaction, type Alert, type Mode } from "./demo";

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
  syncAll: () => Promise<void>;

  // Live operations
  deposit: (amount: number) => Promise<{ url: string }>;
  withdraw: (amount: number, bank: string) => Promise<void>;
  transfer: (amount: number, recipient: string) => Promise<void>;
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number) => Promise<void>;
  sell: (coinId: string, amount: number, price: number) => Promise<void>;
  toggleWatch: (coinId: string) => Promise<void>;
  addAlert: (coinId: string, symbol: string, direction: "above" | "below", price: number) => Promise<void>;
  removeAlert: (id: string) => Promise<void>;
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
        set({ user: null, mode: "demo", walletUSD: 0, holdings: [], transactions: [], watchlist: [], alerts: [] });
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
      syncAll: async () => {
        if (get().mode !== "live") return;
        await Promise.all([get().syncWallet(), get().syncHoldings(), get().syncTransactions(), get().syncWatchlist(), get().syncAlerts()]);
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

      buy: async (coin, usd, price, transactionPin?) => {
        await tradesApi.buy(coin, usd, price, transactionPin);
        await get().syncAll();
      },

      sell: async (coinId, amount, price, transactionPin?) => {
        await tradesApi.sell(coinId, amount, price, transactionPin);
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
    }),
    {
      name: "coinnova-auth-storage",
      partialize: (state) => ({ user: state.user, mode: state.mode }),
    }
  )
);
