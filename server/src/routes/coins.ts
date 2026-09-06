import { Router } from "express";

const router = Router();

const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
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
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  uniswap: "UNI",
  litecoin: "LTC",
  shiba: "SHIB",
  "shiba-inu": "SHIB",
  near: "NEAR",
  cosmos: "ATOM",
  aptos: "APT",
  pepe: "PEPE",
  sui: "SUI",
};

interface CoinMeta {
  name: string;
  symbol: string;
  rank: number;
  supply: number;
  basePrice: number;
  ath: number;
  atl: number;
  image: string;
  desc: string;
}

const COIN_METADATA: Record<string, CoinMeta> = {
  bitcoin: {
    name: "Bitcoin", symbol: "btc", rank: 1, supply: 19_750_000, basePrice: 85000, ath: 99000, atl: 67.81,
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    desc: "Bitcoin is the first decentralized digital currency, enabling peer-to-peer transfers across the globe without intermediaries.",
  },
  ethereum: {
    name: "Ethereum", symbol: "eth", rank: 2, supply: 120_200_000, basePrice: 2800, ath: 4891, atl: 0.42,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    desc: "Ethereum is a decentralized open-source blockchain featuring smart contract functionality, powering decentralized finance (DeFi) and Web3.",
  },
  tether: {
    name: "Tether", symbol: "usdt", rank: 3, supply: 118_000_000_000, basePrice: 1.0, ath: 1.32, atl: 0.57,
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    desc: "Tether (USDT) is a fiat-collateralized stablecoin pegged 1:1 to the US dollar, providing liquidity and stability in cryptocurrency markets.",
  },
  binancecoin: {
    name: "BNB", symbol: "bnb", rank: 4, supply: 145_000_000, basePrice: 610, ath: 720.67, atl: 0.096,
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    desc: "BNB powers the BNB Chain ecosystem, providing utility for discounted fees, governance, and decentralized applications.",
  },
  solana: {
    name: "Solana", symbol: "sol", rank: 5, supply: 468_000_000, basePrice: 185, ath: 260.06, atl: 0.505,
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    desc: "Solana is a high-performance blockchain supporting builders around the world to build crypto apps that scale today.",
  },
  ripple: {
    name: "XRP", symbol: "xrp", rank: 6, supply: 56_000_000_000, basePrice: 1.85, ath: 3.84, atl: 0.0028,
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    desc: "XRP is a digital asset built for payments, offering financial institutions a reliable, on-demand option for cross-border transactions.",
  },
  dogecoin: {
    name: "Dogecoin", symbol: "doge", rank: 7, supply: 146_000_000_000, basePrice: 0.28, ath: 0.737, atl: 0.000085,
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    desc: "Dogecoin is an open-source peer-to-peer cryptocurrency that utilizes blockchain technology and features a Shiba Inu on its logo.",
  },
  cardano: {
    name: "Cardano", symbol: "ada", rank: 8, supply: 35_700_000_000, basePrice: 0.75, ath: 3.10, atl: 0.017,
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    desc: "Cardano is a proof-of-stake blockchain platform designed to bring about positive global change.",
  },
  avalanche: {
    name: "Avalanche", symbol: "avax", rank: 9, supply: 400_000_000, basePrice: 32, ath: 146.22, atl: 2.79,
    image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    desc: "Avalanche is a smart contracts platform built to scale infinitely and finalize transactions in under a second.",
  },
  "avalanche-2": {
    name: "Avalanche", symbol: "avax", rank: 9, supply: 400_000_000, basePrice: 32, ath: 146.22, atl: 2.79,
    image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    desc: "Avalanche is a smart contracts platform built to scale infinitely and finalize transactions in under a second.",
  },
  sui: {
    name: "Sui", symbol: "sui", rank: 10, supply: 2_800_000_000, basePrice: 3.20, ath: 3.92, atl: 0.36,
    image: "https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
    desc: "Sui is an innovative Layer 1 blockchain offering high-throughput, low-latency execution.",
  },
  chainlink: {
    name: "Chainlink", symbol: "link", rank: 11, supply: 608_000_000, basePrice: 18.5, ath: 52.88, atl: 0.126,
    image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    desc: "Chainlink is the industry-standard decentralized computing platform powered by real-world data and cross-chain computation.",
  },
  polkadot: {
    name: "Polkadot", symbol: "dot", rank: 12, supply: 1_400_000_000, basePrice: 6.8, ath: 55.00, atl: 2.69,
    image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",
    desc: "Polkadot connects and secures a network of specialized blockchains, facilitating cross-chain transfer of any data or asset.",
  },
  "shiba-inu": {
    name: "Shiba Inu", symbol: "shib", rank: 13, supply: 589_000_000_000_000, basePrice: 0.000022, ath: 0.000088, atl: 0.000000000056,
    image: "https://assets.coingecko.com/coins/images/11939/large/shiba.png",
    desc: "Shiba Inu token is a decentralized, community-led currency held by millions across the globe.",
  },
  "matic-network": {
    name: "Polygon", symbol: "matic", rank: 14, supply: 10_000_000_000, basePrice: 0.48, ath: 2.92, atl: 0.003,
    image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
    desc: "Polygon is a decentralized Ethereum scaling platform that enables developers to build scalable user-friendly DApps.",
  },
  near: {
    name: "NEAR Protocol", symbol: "near", rank: 15, supply: 1_200_000_000, basePrice: 5.5, ath: 20.42, atl: 0.52,
    image: "https://assets.coingecko.com/coins/images/10365/large/near.png",
    desc: "NEAR Protocol is a fully sharded, proof-of-stake Layer 1 blockchain designed for usability and scalability.",
  },
  litecoin: {
    name: "Litecoin", symbol: "ltc", rank: 16, supply: 75_000_000, basePrice: 95, ath: 412.96, atl: 1.11,
    image: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",
    desc: "Litecoin is a peer-to-peer Internet currency that enables instant, near-zero cost payments to anyone in the world.",
  },
  uniswap: {
    name: "Uniswap", symbol: "uni", rank: 17, supply: 600_000_000, basePrice: 9.8, ath: 44.97, atl: 0.419,
    image: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    desc: "Uniswap is a popular decentralized trading protocol known for its role in facilitating automated trading of decentralized finance tokens.",
  },
  tron: {
    name: "TRON", symbol: "trx", rank: 18, supply: 86_000_000_000, basePrice: 0.22, ath: 0.30, atl: 0.001,
    image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",
    desc: "TRON is a dedicated blockchain protocol striving to build the infrastructure for a truly decentralized Internet.",
  },
};

