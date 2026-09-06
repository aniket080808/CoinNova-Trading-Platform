import { Router } from "express";

const router = Router();

// ── Cache Layer ──────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 1000; // 60 seconds
const cache = new Map<string, { data: any; expiry: number }>();

async function fetchWithCache(url: string, ttl = CACHE_TTL): Promise<any> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) {
      if (cached) {
        console.warn(`[HTTP ${res.status}] Serving stale cache for: ${url}`);
        return cached.data;
      }
      throw new Error(`HTTP ${res.status} from ${url}`);
    }

    const data = await res.json();
    cache.set(url, { data, expiry: Date.now() + ttl });
    return data;
  } catch (err: any) {
    if (cached) {
      console.warn(`[Network Error] Serving stale cache:`, err.message);
      return cached.data;
    }
    throw err;
  }
}

async function fetchTextWithCache(url: string, ttl = CACHE_TTL): Promise<string> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now() && typeof cached.data === "string") {
    return cached.data;
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      if (cached && typeof cached.data === "string") return cached.data;
      throw new Error(`HTTP ${res.status} from ${url}`);
    }

    const text = await res.text();
    cache.set(url, { data: text, expiry: Date.now() + ttl });
    return text;
  } catch (err: any) {
    if (cached && typeof cached.data === "string") return cached.data;
    throw err;
  }
}

// ── CoinPaprika ID Resolution ────────────────────────────────────────────
// CoinPaprika uses IDs like "btc-bitcoin", CoinNova uses "bitcoin"
// We build a mapping from all known CoinPaprika tickers on first load

let paprikaIdMap: Map<string, string> | null = null; // shortId -> paprikaId
let paprikaReverseMap: Map<string, string> | null = null; // paprikaId -> shortId

async function getPaprikaIdMap(): Promise<{ forward: Map<string, string>; reverse: Map<string, string> }> {
  if (paprikaIdMap && paprikaReverseMap) {
    return { forward: paprikaIdMap, reverse: paprikaReverseMap };
  }

  const tickers: any[] = await fetchWithCache(
    "https://api.coinpaprika.com/v1/tickers?quotes=USD",
    5 * 60 * 1000 // cache ID map for 5 minutes
  );

  const forward = new Map<string, string>();
  const reverse = new Map<string, string>();

  for (const t of tickers) {
    // e.g. "btc-bitcoin" -> shortId = "bitcoin"
    const parts = t.id.split("-");
    const shortId = parts.slice(1).join("-") || parts[0];
    forward.set(shortId, t.id);
    forward.set(t.symbol.toLowerCase(), t.id);
    forward.set(t.id, t.id); // direct lookup
    reverse.set(t.id, shortId);
  }

  // Manual overrides for CoinGecko-style IDs that don't match
  const overrides: Record<string, string> = {
    "binancecoin": "bnb-binance-coin",
    "ripple": "xrp-xrp",
    "matic-network": "matic-polygon",
    "polygon": "matic-polygon",
    "shiba-inu": "shib-shiba-inu",
    "usd-coin": "usdc-usd-coin",
    "avalanche-2": "avax-avalanche",
    "wrapped-bitcoin": "wbtc-wrapped-bitcoin",
    "staked-ether": "steth-lido-staked-ether",
    "the-open-network": "ton-toncoin",
    "internet-computer": "icp-internet-computer",
    "near": "near-near-protocol",
  };

  for (const [short, paprikaId] of Object.entries(overrides)) {
    forward.set(short, paprikaId);
    reverse.set(paprikaId, short);
  }

  paprikaIdMap = forward;
  paprikaReverseMap = reverse;
  return { forward, reverse };
}

function resolvePaprikaId(coinId: string, map: Map<string, string>): string {
  return map.get(coinId.toLowerCase()) || coinId;
}

function resolveShortId(paprikaId: string, map: Map<string, string>): string {
  const short = map.get(paprikaId);
  if (short) return short;
  // Fallback: strip symbol prefix
  const parts = paprikaId.split("-");
  return parts.slice(1).join("-") || parts[0];
}

