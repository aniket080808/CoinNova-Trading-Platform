import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type Holding, type Transaction, type Alert, type NotificationItem, type Mode } from "./demo";
import { type OrderItem } from "@/lib/api";

interface DemoState {
  walletUSD: number;
  holdings: Holding[];
  transactions: Transaction[];
  watchlist: string[];
  alerts: Alert[];
  notifications: NotificationItem[];
  orders: OrderItem[];

  // Actions
  reset: () => void;
  syncWallet: () => Promise<void>;
  deposit: (usd: number, label?: string) => void;
  withdraw: (usd: number, dest?: string) => boolean;
  transferOut: (usd: number, dest: string) => boolean;
  buy: (coin: { id: string; symbol: string; name: string; image: string }, usd: number, price: number, pin?: string, reason?: string, confidence?: number) => boolean;
  sell: (coinId: string, amount: number, price: number, pin?: string, reason?: string, confidence?: number) => boolean;
  placeOrder: (data: {
    coinId: string;
    symbol: string;
    type: "limit" | "stop_loss" | "take_profit";
    side: "buy" | "sell";
    targetPrice: number;
    amount: number;
    reason?: string;
    confidence?: number;
  }) => boolean;
  cancelOrder: (id: string) => boolean;
  checkOrders: (prices: Record<string, number>) => void;
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
  orders: [],
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

      placeOrder: (data) => {
        const s = get();
        const total = data.amount * data.targetPrice;
        if (data.side === "buy") {
          if (total > s.walletUSD) return false;
          const newOrder: OrderItem = {
            id: uid(),
            coinId: data.coinId,
            symbol: data.symbol.toLowerCase(),
            type: data.type,
            side: data.side,
            targetPrice: data.targetPrice,
            amount: data.amount,
            total,
            status: "open",
            reason: data.reason,
            confidence: data.confidence,
            createdAt: Date.now(),
          };
          set({
            walletUSD: s.walletUSD - total,
            orders: [newOrder, ...s.orders],
            notifications: [
              {
                id: uid(),
                type: "trade",
                title: `${data.type === "stop_loss" ? "Stop-Loss" : data.type === "take_profit" ? "Take-Profit" : "Limit Buy"} Placed`,
                message: `BUY ${data.amount} ${data.symbol.toUpperCase()} @ $${data.targetPrice.toFixed(2)} ($${total.toFixed(2)} escrowed)`,
                read: false,
                createdAt: Date.now(),
              },
              ...s.notifications,
            ],
          });
          return true;
        } else {
          const h = s.holdings.find((x) => x.coinId === data.coinId);
          if (!h || h.amount < data.amount) return false;
          const remaining = h.amount - data.amount;
          const newHoldings =
            remaining < 1e-10
              ? s.holdings.filter((x) => x.coinId !== data.coinId)
              : s.holdings.map((x) => (x.coinId === data.coinId ? { ...x, amount: remaining } : x));
          const newOrder: OrderItem = {
            id: uid(),
            coinId: data.coinId,
            symbol: data.symbol.toLowerCase(),
            type: data.type,
            side: data.side,
            targetPrice: data.targetPrice,
            amount: data.amount,
            total,
            status: "open",
            reason: data.reason,
            confidence: data.confidence,
            createdAt: Date.now(),
          };
          set({
            holdings: newHoldings,
            orders: [newOrder, ...s.orders],
            notifications: [
              {
                id: uid(),
                type: "trade",
                title: `${data.type === "stop_loss" ? "Stop-Loss" : data.type === "take_profit" ? "Take-Profit" : "Limit Sell"} Placed`,
                message: `SELL ${data.amount} ${data.symbol.toUpperCase()} @ $${data.targetPrice.toFixed(2)}`,
                read: false,
                createdAt: Date.now(),
              },
              ...s.notifications,
            ],
          });
          return true;
        }
      },