function getStaticSeedMarkets(): any[] {
  return Object.entries(COIN_METADATA).map(([id, meta]) => {
    const price = meta.basePrice;
    const change24h = (Math.sin(meta.rank) * 4.5);
    return {
      id,
      symbol: meta.symbol,
      name: meta.name,
      image: meta.image,
      current_price: price,
      market_cap: price * meta.supply,
      market_cap_rank: meta.rank,
      total_volume: price * 40_000,
      price_change_percentage_24h: Number(change24h.toFixed(2)),
      price_change_percentage_1h_in_currency: Number((change24h * 0.1).toFixed(2)),
      price_change_percentage_7d_in_currency: Number((change24h * 1.5).toFixed(2)),
      sparkline_in_7d: {
        price: [
          price * 0.97, price * 0.98, price * 0.96, price * 1.01, price * 0.99, price * 1.02, price
        ],
      },
    };
  }).sort((a, b) => a.market_cap_rank - b.market_cap_rank);
}

function generateSyntheticChart(coinId: string, days: number): { prices: [number, number][] } {
  const meta = COIN_METADATA[coinId.toLowerCase()] || COIN_METADATA.bitcoin;
  const currentPrice = meta.basePrice;
  const points = Math.min(Math.max(days * 24, 24), 200);
  const now = Date.now();
  const stepMs = (days * 24 * 3600 * 1000) / points;

  const prices: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const time = now - (points - 1 - i) * stepMs;
    const factor = 1 + Math.sin(i / 5) * 0.04 + ((i - points / 2) / points) * 0.02;
    prices.push([time, parseFloat((currentPrice * factor).toFixed(currentPrice < 1 ? 6 : 2))]);
  }
  return { prices };
}

async function fetchWithCache(url: string): Promise<any> {
  const cached = cache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timeout);

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
      console.warn(`[CoinGecko Error] Serving stale cache:`, err.message);
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const klines = await res.json() as any[];
    if (!Array.isArray(klines) || klines.length === 0) return null;

    const prices: [number, number][] = klines.map((k) => [
      Number(k[0]),
      parseFloat(k[4]),
    ]);

    return { prices };
  } catch (err) {
    return null;
  }
}

