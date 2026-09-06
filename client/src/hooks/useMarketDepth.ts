import { useState, useEffect, useRef, useMemo } from "react";
import {
  fetchDepth,
  fetchRecentTrades,
  type OrderBookData,
  type OrderBookLevel,
  type PublicMarketTrade,
} from "@/lib/coingecko";

interface UseMarketDepthProps {
  coinId: string;
  symbol: string;
}

function processLevels(rawLevels: [number, number][], isAsks: boolean): OrderBookLevel[] {
  // Asks are sorted ascending (lowest ask first)
  // Bids are sorted descending (highest bid first)
  const sorted = [...rawLevels].sort((a, b) => (isAsks ? a[0] - b[0] : b[0] - a[0])).slice(0, 15);

  let cumulative = 0;
  const withCumulative = sorted.map(([price, amount]) => {
    cumulative += amount;
    return { price, amount, total: cumulative, percent: 0 };
  });

  const maxCumulative = cumulative || 1;
  return withCumulative.map((lvl) => ({
    ...lvl,
    percent: Math.min(100, Math.round((lvl.total / maxCumulative) * 100)),
  }));
}

export function useMarketDepth({ coinId, symbol }: UseMarketDepthProps) {
  const [bids, setBids] = useState<[number, number][]>([]);
  const [asks, setAsks] = useState<[number, number][]>([]);
  const [trades, setTrades] = useState<PublicMarketTrade[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastTradePrice, setLastTradePrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sym = (symbol || "BTC").toUpperCase();
  const pair = sym === "USDT" ? "USDCUSDT" : `${sym}USDT`;

  // 1. Initial Snapshot Fetch via Backend REST Fallback
  useEffect(() => {
    let isMounted = true;

    async function loadSnapshot() {
      try {
        const [depthData, tradesData] = await Promise.all([
          fetchDepth(coinId, 20).catch(() => null),
          fetchRecentTrades(coinId, 30).catch(() => null),
        ]);

        if (!isMounted) return;

        if (depthData?.bids && depthData?.asks) {
          setBids(depthData.bids);
          setAsks(depthData.asks);
        }

        if (tradesData?.trades?.length) {
          setTrades(tradesData.trades);
          if (tradesData.trades[0]?.price) {
            setLastTradePrice(tradesData.trades[0].price);
          }
        }
      } catch (err) {
        console.warn("Market depth snapshot fetch failed:", err);
      }
    }

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [coinId, pair]);

  // 2. Real-Time Binance Combined WebSocket Stream (Depth20 + Trade)
  useEffect(() => {
    let isMounted = true;
    const streamPair = pair.toLowerCase();
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamPair}@depth20@100ms/${streamPair}@trade`;

    function connect() {
      if (!isMounted) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) setIsLive(true);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const message = JSON.parse(event.data);
            const stream = message.stream || "";
            const data = message.data || {};

            // Depth Stream
            if (stream.includes("@depth20")) {
              if (data.bids && data.asks) {
                const parsedBids: [number, number][] = data.bids.map((b: [string, string]) => [
                  parseFloat(b[0]),
                  parseFloat(b[1]),
                ]);
                const parsedAsks: [number, number][] = data.asks.map((a: [string, string]) => [
                  parseFloat(a[0]),
                  parseFloat(a[1]),
                ]);
                setBids(parsedBids);
                setAsks(parsedAsks);
              }
            }

            // Trade Stream
            if (stream.includes("@trade")) {
              const newPrice = parseFloat(data.p);
              const newTrade: PublicMarketTrade = {
                id: String(data.t || `${data.T}-${Math.random()}`),
                price: newPrice,
                amount: parseFloat(data.q),
                time: Number(data.T || Date.now()),
                isBuyerMaker: Boolean(data.m),
              };

              setLastTradePrice((prev) => {
                if (prev !== null) {
                  if (newPrice > prev) setPriceDirection("up");
                  else if (newPrice < prev) setPriceDirection("down");
                }
                return newPrice;
              });

              setTrades((prev) => [newTrade, ...prev.slice(0, 39)]);
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          if (isMounted) {
            setIsLive(false);
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.warn("WebSocket init error:", err);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [pair]);

  // 3. Computed Order Book Metrics (Spread, Mid, Depth)
  const orderBook = useMemo<OrderBookData>(() => {
    const processedAsks = processLevels(asks, true);
    const processedBids = processLevels(bids, false);

    const lowestAsk = processedAsks[0]?.price ?? 0;
    const highestBid = processedBids[0]?.price ?? 0;

    const spread = lowestAsk > 0 && highestBid > 0 ? Math.max(0, lowestAsk - highestBid) : 0;
    const spreadPercent = highestBid > 0 ? (spread / highestBid) * 100 : 0;
    const midPrice = lowestAsk > 0 && highestBid > 0 ? (lowestAsk + highestBid) / 2 : highestBid || lowestAsk;

    return {
      asks: processedAsks,
      bids: processedBids,
      spread,
      spreadPercent,
      midPrice,
    };
  }, [bids, asks]);

  return {
    orderBook,
    trades,
    isLive,
    lastTradePrice,
    priceDirection,
    pair,
  };
}
