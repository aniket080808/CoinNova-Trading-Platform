import { getApiBase } from "@/lib/api";
import { useCurrencyStore } from "@/store/currencyStore";
import { useQuery } from "@tanstack/react-query";

/**
 * Proxy CoinGecko through our own backend to avoid CORS and rate limits (429).
 * Our backend also implements a 1-minute cache.
 */
const API_BASE = getApiBase();
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

export const fetchMarkets = async (page = 1, perPage = 50, currency = "usd"): Promise<Coin[]> => {
  const url = `${API}/markets?per_page=${perPage}&page=${page}&vs_currency=${currency.toLowerCase()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed to fetch markets");
  return r.json();
};

export const fetchByIds = async (ids: string[], currency = "usd"): Promise<Coin[]> => {
  if (!ids.length) return [];
  const url = `${API}/markets?ids=${ids.join(",")}&vs_currency=${currency.toLowerCase()}`;
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

export const fetchChart = async (id: string, days = 7, currency = "usd") => {
  const url = `${API}/${id}/chart?days=${days}&vs_currency=${currency.toLowerCase()}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<{ prices: [number, number][] }>;
};

export const useMarkets = (page = 1) => {
  const { currency } = useCurrencyStore();
  return useQuery({ queryKey: ["markets", page, currency], queryFn: () => fetchMarkets(page, 50, currency), staleTime: 60_000, refetchInterval: 60_000 });
};

export const useCoinsByIds = (ids: string[]) => {
  const { currency } = useCurrencyStore();
  return useQuery({ queryKey: ["coins-by-ids", ids.sort().join(","), currency], queryFn: () => fetchByIds(ids, currency), enabled: ids.length > 0, staleTime: 60_000, refetchInterval: 60_000 });
};

export const useTrending = () =>
  useQuery({ queryKey: ["trending"], queryFn: fetchTrending, staleTime: 5 * 60_000 });

export const useCoin = (id: string) =>
  useQuery({ queryKey: ["coin", id], queryFn: () => fetchCoin(id), enabled: !!id, staleTime: 60_000 });

export const useChart = (id: string, days = 7) => {
  const { currency } = useCurrencyStore();
  return useQuery({ queryKey: ["chart", id, days, currency], queryFn: () => fetchChart(id, days, currency), enabled: !!id, staleTime: 60_000 });
};