// ── Bybit Symbol Map ─────────────────────────────────────────────────────
// Map CoinNova/CoinGecko coin IDs to Bybit spot trading symbols
const BYBIT_SYMBOL_MAP: Record<string, string> = {
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
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  uniswap: "UNI",
  litecoin: "LTC",
  shiba: "SHIB",
  "shiba-inu": "SHIB",
  "usd-coin": "USDC",
  "wrapped-bitcoin": "WBTC",
  "staked-ether": "STETH",
  stellar: "XLM",
  cosmos: "ATOM",
  monero: "XMR",
  "internet-computer": "ICP",
  filecoin: "FIL",
  aptos: "APT",
  arbitrum: "ARB",
  optimism: "OP",
  near: "NEAR",
  sui: "SUI",
  pepe: "PEPE",
  render: "RNDR",
  injective: "INJ",
  sei: "SEI",
  celestia: "TIA",
  jupiter: "JUP",
  mantle: "MNT",
  ondo: "ONDO",
};

function getBybitSymbol(coinId: string): string {
  return BYBIT_SYMBOL_MAP[coinId.toLowerCase()] || coinId.toUpperCase();
}

// ── Crypto Icon CDN ──────────────────────────────────────────────────────
// Use jsDelivr CDN for coin logos (browser caches permanently)
function getCoinLogo(symbol: string, paprikaLogo?: string): string {
  const sym = symbol.toLowerCase();
  // Primary: CoinPaprika's own logo (high-res, always available)
  if (paprikaLogo) return paprikaLogo;
  // Fallback: jsDelivr crypto icons CDN
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym}.png`;
}

// ── CoinPaprika → CoinNova Market Format Mapper ──────────────────────────
function mapPaprikaTickerToMarket(t: any, reverseMap: Map<string, string>): any {
  const q = t.quotes?.USD || {};
  const shortId = resolveShortId(t.id, reverseMap);
  const sym = t.symbol?.toLowerCase() || "";

  return {
    id: shortId,
    symbol: sym,
    name: t.name || "",
    image: getCoinLogo(sym, `https://static.coinpaprika.com/coin/${t.id}/logo.png`),
    current_price: q.price || 0,
    market_cap: q.market_cap || 0,
    market_cap_rank: t.rank || 0,
    total_volume: q.volume_24h || 0,
    price_change_percentage_24h: q.percent_change_24h || 0,
    price_change_percentage_1h_in_currency: q.percent_change_1h || 0,
    price_change_percentage_7d_in_currency: q.percent_change_7d || 0,
    sparkline_in_7d: { price: [] }, // CoinPaprika free tier doesn't provide sparklines
    high_24h: q.price ? q.price * (1 + Math.abs(q.percent_change_24h || 0) / 100) : 0,
    low_24h: q.price ? q.price * (1 - Math.abs(q.percent_change_24h || 0) / 100) : 0,
  };
}

// ── ROUTES ────────────────────────────────────────────────────────────────

// GET /coins/markets — Main market list (replaces CoinGecko /coins/markets)
router.get("/markets", async (req, res) => {
  try {
    const { per_page = 50, page = 1, ids } = req.query;
    const perPage = Math.min(Number(per_page) || 50, 250);
    const pageNum = Number(page) || 1;

    const { forward, reverse } = await getPaprikaIdMap();

    const tickers: any[] = await fetchWithCache(
      "https://api.coinpaprika.com/v1/tickers?quotes=USD"
    );

    let mapped = tickers
      .filter((t: any) => t.rank > 0) // exclude unranked
      .sort((a: any, b: any) => a.rank - b.rank)
      .map((t: any) => mapPaprikaTickerToMarket(t, reverse));

    // Filter by IDs if provided (for Watchlist)
    if (ids) {
      const idSet = new Set(
        String(ids)
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
      );
      mapped = mapped.filter((c: any) =>
        idSet.has(c.id) || idSet.has(c.symbol)
      );
      // Also try resolving through paprika IDs for edge cases
      if (mapped.length < idSet.size) {
        const remainingIds = new Set([...idSet].filter(id =>
          !mapped.some((c: any) => c.id === id || c.symbol === id)
        ));
        if (remainingIds.size > 0) {
          const extraMatches = tickers
            .filter((t: any) => {
              const shortId = resolveShortId(t.id, reverse);
              return remainingIds.has(shortId) || remainingIds.has(t.symbol.toLowerCase());
            })
            .map((t: any) => mapPaprikaTickerToMarket(t, reverse));
          mapped = [...mapped, ...extraMatches];
        }
      }
      return res.json(mapped);
    }

    // Paginate
    const start = (pageNum - 1) * perPage;
    const paginated = mapped.slice(start, start + perPage);

    res.json(paginated);
  } catch (err: any) {
    console.error("Market data fetch failed:", err.message);
    res.status(500).json({ error: "Market data temporarily unavailable" });
  }
});

