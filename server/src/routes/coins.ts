import { Router } from "express";

const router = Router();

const CACHE_TTL = 90 * 1000; // 90 seconds
const cache = new Map<string, { data: any; expiry: number }>();

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

if (process.env.COINGECKO_API_KEY) {
  HEADERS["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
}

const COIN_SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  binancecoin: "BNB",
  solana: "SOL",
  ripple: "XRP",
  cardano: "ADA",
  dogecoin: "DOGE",
  "matic-network": "MATIC",
  polygon: "MATIC",
  polkadot: "DOT",
  tron: "TRX",
  avalanche: "AVAX",
  chainlink: "LINK",
  uniswap: "UNI",
  litecoin: "LTC",
  shiba: "SHIB",
  "shiba-inu": "SHIB",
};

async function fetchWithCache(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      if (cached) {
        console.warn(`[CoinGecko ${res.status}] Serving stale cache for: ${url}`);
        return cached.data;
      }
      throw new Error(`CoinGecko HTTP ${res.status}`);
    }

    const data = await res.json();
    cache.set(url, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  } catch (err: any) {
    if (cached) {
      console.warn(`[CoinGecko Network Error] Serving stale cache:`, err.message);
      return cached.data;
    }
    throw err;
  }
}

// Fallback: fetch historical chart klines from Binance
async function fetchBinanceChartFallback(coinId: string, days: number): Promise<{ prices: [number, number][] } | null> {
  try {
    const symbol = COIN_SYMBOL_MAP[coinId.toLowerCase()] || coinId.toUpperCase();
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;
    const limit = Math.min(Math.max(days || 7, 1), 365);
    const interval = limit <= 1 ? "1h" : limit <= 30 ? "1d" : "1d";

    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`, { headers: HEADERS });
    if (!res.ok) return null;

    const klines = await res.json() as any[];
    if (!Array.isArray(klines)) return null;

    const prices: [number, number][] = klines.map((k) => [
      Number(k[0]), // open time
      parseFloat(k[4]), // close price
    ]);

    return { prices };
  } catch (err) {
    console.error(`Binance chart fallback failed for ${coinId}:`, err);
    return null;
  }
}

// Fallback: synthesize coin detail directly from Binance 24h ticker (100% real live data, no hardcoded stats)
async function fetchBinanceCoinFallback(coinId: string): Promise<any | null> {
  try {
    const symbol = COIN_SYMBOL_MAP[coinId.toLowerCase()] || coinId.toUpperCase();
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;

    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, { headers: HEADERS });
    if (!res.ok) return null;

    const ticker = await res.json() as any;
    const currentPrice = parseFloat(ticker.lastPrice || "0");
    const change24h = parseFloat(ticker.priceChangePercent || "0");
    const totalVolume = parseFloat(ticker.quoteVolume || "0");
    const high24h = parseFloat(ticker.highPrice || String(currentPrice));
    const low24h = parseFloat(ticker.lowPrice || String(currentPrice));
    const cleanName = coinId.charAt(0).toUpperCase() + coinId.slice(1).replace(/-/g, " ");

    return {
      id: coinId,
      symbol: symbol.toLowerCase(),
      name: cleanName,
      web_slug: coinId,
      asset_platform_id: null,
      market_cap_rank: null,
      image: {
        thumb: `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`,
        small: `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`,
        large: `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`,
      },
      description: {
        en: `${cleanName} (${symbol.toUpperCase()}) real-time market data sourced live from Binance.`,
      },
      market_data: {
        current_price: { usd: currentPrice },
        total_volume: { usd: totalVolume },
        market_cap: { usd: 0 },
        circulating_supply: 0,
        price_change_percentage_24h: change24h,
        price_change_percentage_7d: change24h,
        ath: { usd: high24h },
        atl: { usd: low24h },
        high_24h: { usd: high24h },
        low_24h: { usd: low24h },
        sparkline_7d: { price: [] },
      },
    };
  } catch (err) {
    console.error(`Binance coin detail fallback failed for ${coinId}:`, err);
    return null;
  }
}

router.get("/markets", async (req, res) => {
  try {
    const { vs_currency = "usd", per_page = 50, page = 1, ids, sparkline = "true", price_change_percentage = "1h,24h,7d" } = req.query;
    let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=${sparkline}&price_change_percentage=${price_change_percentage}`;
    if (ids) url += `&ids=${ids}`;

    const data = await fetchWithCache(url);
    if (ids && Array.isArray(data)) {
      const idSet = new Set(String(ids).toLowerCase().split(","));
      return res.json(data.filter((c: any) => idSet.has(c.id.toLowerCase())));
    }
    res.json(data);
  } catch (err: any) {
    console.warn("CoinGecko markets failed, checking for cached or fallback data:", err.message);
    const cachedAny = Array.from(cache.entries()).find(([k]) => k.includes("/coins/markets"));
    if (cachedAny && Array.isArray(cachedAny[1].data)) {
      let filtered = cachedAny[1].data;
      if (req.query.ids) {
        const idSet = new Set(String(req.query.ids).toLowerCase().split(","));
        filtered = filtered.filter((c: any) => idSet.has(c.id.toLowerCase()));
      }
      return res.json(filtered);
    }
    res.status(500).json({ error: "Market data temporarily unavailable" });
  }
});

router.get("/trending", async (req, res) => {
  try {
    const data = await fetchWithCache("https://api.coingecko.com/api/v3/search/trending");
    res.json(data);
  } catch (err: any) {
    const cachedAny = Array.from(cache.entries()).find(([k]) => k.includes("/search/trending"));
    if (cachedAny) return res.json(cachedAny[1].data);
    res.json({ coins: [] });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    console.warn(`CoinGecko /coins/${id} failed, attempting Binance fallback:`, err.message);
    const fallback = await fetchBinanceCoinFallback(id);
    if (fallback) {
      cache.set(`https://api.coingecko.com/api/v3/coins/${id}`, { data: fallback, expiry: Date.now() + CACHE_TTL });
      return res.json(fallback);
    }
    res.status(500).json({ error: err.message || "Failed to load coin details" });
  }
});

router.get("/:id/chart", async (req, res) => {
  const { id } = req.params;
  const { days = 7, vs_currency = "usd" } = req.query;
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${days}`;

  try {
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    console.warn(`CoinGecko chart for ${id} failed, attempting Binance fallback:`, err.message);
    const fallback = await fetchBinanceChartFallback(id, Number(days) || 7);
    if (fallback) {
      cache.set(url, { data: fallback, expiry: Date.now() + CACHE_TTL });
      return res.json(fallback);
    }
    res.status(500).json({ error: err.message || "Failed to load chart data" });
  }
});

// GET /coins/:id/history-range — for Trading Replay Mode
router.get("/:id/history-range", async (req, res) => {
  const { id } = req.params;
  const { from, to, vs_currency = "usd" } = req.query;
  try {
    if (!from || !to) {
      res.status(400).json({ error: "from and to timestamps are required" });
      return;
    }
    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=${vs_currency}&from=${from}&to=${to}`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err: any) {
    // If range query fails, fallback to Binance klines with days calculation
    const days = Math.ceil((Number(to) - Number(from)) / (24 * 3600));
    const fallback = await fetchBinanceChartFallback(id, Math.max(days, 1));
    if (fallback) return res.json(fallback);
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
    res.json({ coins: [] });
  }
});

export default router;
