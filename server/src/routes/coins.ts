import { Router } from "express";

const router = Router();

const CACHE_TTL = 60 * 1000; // 1 minute
const cache = new Map<string, { data: any; expiry: number }>();

async function fetchWithCache(url: string) {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      // If we get rate limited, return stale cache if available
      if (cached) return cached.data;
      throw new Error("CoinGecko Rate Limit exceeded");
    }
    throw new Error("CoinGecko API Error");
  }

  const data = await res.json();
  cache.set(url, { data, expiry: Date.now() + CACHE_TTL });
  return data;
}

router.get("/markets", async (req, res) => {
  try {
    const { vs_currency = "usd", per_page = 50, page = 1, ids, sparkline = "true", price_change_percentage = "1h,24h,7d" } = req.query;
    let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=${sparkline}&price_change_percentage=${price_change_percentage}`;
    if (ids) url += `&ids=${ids}`;

    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/trending", async (req, res) => {
  try {
    const data = await fetchWithCache("https://api.coingecko.com/api/v3/search/trending");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/chart", async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7, vs_currency = "usd" } = req.query;
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${days}`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /coins/:id/history-range — for Trading Replay Mode
router.get("/:id/history-range", async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, vs_currency = "usd" } = req.query;
    if (!from || !to) {
      res.status(400).json({ error: "from and to timestamps are required" });
      return;
    }
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=${vs_currency}&from=${from}&to=${to}`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /coins/search — coin search by query
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