// GET /coins/trending — Top movers (computed from CoinPaprika tickers)
router.get("/trending", async (_req, res) => {
  try {
    const { reverse } = await getPaprikaIdMap();
    const tickers: any[] = await fetchWithCache(
      "https://api.coinpaprika.com/v1/tickers?quotes=USD"
    );

    // Get top 15 coins by absolute 24h % change (most volatile = trending)
    const ranked = tickers
      .filter((t: any) => t.rank > 0 && t.rank <= 200)
      .sort((a: any, b: any) =>
        Math.abs(b.quotes?.USD?.percent_change_24h || 0) -
        Math.abs(a.quotes?.USD?.percent_change_24h || 0)
      )
      .slice(0, 15);

    // Return in CoinGecko trending format for frontend compatibility
    const coins = ranked.map((t: any, idx: number) => {
      const shortId = resolveShortId(t.id, reverse);
      return {
        item: {
          id: shortId,
          coin_id: idx,
          name: t.name,
          symbol: t.symbol,
          market_cap_rank: t.rank,
          thumb: getCoinLogo(t.symbol.toLowerCase(), `https://static.coinpaprika.com/coin/${t.id}/logo.png`),
          small: getCoinLogo(t.symbol.toLowerCase(), `https://static.coinpaprika.com/coin/${t.id}/logo.png`),
          large: getCoinLogo(t.symbol.toLowerCase(), `https://static.coinpaprika.com/coin/${t.id}/logo.png`),
          slug: shortId,
          price_btc: 0,
          score: idx,
          data: {
            price: t.quotes?.USD?.price || 0,
            price_change_percentage_24h: {
              usd: t.quotes?.USD?.percent_change_24h || 0,
            },
          },
        },
      };
    });

    res.json({ coins });
  } catch (err: any) {
    console.warn("Trending fetch failed:", err.message);
    res.json({ coins: [] });
  }
});

// GET /coins/:id — Coin detail (CoinPaprika coins + tickers combined)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { forward, reverse } = await getPaprikaIdMap();
    const paprikaId = resolvePaprikaId(id, forward);

    // Fetch coin metadata + ticker in parallel
    const [coinData, tickerData] = await Promise.all([
      fetchWithCache(`https://api.coinpaprika.com/v1/coins/${paprikaId}`, 5 * 60 * 1000),
      fetchWithCache(`https://api.coinpaprika.com/v1/tickers/${paprikaId}?quotes=USD`),
    ]);

    const q = tickerData?.quotes?.USD || {};
    const logo = coinData?.logo || getCoinLogo(coinData?.symbol?.toLowerCase() || id);
    const shortId = resolveShortId(paprikaId, reverse);

    // Map to CoinNova/CoinGecko-compatible format
    const result = {
      id: shortId,
      symbol: (coinData?.symbol || tickerData?.symbol || "").toLowerCase(),
      name: coinData?.name || tickerData?.name || id,
      web_slug: shortId,
      asset_platform_id: null,
      market_cap_rank: coinData?.rank || tickerData?.rank || null,
      image: {
        thumb: logo,
        small: logo,
        large: logo,
      },
      description: {
        en: coinData?.description || `${coinData?.name || id} real-time market data powered by CoinPaprika.`,
      },
      market_data: {
        current_price: { usd: q.price || 0 },
        total_volume: { usd: q.volume_24h || 0 },
        market_cap: { usd: q.market_cap || 0 },
        circulating_supply: tickerData?.total_supply || 0,
        max_supply: tickerData?.max_supply || 0,
        price_change_percentage_24h: q.percent_change_24h || 0,
        price_change_percentage_7d: q.percent_change_7d || 0,
        price_change_percentage_30d: q.percent_change_30d || 0,
        ath: { usd: q.ath_price || 0 },
        atl: { usd: 0 }, // CoinPaprika doesn't provide ATL in free tier
        high_24h: { usd: q.price ? q.price * (1 + Math.abs(q.percent_change_24h || 0) / 200) : 0 },
        low_24h: { usd: q.price ? q.price * (1 - Math.abs(q.percent_change_24h || 0) / 200) : 0 },
        sparkline_7d: { price: [] },
      },
    };

    res.json(result);
  } catch (err: any) {
    console.error(`Coin detail fetch failed for ${id}:`, err.message);
    res.status(500).json({ error: err.message || "Failed to load coin details" });
  }
});

