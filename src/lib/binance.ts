import { create } from "zustand";

interface PriceState {
  prices: Record<string, number>;
  setPrice: (symbol: string, price: number) => void;
}

export const usePrices = create<PriceState>((set) => ({
  prices: {},
  setPrice: (symbol, price) => set((state) => ({
    prices: { ...state.prices, [symbol.toLowerCase()]: price }
  })),
}));

let ws: WebSocket | null = null;

export function connectPrices(symbols: string[]) {
  if (ws) ws.close();
  
  // Binance combined stream
  // e.g. btcusdt@ticker, ethusdt@ticker
  const streams = symbols.map(s => `${s.toLowerCase()}usdt@ticker`).join("/");
  ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.s && data.c) {
      // s: symbol (e.g. BTCUSDT), c: close price
      const symbol = data.s.replace("USDT", "").toLowerCase();
      usePrices.getState().setPrice(symbol, parseFloat(data.c));
    }
  };

  ws.onclose = () => {
    console.log("WebSocket closed, reconnecting...");
    setTimeout(() => connectPrices(symbols), 5000);
  };

  return () => ws?.close();
}