// Fallback: fetch multi-coin markets from Binance
async function fetchBinanceMarketsFallback(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);

    const tickers = await res.json() as any[];
    const tickerMap = new Map<string, any>();
    if (Array.isArray(tickers)) {
      for (const t of tickers) {
        if (t.symbol && t.symbol.endsWith("USDT")) {
          const base = t.symbol.slice(0, -4).toLowerCase();
          tickerMap.set(base, t);
        }
      }
    }

    const markets = Object.entries(COIN_METADATA).map(([id, meta]) => {
      const ticker = tickerMap.get(meta.symbol.toLowerCase());
      const currentPrice = ticker ? parseFloat(ticker.lastPrice || "0") : meta.basePrice;
      const priceChange24h = ticker ? parseFloat(ticker.priceChangePercent || "0") : 0;
      const totalVolume = ticker ? parseFloat(ticker.quoteVolume || "0") : (currentPrice * 50_000);
      const marketCap = currentPrice * meta.supply;

      return {
        id,
        symbol: meta.symbol,
        name: meta.name,
        image: meta.image,
        current_price: currentPrice,
        market_cap: marketCap,
        market_cap_rank: meta.rank,
        total_volume: totalVolume,
        price_change_percentage_24h: priceChange24h,
        price_change_percentage_1h_in_currency: Number((priceChange24h * 0.08).toFixed(2)),
        price_change_percentage_7d_in_currency: Number((priceChange24h * 1.2).toFixed(2)),
        sparkline_in_7d: {
          price: [
            currentPrice * 0.97,
            currentPrice * 0.98,
            currentPrice * 0.96,
            currentPrice * 1.01,
            currentPrice * 0.99,
            currentPrice * 1.02,
            currentPrice,
          ],
        },
      };
    });

    markets.sort((a, b) => a.market_cap_rank - b.market_cap_rank);
    return markets;
  } catch (err: any) {
    console.warn("Binance markets fallback error, using seed markets:", err.message);
    return getStaticSeedMarkets();
  }
}

// Fallback: synthesize coin detail from Binance 24h ticker + metadata
async function fetchBinanceCoinFallback(coinId: string): Promise<any> {
  const meta = COIN_METADATA[coinId.toLowerCase()] || {
    name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
    symbol: (COIN_SYMBOL_MAP[coinId.toLowerCase()] || coinId).toLowerCase(),
    rank: 20,
    supply: 1_000_000,
    basePrice: 10,
    ath: 50,
    atl: 1,
    image: `https://assets.coingecko.com/coins/images/1/large/${coinId}.png`,
    desc: `${coinId} cryptocurrency actively traded on global markets.`,
  };

  try {
    const symbol = COIN_SYMBOL_MAP[coinId.toLowerCase()] || coinId.toUpperCase();
    const pair = symbol === "USDT" ? "USDCUSDT" : `${symbol}USDT`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`, {
      headers: HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const ticker = res.ok ? (await res.json() as any) : null;
    const currentPrice = ticker ? parseFloat(ticker.lastPrice || String(meta.basePrice)) : meta.basePrice;
    const change24h = ticker ? parseFloat(ticker.priceChangePercent || "0") : 0;
    const totalVolume = ticker ? parseFloat(ticker.quoteVolume || "0") : (currentPrice * 25000);
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
        ath: { usd: Math.max(meta.ath, currentPrice * 1.2) },
        atl: { usd: meta.atl },
        high_24h: { usd: ticker ? parseFloat(ticker.highPrice) : currentPrice * 1.05 },
        low_24h: { usd: ticker ? parseFloat(ticker.lowPrice) : currentPrice * 0.95 },
        sparkline_7d: { price: [currentPrice * 0.97, currentPrice * 0.99, currentPrice * 1.01, currentPrice] },
      },
    };
  } catch {
    return {
      id: coinId,
      symbol: meta.symbol,
      name: meta.name,
      web_slug: coinId,
      asset_platform_id: null,
      market_cap_rank: meta.rank,
      image: { thumb: meta.image, small: meta.image, large: meta.image },
      description: { en: meta.desc },
      market_data: {
        current_price: { usd: meta.basePrice },
        total_volume: { usd: meta.basePrice * 10000 },
        market_cap: { usd: meta.basePrice * meta.supply },
        circulating_supply: meta.supply,
        price_change_percentage_24h: 1.2,
        price_change_percentage_7d: 2.5,
        ath: { usd: meta.ath },
        atl: { usd: meta.atl },
        high_24h: { usd: meta.basePrice * 1.05 },
        low_24h: { usd: meta.basePrice * 0.95 },
        sparkline_7d: { price: [] },
      },
    };
  }
}

// ─── ROUTES ──────────────────────────────────────────────

router.get("/markets", async (req, res) => {
  const { vs_currency = "usd", per_page = 50, page = 1, ids, sparkline = "true", price_change_percentage = "1h,24h,7d" } = req.query;
  let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=${sparkline}&price_change_percentage=${price_change_percentage}`;
  if (ids) url += `&ids=${ids}`;

  // 1. Try CoinGecko with active cache
  try {
    const data = await fetchWithCache(url);
    if (Array.isArray(data) && data.length > 0) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn("CoinGecko markets upstream failed:", err.message);
  }

  // 2. Check any cached markets in memory
  const cachedAny = Array.from(cache.entries()).find(([k]) => k.includes("/coins/markets"));
  if (cachedAny && Array.isArray(cachedAny[1].data) && cachedAny[1].data.length > 0) {
    return res.json(cachedAny[1].data);
  }

  // 3. Fallback to Binance live ticker markets
  console.log("Serving markets from Binance fallback");
  const fallback = await fetchBinanceMarketsFallback();
  cache.set(url, { data: fallback, expiry: Date.now() + CACHE_TTL });
  return res.json(fallback);
});

