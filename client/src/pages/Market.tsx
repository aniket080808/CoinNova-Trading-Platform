import { GlassCard } from "@/components/glass/GlassCard";
import { useMarkets, useGlobalStats, useFearGreed, useTrending, Coin } from "@/lib/coingecko";
import { Sparkline } from "@/components/charts/Sparkline";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { Input } from "@/components/ui/input";
import {
  Star, Search, TrendingUp, TrendingDown, Globe, Activity,
  BarChart3, Flame, ArrowUpRight, ArrowDownRight, ChevronRight, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { usePrices } from "@/lib/binance";
import { motion, AnimatePresence } from "framer-motion";

// ─── Category definitions ────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: Globe },
  { id: "defi", label: "DeFi", icon: Zap },
  { id: "layer1", label: "Layer 1", icon: Activity },
  { id: "meme", label: "Meme", icon: Flame },
  { id: "gaming", label: "Gaming", icon: BarChart3 },
] as const;

const CATEGORY_COINS: Record<string, string[]> = {
  defi: ["uniswap", "aave", "maker", "compound", "curve-dao-token", "lido-dao", "pancakeswap", "sushi", "1inch", "yearn-finance", "synthetix", "compound-governance-token", "chainlink", "the-graph"],
  layer1: ["bitcoin", "ethereum", "solana", "cardano", "polkadot", "avalanche", "avalanche-2", "near", "cosmos", "algorand", "fantom", "aptos", "sui", "tron", "internet-computer", "stellar", "hedera", "sei", "celestia"],
  meme: ["dogecoin", "shiba-inu", "pepe", "floki-inu", "bonk", "dogwifhat", "memecoin", "brett", "mog-coin"],
  gaming: ["the-sandbox", "axie-infinity", "decentraland", "gala", "enjincoin", "immutable-x", "illuvium", "render-token", "render"],
};

type SortKey = "rank" | "gain" | "loss" | "vol" | "cap";

// ─── Helper: format large numbers ─────────────────────────
function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${formatNum(n)}`;
}

// ─── Fear & Greed Gauge ────────────────────────────────────
function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const getColor = (v: number) => {
    if (v <= 25) return { color: "hsl(0, 84%, 60%)", text: "text-red-400", bg: "bg-red-500/10" };
    if (v <= 45) return { color: "hsl(25, 95%, 53%)", text: "text-orange-400", bg: "bg-orange-500/10" };
    if (v <= 55) return { color: "hsl(48, 96%, 53%)", text: "text-yellow-400", bg: "bg-yellow-500/10" };
    if (v <= 75) return { color: "hsl(142, 76%, 56%)", text: "text-emerald-400", bg: "bg-emerald-500/10" };
    return { color: "hsl(142, 90%, 45%)", text: "text-green-400", bg: "bg-green-500/10" };
  };

  const { color, text, bg } = getColor(value);
  const rotation = (value / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <GlassCard className="p-4 flex flex-col items-center gap-2 relative overflow-hidden">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Fear & Greed</div>
      <div className="relative w-24 h-14">
        {/* Gauge arc background */}
        <svg viewBox="0 0 100 55" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(0, 84%, 60%)" />
              <stop offset="25%" stopColor="hsl(25, 95%, 53%)" />
              <stop offset="50%" stopColor="hsl(48, 96%, 53%)" />
              <stop offset="75%" stopColor="hsl(142, 76%, 56%)" />
              <stop offset="100%" stopColor="hsl(142, 90%, 45%)" />
            </linearGradient>
          </defs>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(224, 30%, 18%)" strokeWidth="6" strokeLinecap="round" />
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 126} 126`} />
          {/* Needle */}
          <line x1="50" y1="50" x2="50" y2="16"
            stroke={color} strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${rotation}, 50, 50)`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          <circle cx="50" cy="50" r="3" fill={color} />
        </svg>
      </div>
      <div className="text-center -mt-1">
        <div className={`text-2xl font-bold ${text}`} style={{ textShadow: `0 0 20px ${color}` }}>{value}</div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${bg} ${text}`}>{label}</div>
      </div>
    </GlassCard>
  );
}

