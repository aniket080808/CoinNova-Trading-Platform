import { useParams, Link } from "react-router-dom";
import { useCoin, useChart, useMarkets } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { TradeDialog } from "@/components/trade/TradeDialog";
import { RiskBadge, riskFor } from "@/components/ai/RiskBadge";
import { Star, ArrowLeft, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState, useEffect } from "react";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";

import { usePrices } from "@/lib/binance";

export default function CoinDetail() {
  const { id = "" } = useParams();
  const { data: coin } = useCoin(id);
  const { prices: livePrices } = usePrices();
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const { data: chart } = useChart(id, days);
  const { data: markets = [] } = useMarkets(1);
  const market = markets.find((m) => m.id === id);
  const { watchlist, toggleWatch, mode } = useDemo();

  const currentPrice = useMemo(() => {
    if (!coin) return 0;
    return livePrices[coin.symbol.toLowerCase()] ?? coin.market_data?.current_price?.usd ?? 0;
  }, [coin, livePrices]);

  const handleToggleWatch = async () => {
    try {
      await toggleWatch(id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update watchlist");
    }
  };

  // AI Risk Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<{
    level: "low" | "medium" | "high";
    factors: string[];
    recommendation: string;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const data = useMemo(
    () => (chart?.prices ?? []).map(([t, p]) => ({ t, p, label: new Date(t).toLocaleDateString() })),
    [chart]
  );

  const runAnalysis = async () => {
    if (!coin || analyzing) return;
    setAnalyzing(true);
    try {
      const price = currentPrice;
      const ch24 = coin.market_data?.price_change_percentage_24h;
      const mcap = coin.market_data?.market_cap?.usd;
      const res = await aiApi.risk(id, coin.name, price, ch24, mcap);
      setAiAnalysis(res);
    } catch (err: any) {
      toast.error("AI analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!coin) return <div className="text-center py-20 text-muted-foreground">Loading coin…</div>;

  const price = coin.market_data?.current_price?.usd ?? 0;
  const ch24 = coin.market_data?.price_change_percentage_24h ?? 0;
  const vol = Math.abs(ch24) + Math.abs(coin.market_data?.price_change_percentage_7d ?? 0);
  const risk = riskFor(vol);

  const m = market ?? ({
    id, symbol: coin.symbol, name: coin.name, image: coin.image?.large,
    current_price: price, market_cap: coin.market_data?.market_cap?.usd ?? 0,
    market_cap_rank: coin.market_cap_rank, total_volume: 0, price_change_percentage_24h: ch24,
  } as any);

  return (
    <div className="space-y-5">
      <Link to="/market" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> Market</Link>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <img src={coin.image?.large} alt={coin.name} className="w-14 h-14 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold">{coin.name}</h1>
                <Badge variant="outline" className="uppercase">{coin.symbol}</Badge>
                {coin.market_cap_rank && <Badge variant="outline">#{coin.market_cap_rank}</Badge>}
                <RiskBadge level={aiAnalysis?.level || risk} />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <div className="text-3xl font-display font-bold">
                  <span className={livePrices[coin.symbol.toLowerCase()] ? "text-primary animate-pulse-subtle" : ""}>
                    {formatUSD(currentPrice)}
                  </span>
                </div>
                <div className={`text-sm ${ch24 >= 0 ? "text-primary" : "text-destructive"}`}>{formatPct(ch24)}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleToggleWatch} className="glass rounded-xl px-4 flex items-center gap-2 border border-border/40 hover:border-primary/40 transition">
                <Star className={`w-4 h-4 ${watchlist.includes(id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Watch</span>
              </button>
              <TradeDialog coin={{ ...m, current_price: currentPrice }} trigger={<Button className="bg-gradient-neon text-background shadow-glow-primary">Trade</Button>} />
            </div>
          </div>

          <div className="flex gap-2">
            {([7, 30, 90, 365] as const).map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "outline"} className={days === d ? "bg-primary text-background" : "glass"} onClick={() => setDays(d)}>
                {d === 365 ? "1Y" : `${d}D`}
              </Button>
            ))}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  formatter={(v: any) => formatUSD(v)}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="p" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-primary" /> Nova insight</div>
              {mode === "live" && (
                <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase tracking-wider" onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : "Refresh analysis"}
                </Button>
              )}
            </div>

            {aiAnalysis ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">AI Rating:</span>
                  <Badge className={aiAnalysis.level === 'low' ? 'bg-primary' : aiAnalysis.level === 'high' ? 'bg-destructive' : 'bg-warning'}>
                    {aiAnalysis.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Key Factors
                  </div>
                  <ul className="text-xs space-y-1">
                    {aiAnalysis.factors.map((f, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Recommendation</div>
                  <p className="text-xs italic">"{aiAnalysis.recommendation}"</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {coin.name} is showing {Math.abs(ch24).toFixed(1)}% movement in 24h. Risk profile: <b className="text-foreground">{risk}</b>.
                {risk === "low" && " Suitable as a core holding in a diversified portfolio."}
                {risk === "medium" && " Consider as a satellite position (5–10%)."}
                {risk === "high" && " High volatility — use small position sizing."}
                {mode === "live" && " Tap 'Refresh' for a deep AI analysis."}
              </p>
            )}
          </GlassCard>

          <GlassCard className="space-y-2 text-sm">
            <Stat k="Market cap" v={formatUSD(coin.market_data?.market_cap?.usd ?? 0, { maximumFractionDigits: 0 })} />
            <Stat k="24h volume" v={formatUSD(coin.market_data?.total_volume?.usd ?? 0, { maximumFractionDigits: 0 })} />
            <Stat k="Circulating" v={`${formatNum(coin.market_data?.circulating_supply ?? 0, 0)} ${coin.symbol.toUpperCase()}`} />
            <Stat k="ATH" v={formatUSD(coin.market_data?.ath?.usd ?? 0)} />
            <Stat k="ATL" v={formatUSD(coin.market_data?.atl?.usd ?? 0)} />
          </GlassCard>
        </div>
      </div>

      {coin.description?.en && (
        <GlassCard>
          <h3 className="font-semibold mb-2">About {coin.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-6" dangerouslySetInnerHTML={{ __html: coin.description.en.split(". ").slice(0, 4).join(". ") }} />
        </GlassCard>
      )}
    </div>
  );
}

const Stat = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between border-b border-border/40 py-1.5 last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
);