// GET /coins/:id/ohlc — Full OHLCV candlestick data for TradingView charts
router.get("/:id/ohlc", async (req, res) => {
  const { id } = req.params;
  const { interval = "D", limit = 200 } = req.query;

  try {
    const symbol = getBybitSymbol(id);
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;
    const numLimit = Math.min(Number(limit) || 200, 1000);

    // Validate interval (Bybit supports: 1,3,5,15,30,60,120,240,360,720,D,W,M)
    const validIntervals = ["1", "3", "5", "15", "30", "60", "120", "240", "360", "720", "D", "W", "M"];
    const intv = validIntervals.includes(String(interval)) ? String(interval) : "D";

    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${intv}&limit=${numLimit}`;

    // Shorter cache for small intervals, longer for daily+
    const cacheTtl = ["1", "3", "5"].includes(intv) ? 15_000 : ["15", "30", "60"].includes(intv) ? 30_000 : 60_000;
    const data = await fetchWithCache(url, cacheTtl);

    if (data?.retCode !== 0 || !data?.result?.list) {
      throw new Error(`Bybit returned error: ${data?.retMsg || "unknown"}`);
    }

    // Bybit kline format: [startTime, openPrice, highPrice, lowPrice, closePrice, volume, turnover]
    // Returns in DESCENDING order → reverse to ascending
    const klines: any[] = data.result.list;
    const ohlc = klines
      .map((k: any) => ({
        time: Math.floor(Number(k[0]) / 1000), // Lightweight Charts expects UNIX seconds
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }))
      .reverse();

    res.json({ ohlc, symbol: pair, interval: intv });
  } catch (err: any) {
    console.error(`OHLC fetch failed for ${id}:`, err.message);

    // Fallback: try Binance
    try {
      const symbol = getBybitSymbol(id);
      const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;
      const intv = String(interval);
      const binanceInterval = intv === "D" ? "1d" : intv === "W" ? "1w" : intv === "M" ? "1M" : `${intv}m`;
      const binanceRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binanceInterval}&limit=${Math.min(Number(limit) || 200, 1000)}`);
      if (binanceRes.ok) {
        const binanceKlines = await binanceRes.json() as any[];
        const ohlc = binanceKlines.map((k: any) => ({
          time: Math.floor(Number(k[0]) / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
        return res.json({ ohlc, symbol: pair, interval: intv });
      }
    } catch (_) {}

    res.status(500).json({ error: err.message || "Failed to load OHLC data" });
  }
});

// GET /coins/:id/chart — Historical chart (Bybit Spot Klines)
router.get("/:id/chart", async (req, res) => {
  const { id } = req.params;
  const { days = 7 } = req.query;
  const numDays = Number(days) || 7;

  try {
    const symbol = getBybitSymbol(id);
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;

    // Map days to appropriate Bybit interval + limit
    let interval: string;
    let limit: number;

    if (numDays <= 1) {
      interval = "60"; // 1-hour candles
      limit = 24;
    } else if (numDays <= 7) {
      interval = "240"; // 4-hour candles
      limit = 42;
    } else if (numDays <= 30) {
      interval = "D"; // daily candles
      limit = 30;
    } else if (numDays <= 90) {
      interval = "D";
      limit = 90;
    } else {
      interval = "D";
      limit = Math.min(numDays, 365);
    }

    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${interval}&limit=${limit}`;
    const data = await fetchWithCache(url, 60 * 1000);

    if (data?.retCode !== 0 || !data?.result?.list) {
      throw new Error(`Bybit returned error: ${data?.retMsg || "unknown"}`);
    }

    // Bybit returns klines in DESCENDING order → reverse to ascending
    const klines: any[] = data.result.list;
    const prices: [number, number][] = klines
      .map((k: any) => [Number(k[0]), parseFloat(k[4])] as [number, number])
      .reverse();

    res.json({ prices });
  } catch (err: any) {
    console.error(`Chart fetch failed for ${id}:`, err.message);
    // Fallback: try Binance direct
    try {
      const fallback = await fetchBinanceChartFallback(id, numDays);
      if (fallback) return res.json(fallback);
    } catch (_) {}
    res.status(500).json({ error: err.message || "Failed to load chart data" });
  }
});

// GET /coins/:id/history-range — For Trading Replay Mode (Bybit Klines)
router.get("/:id/history-range", async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  try {
    if (!from || !to) {
      res.status(400).json({ error: "from and to timestamps are required" });
      return;
    }

    const fromTs = Number(from) * 1000; // Convert UNIX seconds to ms
    const toTs = Number(to) * 1000;
    const days = Math.ceil((toTs - fromTs) / (24 * 3600 * 1000));

    const symbol = getBybitSymbol(id);
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;
    const interval = days <= 7 ? "240" : "D";
    const limit = Math.min(Math.max(days * (interval === "240" ? 6 : 1), 10), 1000);

    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${interval}&limit=${limit}&start=${fromTs}&end=${toTs}`;
    const data = await fetchWithCache(url, 60 * 1000);

    if (data?.retCode !== 0 || !data?.result?.list) {
      throw new Error(`Bybit returned error: ${data?.retMsg || "unknown"}`);
    }

    const klines: any[] = data.result.list;
    const prices: [number, number][] = klines
      .map((k: any) => [Number(k[0]), parseFloat(k[4])] as [number, number])
      .reverse();

    res.json({ prices });
  } catch (err: any) {
    console.error(`History-range fetch failed for ${id}:`, err.message);
    const days = Math.ceil((Number(to) - Number(from)) / (24 * 3600));
    try {
      const fallback = await fetchBinanceChartFallback(id, Math.max(days, 1));
      if (fallback) return res.json(fallback);
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// GET /coins/search/:query — Coin search (CoinPaprika)
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    const { reverse } = await getPaprikaIdMap();
    const url = `https://api.coinpaprika.com/v1/search?q=${encodeURIComponent(query)}&limit=20`;
    const data = await fetchWithCache(url, 2 * 60 * 1000);

    // Map to CoinGecko search format for frontend compatibility
    const coins = (data?.currencies || []).map((c: any) => {
      const shortId = resolveShortId(c.id, reverse);
      return {
        id: shortId,
        name: c.name,
        api_symbol: c.symbol?.toLowerCase(),
        symbol: c.symbol,
        market_cap_rank: c.rank,
        thumb: getCoinLogo(c.symbol?.toLowerCase() || "", `https://static.coinpaprika.com/coin/${c.id}/logo.png`),
        large: getCoinLogo(c.symbol?.toLowerCase() || "", `https://static.coinpaprika.com/coin/${c.id}/logo.png`),
      };
    });

    res.json({ coins });
  } catch (err: any) {
    res.json({ coins: [] });
  }
});

// GET /coins/global-stats — Global market overview
router.get("/global-stats", async (_req, res) => {
  try {
    const tickers: any[] = await fetchWithCache(
      "https://api.coinpaprika.com/v1/tickers?quotes=USD"
    );

    const ranked = tickers.filter((t: any) => t.rank > 0);
    const totalMarketCap = ranked.reduce((sum: number, t: any) => sum + (t.quotes?.USD?.market_cap || 0), 0);
    const totalVolume = ranked.reduce((sum: number, t: any) => sum + (t.quotes?.USD?.volume_24h || 0), 0);
    
    // BTC dominance
    const btc = ranked.find((t: any) => t.symbol === "BTC");
    const btcMarketCap = btc?.quotes?.USD?.market_cap || 0;
    const btcDominance = totalMarketCap > 0 ? (btcMarketCap / totalMarketCap) * 100 : 0;

    // ETH dominance
    const eth = ranked.find((t: any) => t.symbol === "ETH");
    const ethMarketCap = eth?.quotes?.USD?.market_cap || 0;
    const ethDominance = totalMarketCap > 0 ? (ethMarketCap / totalMarketCap) * 100 : 0;

    // Count active coins
    const activeCryptos = ranked.length;

    // Top gainers & losers (top 5 from rank <= 100)
    const top100 = ranked.filter((t: any) => t.rank <= 100);
    const { reverse } = await getPaprikaIdMap();
    
    const gainers = [...top100]
      .sort((a: any, b: any) => (b.quotes?.USD?.percent_change_24h || 0) - (a.quotes?.USD?.percent_change_24h || 0))
      .slice(0, 5)
      .map((t: any) => mapPaprikaTickerToMarket(t, reverse));

    const losers = [...top100]
      .sort((a: any, b: any) => (a.quotes?.USD?.percent_change_24h || 0) - (b.quotes?.USD?.percent_change_24h || 0))
      .slice(0, 5)
      .map((t: any) => mapPaprikaTickerToMarket(t, reverse));

    res.json({
      totalMarketCap,
      totalVolume,
      btcDominance: parseFloat(btcDominance.toFixed(1)),
      ethDominance: parseFloat(ethDominance.toFixed(1)),
      activeCryptos,
      gainers,
      losers,
    });
  } catch (err: any) {
    console.error("Global stats fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch global market stats" });
  }
});

// GET /coins/fear-greed — Fear & Greed Index
router.get("/fear-greed", async (_req, res) => {
  try {
    const data = await fetchWithCache(
      "https://api.alternative.me/fng/?limit=7&format=json",
      5 * 60 * 1000 // 5 min cache
    );

    if (!data?.data?.length) {
      return res.json({ value: 50, label: "Neutral", history: [] });
    }

    const latest = data.data[0];
    const history = data.data.map((d: any) => ({
      value: parseInt(d.value),
      label: d.value_classification,
      timestamp: parseInt(d.timestamp) * 1000,
    }));

    res.json({
      value: parseInt(latest.value),
      label: latest.value_classification,
      history,
    });
  } catch (err: any) {
    console.error("Fear & Greed fetch failed:", err.message);
    res.json({ value: 50, label: "Neutral", history: [] });
  }
});

// ── News Fetcher & Sentiment Analysis ─────────────────────────────────
interface CryptoNewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  source: string;
  publishedAt: number;
  sentiment: "bullish" | "bearish" | "neutral";
  relatedCoins: string[];
}

function cleanHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "--")
    .trim();
}