// ─── Global Stats Ticker Bar ────────────────────────────────
function GlobalStatsBar() {
  const { data: stats } = useGlobalStats();
  const { data: fearGreed } = useFearGreed();

  if (!stats) return null;

  const items = [
    { label: "Market Cap", value: formatLargeNumber(stats.totalMarketCap), icon: Globe },
    { label: "24h Volume", value: formatLargeNumber(stats.totalVolume), icon: BarChart3 },
    { label: "BTC Dominance", value: `${stats.btcDominance}%`, icon: Activity },
    { label: "ETH Dominance", value: `${stats.ethDominance}%`, icon: Activity },
    { label: "Active Coins", value: stats.activeCryptos.toLocaleString(), icon: Flame },
  ];

  return (
    <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-6 overflow-x-auto scrollbar-hide text-xs">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 shrink-0">
          <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{item.label}:</span>
          <span className="font-semibold text-foreground">{item.value}</span>
        </div>
      ))}
      {fearGreed && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground">Fear & Greed:</span>
          <span className={`font-bold ${fearGreed.value <= 30 ? "text-red-400" : fearGreed.value >= 70 ? "text-emerald-400" : "text-yellow-400"}`}>
            {fearGreed.value} — {fearGreed.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Mini Coin Card (for Gainers/Losers) ────────────────────
function MiniCoinCard({ coin, rank }: { coin: Coin; rank: number }) {
  const isPositive = (coin.price_change_percentage_24h ?? 0) >= 0;

  return (
    <Link to={`/coin/${coin.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-primary/5 transition-all cursor-pointer group min-w-0"
      >
        <div className="text-xs font-bold text-muted-foreground w-5">{rank}</div>
        <img src={coin.image} alt="" className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{coin.name}</div>
          <div className="text-[10px] text-muted-foreground uppercase">{coin.symbol}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold">{formatUSD(coin.current_price)}</div>
          <div className={`text-xs font-medium flex items-center justify-end gap-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {formatPct(coin.price_change_percentage_24h ?? 0)}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Trending Coin Pill ───────────────────────────────────────
function TrendingPill({ item }: { item: any }) {
  const change = item.data?.price_change_percentage_24h?.usd ?? 0;
  const isPositive = change >= 0;

  return (
    <Link to={`/coin/${item.id}`}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="glass rounded-full px-4 py-2 flex items-center gap-2.5 hover:bg-primary/5 transition-all cursor-pointer shrink-0"
      >
        <img src={item.thumb} alt="" className="w-6 h-6 rounded-full" />
        <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
        <span className="text-xs text-muted-foreground uppercase">{item.symbol}</span>
        <span className={`text-xs font-semibold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {formatPct(change)}
        </span>
      </motion.div>
    </Link>
  );
}

// ─── Main Market Page ────────────────────────────────────────
export default function Market() {
  const { data: coins = [], isLoading } = useMarkets(1);
  const { data: stats } = useGlobalStats();
  const { data: fearGreed } = useFearGreed();
  const { data: trendingData } = useTrending();
  const { watchlist, toggleWatch } = useDemo();
  const { prices: livePrices } = usePrices();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");
  const [category, setCategory] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const trendingCoins = trendingData?.coins?.map((c: any) => c.item) ?? [];

  const list = useMemo(() => {
    let l = [...coins];

    // Category filter
    if (category !== "all") {
      const categoryIds = CATEGORY_COINS[category] || [];
      if (categoryIds.length > 0) {
        l = l.filter((c) => categoryIds.includes(c.id) || categoryIds.includes(c.symbol.toLowerCase()));
      }
    }

    // Search filter
    if (q) {
      const query = q.toLowerCase();
      l = l.filter((c) =>
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sort) {
      case "gain": l.sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)); break;
      case "loss": l.sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0)); break;
      case "vol": l.sort((a, b) => b.total_volume - a.total_volume); break;
      case "cap": l.sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0)); break;
      default: l.sort((a, b) => a.market_cap_rank - b.market_cap_rank);
    }

    return l;
  }, [coins, q, sort, category]);

  const displayedList = showAll ? list : list.slice(0, 50);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold">Market</h1>
        <p className="text-muted-foreground text-sm">Live market data · refreshed every minute</p>
      </div>

      {/* Global Stats Ticker */}
      <GlobalStatsBar />

      {/* Top Section: Fear & Greed + Gainers + Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Fear & Greed */}
        {fearGreed && (
          <div className="lg:col-span-2">
            <FearGreedGauge value={fearGreed.value} label={fearGreed.label} />
          </div>
        )}

        {/* Top Gainers */}
        <div className={`${fearGreed ? "lg:col-span-5" : "lg:col-span-6"}`}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold">Top Gainers</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">24h</span>
            </div>
            <div className="space-y-2">
              {(stats?.gainers ?? []).slice(0, 4).map((c, i) => (
                <MiniCoinCard key={c.id} coin={c} rank={i + 1} />
              ))}
              {!stats && <div className="text-center text-muted-foreground text-xs py-4">Loading...</div>}
            </div>
          </GlassCard>
        </div>

        {/* Top Losers */}
        <div className={`${fearGreed ? "lg:col-span-5" : "lg:col-span-6"}`}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
              <h2 className="text-sm font-semibold">Top Losers</h2>
              <span className="text-[10px] text-muted-foreground ml-auto">24h</span>
            </div>
            <div className="space-y-2">
              {(stats?.losers ?? []).slice(0, 4).map((c, i) => (
                <MiniCoinCard key={c.id} coin={c} rank={i + 1} />
              ))}
              {!stats && <div className="text-center text-muted-foreground text-xs py-4">Loading...</div>}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Trending Coins */}
      {trendingCoins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold">Trending</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {trendingCoins.slice(0, 10).map((item: any) => (
              <TrendingPill key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Search + Category Tabs + Sort */}
      <GlassCard className="p-4">
        <div className="flex gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, symbol, or ID…"
              className="pl-9 bg-muted/30"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 glass rounded-full p-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  category === cat.id
                    ? "bg-primary text-background font-semibold shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-1 glass rounded-full p-1 text-xs">
            {([
              { key: "rank", label: "Rank" },
              { key: "gain", label: "Gainers" },
              { key: "loss", label: "Losers" },
              { key: "vol", label: "Volume" },
              { key: "cap", label: "MCap" },
            ] as { key: SortKey; label: string }[]).map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  sort === s.key
                    ? "bg-secondary/80 text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Coin Table */}
      <GlassCard className="p-0 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/40 font-medium">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Coin</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-1 text-right">1h</div>
          <div className="col-span-1 text-right">24h</div>
          <div className="col-span-2 text-right">Volume (24h)</div>
          <div className="col-span-2 text-right">7d Chart</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/40">
          {isLoading && (
            <div className="p-8 text-center text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading markets…
              </div>
            </div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No coins found for "{q || category}"
            </div>
          )}
          <AnimatePresence>
            {displayedList.map((c, idx) => {
              const lp = livePrices[c.symbol.toLowerCase()];
              const change1h = c.price_change_percentage_1h_in_currency ?? 0;
              const change24h = c.price_change_percentage_24h ?? 0;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx < 20 ? idx * 0.02 : 0 }}
                  className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-primary/5 transition-all group"
                >
                  {/* Rank */}
                  <div className="hidden md:block col-span-1 text-xs text-muted-foreground">{c.market_cap_rank}</div>

                  {/* Coin Info */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-3 min-w-0">
                    <button onClick={() => toggleWatch(c.id)} aria-label="Toggle watchlist" className="shrink-0">
                      <Star className={`w-4 h-4 transition-all ${watchlist.includes(c.id) ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary/60"}`} />
                    </button>
                    <Link to={`/coin/${c.id}`} className="flex items-center gap-2 min-w-0 group/link">
                      <img src={c.image} alt="" className="w-7 h-7 rounded-full shrink-0" loading="lazy" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate group-hover/link:text-primary transition-colors">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{c.symbol}</div>
                      </div>
                    </Link>
                  </div>

                  {/* Price */}
                  <div className="col-span-1 md:col-span-2 text-right text-sm font-semibold">
                    <span className={lp ? "text-primary" : ""}>
                      {formatUSD(lp ?? c.current_price)}
                    </span>
                  </div>

                  {/* 1h Change */}
                  <div className={`hidden md:block col-span-1 text-right text-xs font-medium ${change1h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPct(change1h)}
                  </div>

                  {/* 24h Change */}
                  <div className={`col-span-1 md:col-span-1 text-right text-xs font-medium ${change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    <span className={`inline-flex items-center gap-0.5 ${change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"} px-1.5 py-0.5 rounded-md`}>
                      {change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatPct(change24h)}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="hidden md:block col-span-2 text-right text-xs text-muted-foreground">
                    ${formatNum(c.total_volume / 1e6, 1)}M
                  </div>

                  {/* 7d Sparkline */}
                  <div className="hidden md:block col-span-2 h-10">
                    {c.sparkline_in_7d?.price?.length ? (
                      <Sparkline
                        data={c.sparkline_in_7d.price}
                        color={(c.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "hsl(142, 76%, 56%)" : "hsl(0, 84%, 65%)"}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/50">—</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Show More / Load More */}
        {!showAll && list.length > 50 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-3 text-sm text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1 border-t border-border/40"
          >
            Show all {list.length} coins
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </GlassCard>

      {/* Results count */}
      <div className="text-center text-xs text-muted-foreground pb-4">
        Showing {displayedList.length} of {list.length} coins
        {category !== "all" && ` in ${CATEGORIES.find(c => c.id === category)?.label}`}
      </div>
    </div>
  );
}
