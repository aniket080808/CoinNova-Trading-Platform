import { GlassCard } from "@/components/glass/GlassCard";
import { useMarkets, Coin } from "@/lib/coingecko";
import { Sparkline } from "@/components/charts/Sparkline";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

import { usePrices } from "@/lib/binance";

export default function Market() {
  const { data: coins = [], isLoading } = useMarkets(1);
  const { watchlist, toggleWatch } = useDemo();
  const { prices: livePrices } = usePrices();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"rank" | "gain" | "loss" | "vol">("rank");

  const list = useMemo(() => {
    let l = coins.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.symbol.toLowerCase().includes(q.toLowerCase()));
    if (sort === "gain") l = [...l].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
    if (sort === "loss") l = [...l].sort((a, b) => (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0));
    if (sort === "vol") l = [...l].sort((a, b) => b.total_volume - a.total_volume);
    return l;
  }, [coins, q, sort]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display font-bold">Market</h1>
        <p className="text-muted-foreground text-sm">Live data from CoinGecko · refreshed every minute</p>
      </div>

      <GlassCard className="p-4">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coins…" className="pl-9 bg-muted/30" />
          </div>
          <div className="flex gap-1 glass rounded-full p-1 text-xs">
            {(["rank", "gain", "loss", "vol"] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`px-3 py-1 rounded-full transition ${sort === s ? "bg-primary text-background" : "text-muted-foreground"}`}>
                {s === "rank" ? "Rank" : s === "gain" ? "Gainers" : s === "loss" ? "Losers" : "Volume"}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Coin</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">24h</div>
          <div className="col-span-2 text-right">Volume</div>
          <div className="col-span-2 text-right">7d</div>
        </div>
        <div className="divide-y divide-border/40">
          {isLoading && <div className="p-6 text-center text-muted-foreground">Loading markets…</div>}
          {list.map((c) => {
            const lp = livePrices[c.symbol.toLowerCase()];
            return (
              <div key={c.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-primary/5 transition group">
                <div className="hidden md:block col-span-1 text-xs text-muted-foreground">{c.market_cap_rank}</div>
                <div className="col-span-1 md:col-span-3 flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleWatch(c.id)} aria-label="watch">
                    <Star className={`w-4 h-4 ${watchlist.includes(c.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <Link to={`/coin/${c.id}`} className="flex items-center gap-2 min-w-0">
                    <img src={c.image} alt="" className="w-7 h-7 rounded-full" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{c.symbol}</div>
                    </div>
                  </Link>
                </div>
                <div className="col-span-1 md:col-span-2 text-right text-sm font-semibold">
                  <span className={lp ? "text-primary animate-pulse-subtle" : ""}>
                    {formatUSD(lp ?? c.current_price)}
                  </span>
                </div>
                <div className={`col-span-1 md:col-span-2 text-right text-xs ${(c.price_change_percentage_24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>{formatPct(c.price_change_percentage_24h ?? 0)}</div>
                <div className="hidden md:block col-span-2 text-right text-xs text-muted-foreground">${formatNum(c.total_volume / 1e6, 1)}M</div>
                <div className="hidden md:block col-span-2 h-10">
                  {c.sparkline_in_7d?.price && <Sparkline data={c.sparkline_in_7d.price} color={(c.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