const BULLISH_WORDS = [
  "surge", "soar", "rally", "jump", "gain", "ath", "all-time high", "breakout",
  "approval", "inflow", "accumulate", "bull", "bullish", "bounce", "record",
  "partner", "launch", "adopt", "upgrade", "outperform", "milestone", "skyrocket"
];

const BEARISH_WORDS = [
  "crash", "plunge", "dump", "drop", "hack", "exploit", "ban", "sue", "lawsuit",
  "outflow", "fraud", "scam", "bear", "bearish", "sink", "liquidat", "loss",
  "down", "collapse", "decline", "warning", "penal", "stolen"
];

const KNOWN_COINS = [
  { symbol: "BTC", keywords: ["bitcoin", "btc"] },
  { symbol: "ETH", keywords: ["ethereum", "eth", "ether"] },
  { symbol: "SOL", keywords: ["solana", "sol"] },
  { symbol: "BNB", keywords: ["binance", "bnb"] },
  { symbol: "XRP", keywords: ["ripple", "xrp"] },
  { symbol: "DOGE", keywords: ["dogecoin", "doge"] },
  { symbol: "ADA", keywords: ["cardano", "ada"] },
  { symbol: "AVAX", keywords: ["avalanche", "avax"] },
  { symbol: "LINK", keywords: ["chainlink", "link"] },
  { symbol: "DOT", keywords: ["polkadot", "dot"] },
  { symbol: "MATIC", keywords: ["polygon", "matic"] },
  { symbol: "SHIB", keywords: ["shiba", "shib"] },
];

