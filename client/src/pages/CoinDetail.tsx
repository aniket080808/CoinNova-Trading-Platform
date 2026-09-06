import { useParams, Link } from "react-router-dom";
import { useCoin, useChart, useMarkets } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { TradeDialog } from "@/components/trade/TradeDialog";
import { RiskBadge, riskFor } from "@/components/ai/RiskBadge";
import { Star, ArrowLeft, Sparkles, Loader2, AlertCircle, BarChart3, TrendingUp, Newspaper } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo, useState, useEffect } from "react";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { CryptoNewsFeed } from "@/components/news/CryptoNewsFeed";
import { OrderBook } from "@/components/trade/OrderBook";
import { LiveTradeTape } from "@/components/trade/LiveTradeTape";
import { useMarketDepth } from "@/hooks/useMarketDepth";

import { usePrices } from "@/lib/binance";

export default function CoinDetail() {
  const { id = "" } = useParams();
  const { data: coin, isLoading, isError, refetch } = useCoin(id);
  const { prices: livePrices } = usePrices();
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const { data: chart } = useChart(id, days);
  const { data: markets = [] } = useMarkets(1);
  const market = markets.find((m) => m.id === id);
  const { watchlist, toggleWatch, mode } = useDemo();

  const displayCoin = useMemo(() => {
    if (coin) return coin;
    if (market) {
      return {
        id,
        symbol: market.symbol,
        name: market.name,
        image: { large: market.image },
        market_cap_rank: market.market_cap_rank,
        market_data: {
          current_price: { usd: market.current_price },
          price_change_percentage_24h: market.price_change_percentage_24h,
          market_cap: { usd: market.market_cap },
          total_volume: { usd: market.total_volume },
          circulating_supply: 0,
          ath: { usd: 0 },
          atl: { usd: 0 },
        },
        description: { en: "" },
      };
    }
    return null;
  }, [coin, market, id]);

  const currentPrice = useMemo(() => {
    if (!displayCoin) return 0;
    return livePrices[displayCoin.symbol.toLowerCase()] ?? displayCoin.market_data?.current_price?.usd ?? 0;
  }, [displayCoin, livePrices]);

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

  // Market Depth & Live Trade Tape
  const { orderBook, trades: liveMarketTrades, isLive: depthIsLive } = useMarketDepth({
    coinId: id,
    symbol: displayCoin?.symbol || "",
  });
  const [selectedLimitPrice, setSelectedLimitPrice] = useState<number | undefined>(undefined);
  const [limitTradeOpen, setLimitTradeOpen] = useState(false);

  const data = useMemo(
    () =>
      (chart?.prices ?? [])
        .filter((item): item is [number, number] => Array.isArray(item) && Number.isFinite(item[0]) && Number.isFinite(item[1]))
        .map(([t, p]) => ({ t, p, label: new Date(t).toLocaleDateString() })),
    [chart]
  );

  const lineChartDomain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 100];
    const prices = data.map((d) => d.p).filter((p) => Number.isFinite(p));
    if (prices.length === 0) return [0, 100];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
    if (min === max) {
      return [Math.max(0, min * 0.95), max * 1.05 || 100];
    }
    const pad = (max - min) * 0.05;
    return [Math.max(0, min - pad), max + pad];
  }, [data]);

  const runAnalysis = async () => {
    if (!displayCoin || analyzing) return;
    setAnalyzing(true);
    try {
      const price = currentPrice;
      const ch24 = displayCoin.market_data?.price_change_percentage_24h;
      const mcap = displayCoin.market_data?.market_cap?.usd;
      const res = await aiApi.risk(id, displayCoin.name, price, ch24, mcap);
      setAiAnalysis(res);
    } catch (err: any) {
      toast.error("AI analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!displayCoin) {
    if (isError) {
      return (
        <div className="py-20 max-w-md mx-auto text-center space-y-4">
          <GlassCard className="p-8 space-y-4">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">Failed to load coin data</h2>
            <p className="text-sm text-muted-foreground">We could not retrieve live metrics for this coin right now. Please try again.</p>
            <Button onClick={() => refetch()} className="bg-primary text-background">
              Retry Loading
            </Button>
            <div>
              <Link to="/market" className="text-xs text-muted-foreground hover:underline">
                Back to Market
              </Link>
            </div>
          </GlassCard>
        </div>
      );
    }
    return (
      <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span>Loading coin details…</span>
      </div>
    );
  }

  const price = displayCoin.market_data?.current_price?.usd ?? 0;
  const ch24 = displayCoin.market_data?.price_change_percentage_24h ?? 0;
  const vol = Math.abs(ch24) + Math.abs(displayCoin.market_data?.price_change_percentage_7d ?? 0);
  const risk = riskFor(vol);

  const m = market ?? ({
    id, symbol: displayCoin.symbol, name: displayCoin.name, image: displayCoin.image?.large,
    current_price: price, market_cap: displayCoin.market_data?.market_cap?.usd ?? 0,
    market_cap_rank: displayCoin.market_cap_rank, total_volume: 0, price_change_percentage_24h: ch24,
  } as any);

  return (
    <div className="space-y-5">
      <Link to="/market" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="w-4 h-4" /> Market</Link>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <img src={displayCoin.image?.large} alt={displayCoin.name} className="w-14 h-14 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-display font-bold">{displayCoin.name}</h1>
                <Badge variant="outline" className="uppercase">{displayCoin.symbol}</Badge>
                {displayCoin.market_cap_rank && <Badge variant="outline">#{displayCoin.market_cap_rank}</Badge>}
                <RiskBadge level={aiAnalysis?.level || risk} />
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <div className="text-3xl font-display font-bold">
                  <span className={livePrices[displayCoin.symbol.toLowerCase()] ? "text-primary animate-pulse-subtle" : ""}>
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

          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-border/40">
            <div className="flex items-center gap-1 glass p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setChartType("candle")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                  chartType === "candle"
                    ? "bg-primary text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Candlesticks
              </button>
              <button
                onClick={() => setChartType("line")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                  chartType === "line"
                    ? "bg-primary text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Line
              </button>
            </div>

            {chartType === "line" && (
              <div className="flex gap-1.5">
                {([7, 30, 90, 365] as const).map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={days === d ? "default" : "outline"}
                    className={`h-7 text-xs px-2.5 ${days === d ? "bg-primary text-background" : "glass"}`}
                    onClick={() => setDays(d)}
                  >
                    {d === 365 ? "1Y" : `${d}D`}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {chartType === "candle" ? (
            <CandlestickChart coinId={id} defaultInterval="D" />
          ) : (
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
                  <YAxis domain={lineChartDomain} hide />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                    formatter={(v: any) => formatUSD(v)}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area type="monotone" dataKey="p" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
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
                {displayCoin.name} is showing {Math.abs(ch24).toFixed(1)}% movement in 24h. Risk profile: <b className="text-foreground">{risk}</b>.
                {risk === "low" && " Suitable as a core holding in a diversified portfolio."}
                {risk === "medium" && " Consider as a satellite position (5–10%)."}
                {risk === "high" && " High volatility — use small position sizing."}
                {mode === "live" && " Tap 'Refresh' for a deep AI analysis."}
              </p>
            )}
          </GlassCard>

          <GlassCard className="space-y-2 text-sm">
            <Stat k="Market cap" v={formatUSD(displayCoin.market_data?.market_cap?.usd ?? 0, { maximumFractionDigits: 0 })} />
            <Stat k="24h volume" v={formatUSD(displayCoin.market_data?.total_volume?.usd ?? 0, { maximumFractionDigits: 0 })} />
            <Stat k="Circulating" v={`${formatNum(displayCoin.market_data?.circulating_supply ?? 0, 0)} ${displayCoin.symbol.toUpperCase()}`} />
            <Stat k="ATH" v={formatUSD(displayCoin.market_data?.ath?.usd ?? 0)} />
            <Stat k="ATL" v={formatUSD(displayCoin.market_data?.atl?.usd ?? 0)} />
          </GlassCard>
        </div>
      </div>

      {/* ── Real-Time Order Book & Live Public Trades ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OrderBook
          orderBook={orderBook}
          isLive={depthIsLive}
          symbol={displayCoin.symbol}
          onSelectPrice={(price) => {
            setSelectedLimitPrice(price);
            setLimitTradeOpen(true);
          }}
        />
        <LiveTradeTape
          trades={liveMarketTrades}
          symbol={displayCoin.symbol}
          isLive={depthIsLive}
        />
      </div>

      {/* Pre-filled Limit Order Trade Modal triggered by clicking Order Book price */}
      {limitTradeOpen && (
        <TradeDialog
          coin={{ ...m, current_price: currentPrice }}
          initialTargetPrice={selectedLimitPrice}
          initialOrderType="limit"
          open={limitTradeOpen}
          onOpenChange={setLimitTradeOpen}
        />
      )}

      {displayCoin.description?.en && (
        <GlassCard>
          <h3 className="font-semibold mb-2">About {displayCoin.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-6" dangerouslySetInnerHTML={{ __html: displayCoin.description.en.split(". ").slice(0, 4).join(". ") }} />
        </GlassCard>
      )}

      {/* Live Coin News & Sentiment */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Newspaper className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold">{displayCoin.name} News & Sentiment</h3>
        </div>
        <CryptoNewsFeed coinSymbol={displayCoin.symbol} coinName={displayCoin.name} limit={12} />
      </div>
    </div>
  );
}


const Stat = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between border-b border-border/40 py-1.5 last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
);
