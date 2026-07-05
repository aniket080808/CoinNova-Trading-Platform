import { GlassCard } from "@/components/glass/GlassCard";
import { useMarkets, useCoinsByIds, Coin } from "@/lib/coingecko";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { Sparkline } from "@/components/charts/Sparkline";
import { TradeDialog } from "@/components/trade/TradeDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Flame, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";

import { usePrices } from "@/lib/binance";

export default function Dashboard() {
  const { walletUSD, holdings, transactions, mode } = useDemo();
  const { prices: livePrices } = usePrices();
  const { data: markets = [] } = useMarkets(1);
  const ids = holdings.map((h) => h.coinId);
  const { data: held = [] } = useCoinsByIds(ids);

  const portfolioValue = useMemo(() => {
    return holdings.reduce((sum, h) => {
      const c = held.find((x) => x.id === h.coinId);
      const lp = livePrices[h.symbol.toLowerCase()];
      return sum + (lp ?? c?.current_price ?? h.avgPrice) * h.amount;
    }, 0);
  }, [holdings, held, livePrices]);

  const costBasis = holdings.reduce((s, h) => s + h.avgPrice * h.amount, 0);
  const pl = portfolioValue - costBasis;
  const plPct = costBasis ? (pl / costBasis) * 100 : 0;

  const sorted = [...markets].sort((a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0));
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();
  const trending = [...markets].sort((a, b) => b.total_volume - a.total_volume).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back ✨</div>
          <h1 className="text-3xl font-display font-bold">Your portfolio</h1>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary capitalize">{mode} mode</Badge>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Wallet balance" value={formatUSD(walletUSD)} icon={<Wallet className="w-4 h-4" />} accent />
        <StatCard label="Portfolio value" value={formatUSD(portfolioValue)} icon={<Sparkles className="w-4 h-4" />} />
        <StatCard
          label="Total P/L"
          value={formatUSD(pl)}
          sub={formatPct(plPct)}
          good={pl >= 0}
          icon={pl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        />
        <StatCard label="Net worth" value={formatUSD(walletUSD + portfolioValue)} icon={<Flame className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top markets</h3>
            <Button asChild variant="ghost" size="sm"><Link to="/market">View all</Link></Button>
          </div>
          <div className="space-y-2">
            {markets.slice(0, 6).map((c) => <CoinRow key={c.id} c={c} />)}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-4">Recent activity</h3>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet — try buying a coin.</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === "buy" ? "bg-primary/15 text-primary" : t.type === "sell" ? "bg-destructive/15 text-destructive" : "bg-secondary/15 text-secondary"}`}>
                    {t.type === "buy" ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize truncate">{t.type} {t.symbol?.toUpperCase() ?? ""}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatUSD(t.total)}</div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <Panel title="Top gainers (24h)" icon={<TrendingUp className="w-4 h-4 text-primary" />} coins={gainers} />
        <Panel title="Top losers (24h)" icon={<TrendingDown className="w-4 h-4 text-destructive" />} coins={losers} />
        <Panel title="Volume leaders" icon={<Flame className="w-4 h-4 text-warning" />} coins={trending} />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: boolean;
  good?: boolean;
}

const StatCard = ({ label, value, sub, icon, accent, good }: StatCardProps) => (
  <GlassCard hover className={`relative ${accent ? "neon-border" : ""}`}>
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
      <span>{label}</span>
      <span className={accent ? "text-primary" : ""}>{icon}</span>
    </div>
    <div className="text-2xl font-display font-bold">{value}</div>
    {sub !== undefined && <div className={`text-xs mt-1 ${good ? "text-primary" : "text-destructive"}`}>{sub}</div>}
  </GlassCard>
);

const CoinRow = ({ c }: { c: Coin }) => {
  const { prices } = usePrices();
  const lp = prices[c.symbol.toLowerCase()];
  return (
    <Link to={`/coin/${c.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/5 transition">
      <img src={c.image} className="w-8 h-8 rounded-full" alt="" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{c.name}</div>
        <div className="text-[10px] text-muted-foreground uppercase">{c.symbol}</div>
      </div>
      <div className="hidden sm:block w-24 h-8">
        {c.sparkline_in_7d?.price && <Sparkline data={c.sparkline_in_7d.price} color={(c.price_change_percentage_24h ?? 0) >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />}
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold">
          <span className={lp ? "text-primary animate-pulse-subtle" : ""}>
            {formatUSD(lp ?? c.current_price)}
          </span>
        </div>
        <div className={`text-[10px] ${(c.price_change_percentage_24h ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>{formatPct(c.price_change_percentage_24h ?? 0)}</div>
      </div>
    </Link>
  );
};

const Panel = ({ title, icon, coins }: { title: string; icon: any; coins: Coin[] }) => (
  <GlassCard>
    <div className="flex items-center gap-2 mb-3"><span>{icon}</span><h3 className="font-semibold text-sm">{title}</h3></div>
    <div className="space-y-2">{coins.map((c) => <CoinRow key={c.id} c={c} />)}</div>
  </GlassCard>
);