function analyzeSentiment(text: string): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  let bullCount = 0;
  let bearCount = 0;
  for (const w of BULLISH_WORDS) {
    if (lower.includes(w)) bullCount++;
  }
  for (const w of BEARISH_WORDS) {
    if (lower.includes(w)) bearCount++;
  }
  if (bullCount > bearCount) return "bullish";
  if (bearCount > bullCount) return "bearish";
  return "neutral";
}

function detectCoins(text: string): string[] {
  const lower = text.toLowerCase();
  const matched = new Set<string>();
  for (const coin of KNOWN_COINS) {
    for (const kw of coin.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      if (regex.test(lower)) {
        matched.add(coin.symbol);
        break;
      }
    }
  }
  return Array.from(matched);
}

async function fetchCryptoNews(): Promise<CryptoNewsItem[]> {
  const allNews: CryptoNewsItem[] = [];

  // 1. Fetch CoinTelegraph RSS
  try {
    const ctXml = await fetchTextWithCache("https://cointelegraph.com/rss", 5 * 60 * 1000);
    if (ctXml) {
      const items = ctXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s) || item.match(/<title>(.*?)<\/title>/s);
        const title = cleanHtml(titleMatch?.[1] || "");
        if (!title) continue;

        const linkMatch = item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s) || item.match(/<link>(.*?)<\/link>/s);
        const url = (linkMatch?.[1] || "").split("?")[0];

        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/s);
        const publishedAt = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();

        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s) || item.match(/<description>(.*?)<\/description>/s);
        const rawDesc = descMatch?.[1] || "";
        const imgMatch = rawDesc.match(/src="(https:\/\/[^">]+)"/);
        const imageUrl = imgMatch ? imgMatch[1] : "";
        const description = cleanHtml(rawDesc);

        const sentiment = analyzeSentiment(title + " " + description);
        const relatedCoins = detectCoins(title + " " + description);

        allNews.push({
          id: `ct-${Buffer.from(url || title).toString("base64").slice(0, 16)}`,
          title,
          description: description.slice(0, 240),
          url,
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600&auto=format&fit=crop&q=80",
          source: "CoinTelegraph",
          publishedAt,
          sentiment,
          relatedCoins,
        });
      }
    }
  } catch (err: any) {
    console.warn("CoinTelegraph RSS failed:", err.message);
  }

  // 2. Fetch Decrypt RSS
  try {
    const dcXml = await fetchTextWithCache("https://decrypt.co/feed", 5 * 60 * 1000);
    if (dcXml) {
      const items = dcXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s) || item.match(/<title>(.*?)<\/title>/s);
        const title = cleanHtml(titleMatch?.[1] || "");
        if (!title) continue;

        const linkMatch = item.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/s) || item.match(/<link>(.*?)<\/link>/s);
        const url = linkMatch?.[1] || "";

        const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/s);
        const publishedAt = dateMatch ? new Date(dateMatch[1]).getTime() : Date.now();

        const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s) || item.match(/<description>(.*?)<\/description>/s);
        const description = cleanHtml(descMatch?.[1] || "");

        const imgMatch = item.match(/url="(https:\/\/[^">]+)"/);
        const imageUrl = imgMatch ? imgMatch[1] : "";

        const sentiment = analyzeSentiment(title + " " + description);
        const relatedCoins = detectCoins(title + " " + description);

        allNews.push({
          id: `dc-${Buffer.from(url || title).toString("base64").slice(0, 16)}`,
          title,
          description: description.slice(0, 240),
          url,
          imageUrl: imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80",
          source: "Decrypt",
          publishedAt,
          sentiment,
          relatedCoins,
        });
      }
    }
  } catch (err: any) {
    console.warn("Decrypt RSS failed:", err.message);
  }

  return allNews.sort((a, b) => b.publishedAt - a.publishedAt);
}

