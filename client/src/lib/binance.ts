import { create } from "zustand";

interface PriceState {
  prices: Record<string, number>;
  setPrice: (symbol: string, price: number) => void;
}

export const usePrices = create<PriceState>((set) => ({
  prices: {},
  setPrice: (symbol, price) => {
    // Strictly reject NaN, infinite, or non-positive values
    if (!Number.isFinite(price) || price <= 0) return;
    set((state) => ({
      prices: { ...state.prices, [symbol.toLowerCase()]: price },
    }));
  },
}));

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectPrices(symbols: string[]) {
  if (ws) {
    try { ws.close(); } catch (_) {}
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (!symbols || symbols.length === 0) return () => {};

  // Binance combined stream requires /stream?streams=<stream1>/<stream2>...
  const streamList = symbols.map((s) => `${s.toLowerCase()}usdt@ticker`).join("/");
  const url = `wss://stream.binance.com:9443/stream?streams=${streamList}`;

  try {
    ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        // Combined stream wraps event in payload.data
        const ticker = payload.data || payload;
        if (ticker && ticker.s && ticker.c) {
          const symbol = ticker.s.replace(/USDT$/i, "").toLowerCase();
          const price = parseFloat(ticker.c);
          if (Number.isFinite(price) && price > 0) {
            usePrices.getState().setPrice(symbol, price);
          }
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      reconnectTimer = setTimeout(() => connectPrices(symbols), 5000);
    };

    ws.onerror = () => {
      try { ws?.close(); } catch (_) {}
    };
  } catch (err) {
    console.warn("Binance price ticker WebSocket init error:", err);
    reconnectTimer = setTimeout(() => connectPrices(symbols), 10000);
  }

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      try { ws.close(); } catch (_) {}
      ws = null;
    }
  };
}
