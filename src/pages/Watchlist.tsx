import { GlassCard } from "@/components/glass/GlassCard";
import { useCoinsByIds } from "@/lib/coingecko";
import { useDemo, formatUSD, formatPct } from "@/store/demo";
import { Sparkline } from "@/components/charts/Sparkline";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Watchlist() {
  const { watchlist, toggleWatch } = useDemo();
  const { data: coins = [], isLoading } = useCoinsByIds(watchlist);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-display font-bold">Watchlist</h1>

      {watchlist.length === 0 ? (
        <GlassCard className="text-center py-14 space-y-3">
          <Star className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Your watchlist is empty. Tap ⭐ on any coin to add it.</p>
          <Button asChild className="bg-gradient-neon text-background"><Link to="/market">Browse market</Link></Button>
        </GlassCard>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="divide-y divide-border/40">
            {isLoading && <div className="p-6 text-center text-muted-foreground">Loading…</div>}
            {coins.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-primary/5 transition">
                <button onClick={() => toggleWatch(c.id)}><Star className="w-4 h-4 fill-primary text-primary" /></button>
                <Link to={`/coin/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={c.image} className="w-9 h-9 rounded-full" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{c.symbol}</div>
                  </div>
                </Link>
                <div className="hidden sm:block w-24 h-9">
                  {c.sparkline_in_7d?.price && <Sparkline data={c.sparkline_in_7d.price} color={(c.price_change_percentage_24h ?? 0) >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />}
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatUSD(c.current_price)}</div>
                  <div className={`text-xs ${(c.price_change_percentage_24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatPct(c.price_change_percentage_24h ?? 0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