// GET /coins/news — Crypto News Feed with Sentiment
router.get("/news", async (req, res) => {
  try {
    const { coin, category, limit = 30 } = req.query;
    const numLimit = Math.min(Number(limit) || 30, 50);

    const allArticles = await fetchCryptoNews();

    let filtered = allArticles;

    // Filter by coin (symbol or name)
    if (coin && typeof coin === "string" && coin !== "all") {
      const q = coin.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.relatedCoins.some((c) => c.toLowerCase() === q) ||
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    // Filter by category / sentiment
    if (category && typeof category === "string") {
      const cat = category.toLowerCase();
      if (cat === "bullish" || cat === "bearish") {
        filtered = filtered.filter((a) => a.sentiment === cat);
      }
    }

    res.json({
      news: filtered.slice(0, numLimit),
      total: filtered.length,
      sentimentSummary: {
        bullish: filtered.filter((a) => a.sentiment === "bullish").length,
        bearish: filtered.filter((a) => a.sentiment === "bearish").length,
        neutral: filtered.filter((a) => a.sentiment === "neutral").length,
      },
    });
  } catch (err: any) {
    console.error("News fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch crypto news" });
  }
});

// ── Binance Chart Fallback (backup for Bybit) ────────────────────────────
async function fetchBinanceChartFallback(coinId: string, days: number): Promise<{ prices: [number, number][] } | null> {
  try {
    const symbol = getBybitSymbol(coinId); // Reuse the same map
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;
    const limit = Math.min(Math.max(days || 7, 1), 365);
    const interval = limit <= 1 ? "1h" : "1d";

    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
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

export default router;
