import { useCurrencyStore } from "@/store/currencyStore";
import { useQuery } from "@tanstack/react-query";

/**
 * Proxy CoinGecko through our own backend to avoid CORS and rate limits (429).
 * Our backend also implements a 1-minute cache.
 */
// When on localhost, connect directly to port 3001.
// When accessed via a tunnel (Pinggy, etc.), use the /api proxy on the same origin.
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = (rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : null) ?? (isLocal ? `http://${window.location.hostname}:3001` : '/api');
const API = `${API_BASE}/coins`;

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
}

export interface GlobalStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  gainers: Coin[];
  losers: Coin[];
}

export interface FearGreedData {
  value: number;
  label: string;
  history: { value: number; label: string; timestamp: number }[];
}

export const fetchMarkets = async (page = 1, perPage = 50): Promise<Coin[]> => {
  const url = `${API}/markets?per_page=${perPage}&page=${page}&vs_currency=usd`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch markets");
  return r.json();
};

export const fetchByIds = async (ids: string[]): Promise<Coin[]> => {
  if (!ids.length) return [];
  const url = `${API}/markets?ids=${ids.join(",")}&vs_currency=usd`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed");
  return r.json();
};

export const fetchTrending = async () => {
  const r = await fetch(`${API}/trending`);
  if (!r.ok) throw new Error("Failed");
  return r.json();
};

export const fetchCoin = async (id: string) => {
  const r = await fetch(`${API}/${id}`);
  if (!r.ok) throw new Error("Failed");
  return r.json();
};

export const fetchChart = async (id: string, days = 7) => {
  const url = `${API}/${id}/chart?days=${days}&vs_currency=usd`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<{ prices: [number, number][] }>;
};

export interface OHLCCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ChartInterval = "1" | "5" | "15" | "30" | "60" | "240" | "D" | "W";

export const fetchOHLC = async (id: string, interval: ChartInterval = "D", limit = 200): Promise<{ ohlc: OHLCCandle[]; symbol: string; interval: string }> => {
  const url = `${API}/${id}/ohlc?interval=${interval}&limit=${limit}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch OHLC data");
  return r.json();
};

export const useOHLC = (id: string, interval: ChartInterval = "D", limit = 200) => {
  const staleTime = ["1", "5"].includes(interval) ? 15_000 : ["15", "30", "60"].includes(interval) ? 30_000 : 60_000;
  return useQuery({
    queryKey: ["ohlc", id, interval, limit],
    queryFn: () => fetchOHLC(id, interval, limit),
    enabled: !!id,
    staleTime,
    refetchInterval: staleTime,
  });
};


export const fetchGlobalStats = async (): Promise<GlobalStats> => {
  const r = await fetch(`${API}/global-stats`);
  if (!r.ok) throw new Error("Failed to fetch global stats");
  return r.json();
};

export const fetchFearGreed = async (): Promise<FearGreedData> => {
  const r = await fetch(`${API}/fear-greed`);
  if (!r.ok) throw new Error("Failed to fetch fear & greed");
  return r.json();
};

export const useMarkets = (page = 1) => {
  return useQuery({
    queryKey: ["markets", page],
    queryFn: () => fetchMarkets(page, 100),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};

export const useCoinsByIds = (ids: string[]) => {
  return useQuery({
    queryKey: ["coins-by-ids", [...ids].sort().join(",")],
    queryFn: () => fetchByIds(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};

export const useTrending = () =>
  useQuery({ queryKey: ["trending"], queryFn: fetchTrending, staleTime: 5 * 60_000 });

export const useCoin = (id: string) =>
  useQuery({ queryKey: ["coin", id], queryFn: () => fetchCoin(id), enabled: !!id, staleTime: 60_000 });

export const useChart = (id: string, days = 7) => {
  return useQuery({
    queryKey: ["chart", id, days],
    queryFn: () => fetchChart(id, days),
    enabled: !!id,
    staleTime: 60_000,
  });
};

export const useGlobalStats = () =>
  useQuery({
    queryKey: ["global-stats"],
    queryFn: fetchGlobalStats,
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
  });

export const useFearGreed = () =>
  useQuery({
    queryKey: ["fear-greed"],
    queryFn: fetchFearGreed,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