router.get("/trending", async (req, res) => {
  try {
    const data = await fetchWithCache("https://api.coingecko.com/api/v3/search/trending");
    if (data && Array.isArray(data.coins) && data.coins.length > 0) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn("CoinGecko trending upstream error:", err.message);
  }

  const cachedAny = Array.from(cache.entries()).find(([k]) => k.includes("/search/trending"));
  if (cachedAny) return res.json(cachedAny[1].data);

  const trendingCoins = [
    { item: { id: "bitcoin", coin_id: 1, name: "Bitcoin", symbol: "BTC", market_cap_rank: 1, thumb: COIN_METADATA.bitcoin.image, small: COIN_METADATA.bitcoin.image, large: COIN_METADATA.bitcoin.image, score: 0 } },
    { item: { id: "solana", coin_id: 4128, name: "Solana", symbol: "SOL", market_cap_rank: 5, thumb: COIN_METADATA.solana.image, small: COIN_METADATA.solana.image, large: COIN_METADATA.solana.image, score: 1 } },
    { item: { id: "ethereum", coin_id: 279, name: "Ethereum", symbol: "ETH", market_cap_rank: 2, thumb: COIN_METADATA.ethereum.image, small: COIN_METADATA.ethereum.image, large: COIN_METADATA.ethereum.image, score: 2 } },
    { item: { id: "sui", coin_id: 26375, name: "Sui", symbol: "SUI", market_cap_rank: 10, thumb: COIN_METADATA.sui.image, small: COIN_METADATA.sui.image, large: COIN_METADATA.sui.image, score: 3 } },
  ];
  return res.json({ coins: trendingCoins });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`;
    const data = await fetchWithCache(url);
    if (data && data.id) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn(`CoinGecko /coins/${id} failed:`, err.message);
  }

  const fallback = await fetchBinanceCoinFallback(id);
  return res.json(fallback);
});

router.get("/:id/chart", async (req, res) => {
  const { id } = req.params;
  const { days = 7, vs_currency = "usd" } = req.query;
  const daysNum = Number(days) || 7;
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs_currency}&days=${days}&sparkline=true`;

  try {
    const data = await fetchWithCache(url);
    if (data && Array.isArray(data.prices) && data.prices.length > 0) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn(`CoinGecko chart for ${id} failed:`, err.message);
  }

  const fallback = await fetchBinanceChartFallback(id, daysNum);
  if (fallback && fallback.prices.length > 0) {
    cache.set(url, { data: fallback, expiry: Date.now() + CACHE_TTL });
    return res.json(fallback);
  }

  return res.json(generateSyntheticChart(id, daysNum));
});

// GET /coins/:id/history-range — for Trading Replay Mode
router.get("/:id/history-range", async (req, res) => {
  const { id } = req.params;
  const { from, to, vs_currency = "usd" } = req.query;
  if (!from || !to) {
    res.status(400).json({ error: "from and to timestamps are required" });
    return;
  }
  const days = Math.max(Math.ceil((Number(to) - Number(from)) / (24 * 3600)), 1);
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=${vs_currency}&from=${from}&to=${to}`;

  try {
    const data = await fetchWithCache(url);
    if (data && Array.isArray(data.prices) && data.prices.length > 0) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn(`CoinGecko history-range for ${id} failed:`, err.message);
  }

  const fallback = await fetchBinanceChartFallback(id, days);
  if (fallback && fallback.prices.length > 0) {
    return res.json(fallback);
  }

  return res.json(generateSyntheticChart(id, days));
});

// GET /coins/search — coin search by query
router.get("/search/:query", async (req, res) => {
  const { query } = req.params;
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const data = await fetchWithCache(url);
    if (data && Array.isArray(data.coins)) {
      return res.json(data);
    }
  } catch (err: any) {
    console.warn("CoinGecko search upstream error:", err.message);
  }

  const q = query.toLowerCase();
  const matched = Object.entries(COIN_METADATA)
    .filter(([id, m]) => id.includes(q) || m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q))
    .map(([id, m]) => ({
      id,
      name: m.name,
      api_symbol: m.symbol,
      symbol: m.symbol.toUpperCase(),
      market_cap_rank: m.rank,
      thumb: m.image,
      large: m.image,
    }));

  res.json({ coins: matched });
});

export default router;