      cancelOrder: (id) => {
        const s = get();
        const order = s.orders.find((o) => o.id === id);
        if (!order || order.status !== "open") return false;
        if (order.side === "buy") {
          set({
            walletUSD: s.walletUSD + order.total,
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status: "cancelled", cancelledAt: Date.now() } : o
            ),
            notifications: [
              {
                id: uid(),
                type: "trade",
                title: "Order Cancelled",
                message: `Refunded $${order.total.toFixed(2)} to your wallet.`,
                read: false,
                createdAt: Date.now(),
              },
              ...s.notifications,
            ],
          });
        } else {
          const existing = s.holdings.find((h) => h.coinId === order.coinId);
          const newHoldings = existing
            ? s.holdings.map((h) =>
                h.coinId === order.coinId ? { ...h, amount: h.amount + order.amount } : h
              )
            : [
                ...s.holdings,
                {
                  coinId: order.coinId,
                  symbol: order.symbol,
                  name: order.symbol.toUpperCase(),
                  image: "",
                  amount: order.amount,
                  avgPrice: order.targetPrice,
                },
              ];
          set({
            holdings: newHoldings,
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status: "cancelled", cancelledAt: Date.now() } : o
            ),
            notifications: [
              {
                id: uid(),
                type: "trade",
                title: "Order Cancelled",
                message: `Refunded ${order.amount} ${order.symbol.toUpperCase()} to your holdings.`,
                read: false,
                createdAt: Date.now(),
              },
              ...s.notifications,
            ],
          });
        }
        return true;
      },

      checkOrders: (livePrices) => {
        const s = get();
        const openOrders = s.orders.filter((o) => o.status === "open");
        if (!openOrders.length) return;

        for (const o of openOrders) {
          const lp = livePrices[o.symbol.toLowerCase()];
          if (!lp) continue;

          let fill = false;
          if (o.side === "buy" && o.type === "limit" && lp <= o.targetPrice) fill = true;
          if (o.side === "sell" && o.type === "limit" && lp >= o.targetPrice) fill = true;
          if (o.side === "sell" && o.type === "stop_loss" && lp <= o.targetPrice) fill = true;
          if (o.side === "sell" && o.type === "take_profit" && lp >= o.targetPrice) fill = true;

          if (!fill) continue;

          if (o.side === "buy") {
            const existing = s.holdings.find((h) => h.coinId === o.coinId);
            const newHoldings = existing
              ? s.holdings.map((h) =>
                  h.coinId === o.coinId ? { ...h, amount: h.amount + o.amount } : h
                )
              : [
                  ...s.holdings,
                  {
                    coinId: o.coinId,
                    symbol: o.symbol,
                    name: o.symbol.toUpperCase(),
                    image: "",
                    amount: o.amount,
                    avgPrice: lp,
                  },
                ];
            set((prev) => ({
              holdings: newHoldings,
              orders: prev.orders.map((ord) =>
                ord.id === o.id
                  ? { ...ord, status: "filled", filledPrice: lp, filledAt: Date.now() }
                  : ord
              ),
              transactions: [
                {
                  id: uid(),
                  type: "buy",
                  coinId: o.coinId,
                  symbol: o.symbol,
                  amount: o.amount,
                  price: lp,
                  total: o.total,
                  status: "completed",
                  createdAt: Date.now(),
                  mode: "demo",
                },
                ...prev.transactions,
              ],
              notifications: [
                {
                  id: uid(),
                  type: "trade",
                  title: `Limit Order Filled!`,
                  message: `Bought ${o.amount} ${o.symbol.toUpperCase()} at $${lp.toFixed(2)}.`,
                  read: false,
                  createdAt: Date.now(),
                },
                ...prev.notifications,
              ],
            }));
          } else {
            const saleTotal = o.amount * lp;
            set((prev) => ({
              walletUSD: prev.walletUSD + saleTotal,
              orders: prev.orders.map((ord) =>
                ord.id === o.id
                  ? { ...ord, status: "filled", filledPrice: lp, filledAt: Date.now() }
                  : ord
              ),
              transactions: [
                {
                  id: uid(),
                  type: "sell",
                  coinId: o.coinId,
                  symbol: o.symbol,
                  amount: o.amount,
                  price: lp,
                  total: saleTotal,
                  status: "completed",
                  createdAt: Date.now(),
                  mode: "demo",
                },
                ...prev.transactions,
              ],
              notifications: [
                {
                  id: uid(),
                  type: "trade",
                  title: `${o.type === "stop_loss" ? "Stop-Loss" : "Limit"} Order Executed!`,
                  message: `Sold ${o.amount} ${o.symbol.toUpperCase()} at $${lp.toFixed(
                    2
                  )} ($${saleTotal.toFixed(2)} credited).`,
                  read: false,
                  createdAt: Date.now(),
                },
                ...prev.notifications,
              ],
            }));
          }
        }
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
