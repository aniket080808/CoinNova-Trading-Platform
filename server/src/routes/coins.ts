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

const COIN_METADATA: Record<string, { name: string; symbol: string; rank: number; supply: number; ath: number; atl: number; image: string; desc: string }> = {
  bitcoin: {
    name: "Bitcoin", symbol: "btc", rank: 1, supply: 19_750_000, ath: 73750, atl: 67.81,
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    desc: "Bitcoin is the first decentralized digital currency, enabling peer-to-peer transfers across the globe without intermediaries.",
  },
  ethereum: {
    name: "Ethereum", symbol: "eth", rank: 2, supply: 120_200_000, ath: 4891, atl: 0.42,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    desc: "Ethereum is a decentralized open-source blockchain featuring smart contract functionality, powering decentralized finance (DeFi) and Web3.",
  },
  tether: {
    name: "Tether", symbol: "usdt", rank: 3, supply: 118_000_000_000, ath: 1.32, atl: 0.57,
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    desc: "Tether (USDT) is a fiat-collateralized stablecoin pegged 1:1 to the US dollar, providing liquidity and stability in cryptocurrency markets.",
  },
  binancecoin: {
    name: "BNB", symbol: "bnb", rank: 4, supply: 145_000_000, ath: 720.67, atl: 0.096,
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    desc: "BNB powers the BNB Chain ecosystem, providing utility for discounted fees, governance, and decentralized applications.",
  },
  solana: {
    name: "Solana", symbol: "sol", rank: 5, supply: 468_000_000, ath: 260.06, atl: 0.505,
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    desc: "Solana is a high-performance blockchain supporting builders around the world to build crypto apps that scale today.",
  },
  ripple: {
    name: "XRP", symbol: "xrp", rank: 6, supply: 56_000_000_000, ath: 3.84, atl: 0.0028,
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    desc: "XRP is a digital asset built for payments, offering financial institutions a reliable, on-demand option for cross-border transactions.",
  },
  dogecoin: {
    name: "Dogecoin", symbol: "doge", rank: 7, supply: 146_000_000_000, ath: 0.737, atl: 0.000085,
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    desc: "Dogecoin is an open-source peer-to-peer cryptocurrency that utilizes blockchain technology and features a Shiba Inu on its logo.",
  },
  cardano: {
    name: "Cardano", symbol: "ada", rank: 8, supply: 35_700_000_000, ath: 3.10, atl: 0.017,
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    desc: "Cardano is a proof-of-stake blockchain platform that says its goal is to allow changemakers, innovators and visionaries to bring about positive global change.",
  },
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

// Fallback: synthesize coin detail from Binance 24h ticker + metadata
async function fetchBinanceCoinFallback(coinId: string): Promise<any | null> {
  try {
    const symbol = COIN_SYMBOL_MAP[coinId.toLowerCase()] || coinId.toUpperCase();
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;

    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, { headers: HEADERS });
    if (!res.ok) return null;

    const ticker = await res.json() as any;
    const meta = COIN_METADATA[coinId.toLowerCase()] || {
      name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
      symbol: symbol.toLowerCase(),
      rank: 50,
      supply: 1_000_000,
      ath: parseFloat(ticker.highPrice || "100") * 1.5,
      atl: parseFloat(ticker.lowPrice || "1") * 0.1,
      image: `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`,
      desc: `${coinId} cryptocurrency traded on major global exchanges.`,
    };

    const currentPrice = parseFloat(ticker.lastPrice || "0");
    const change24h = parseFloat(ticker.priceChangePercent || "0");
    const totalVolume = parseFloat(ticker.quoteVolume || "0");
    const marketCap = currentPrice * meta.supply;

    return {
      id: coinId,
      symbol: meta.symbol,
      name: meta.name,
      web_slug: coinId,
      asset_platform_id: null,
      market_cap_rank: meta.rank,
      image: {
        thumb: meta.image,
        small: meta.image,
        large: meta.image,
      },
      description: {
        en: meta.desc,
      },
      market_data: {
        current_price: { usd: currentPrice },
        total_volume: { usd: totalVolume },
        market_cap: { usd: marketCap },
        circulating_supply: meta.supply,
        price_change_percentage_24h: change24h,
        price_change_percentage_7d: change24h,
        ath: { usd: meta.ath },
        atl: { usd: meta.atl },
        high_24h: { usd: parseFloat(ticker.highPrice || String(currentPrice)) },
        low_24h: { usd: parseFloat(ticker.lowPrice || String(currentPrice)) },
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
    res.json(data);
  } catch (err: any) {
    // If upstream fails and no cached markets, return fallback markets for top coins
    console.warn("CoinGecko markets failed, checking for cached or synthesized fallback:", err.message);
    const cachedAny = Array.from(cache.entries()).find(([k]) => k.includes("/coins/markets"));
    if (cachedAny) {
      return res.json(cachedAny[1].data);
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
