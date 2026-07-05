import { useAuthStore } from "./authStore";
import { useDemoStore } from "./demoStore";
import { useCurrencyStore } from "./currencyStore";

export type Mode = "demo" | "live";

export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  amount: number;
  avgPrice: number;
}

export interface Transaction {
  id: string;
  type: "buy" | "sell" | "deposit" | "withdraw" | "transfer";
  coinId?: string;
  symbol?: string;
  amount: number;
  price?: number;
  total: number;
  to?: string;
  status: "completed" | "pending" | "failed";
  createdAt: number;
  mode: Mode;
}

export interface Alert {
  id: string;
  coinId: string;
  symbol: string;
  direction: "above" | "below";
  price: number;
  active: boolean;
  createdAt: number;
}

/**
 * Unified hook that delegates to either the persistent AuthStore (Live)
 * or the isolated client-side DemoStore.
 */
export const useDemo = () => {
  const auth = useAuthStore();
  const demo = useDemoStore();
  const { currency, convert, format, rate } = useCurrencyStore();

  const isLive = auth.mode === "live";

  // State
  const walletUSD = isLive ? auth.walletUSD : demo.walletUSD;
  const holdings = isLive ? auth.holdings : demo.holdings;
  const transactions = isLive ? auth.transactions : demo.transactions;
  const watchlist = isLive ? auth.watchlist : demo.watchlist;
  const alerts = isLive ? auth.alerts : demo.alerts;

  return {
    // Auth & Global
    mode: auth.mode,
    setMode: auth.setMode,
    user: auth.user,
    loading: auth.loading,
    setUser: auth.setUser,
    setLoading: auth.setLoading,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    fetchMe: auth.fetchMe,

    // Currency
    currency,
    exchangeRate: rate,
    convert,
    format,

    // Data
    walletUSD,
    holdings,
    transactions,
    watchlist,
    alerts,

    // Actions (Unified)
    syncWallet: isLive ? auth.syncWallet : demo.syncWallet,
    syncAll: auth.syncAll,
    
    deposit: isLive ? auth.deposit : demo.deposit,
    withdraw: isLive ? auth.withdraw : demo.withdraw,
    transferOut: isLive ? auth.transfer : demo.transferOut,
    buy: isLive ? auth.buy : demo.buy,
    sell: isLive ? auth.sell : demo.sell,
    toggleWatch: isLive ? auth.toggleWatch : demo.toggleWatch,
    addAlert: isLive ? auth.addAlert : demo.addAlert,
    removeAlert: isLive ? auth.removeAlert : demo.removeAlert,

    // Legacy/Internal
    resetDemo: demo.reset,
    setOnboarded: () => {},
    hasOnboarded: true,
  };
};

// ─── Format helpers ─────────────────────────

/** 
 * helper that reads current state. 
 * NOTE: Components using this should also call useDemo() or useCurrencyStore() 
 * to ensure they re-render when currency changes.
 */
export const formatUSD = (n: number, opts: Intl.NumberFormatOptions = {}) => {
  return useCurrencyStore.getState().format(n, opts);
};

export const formatNum = (n: number, frac = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: frac }).format(n);

export const formatPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
