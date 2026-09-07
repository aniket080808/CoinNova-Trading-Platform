import { useState, useMemo } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatUSD } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { Link } from "react-router-dom";
import {
  Calculator, Sparkles, TrendingUp, Shield, Bot, ArrowRight,
  DollarSign, CheckCircle2, Award
} from "lucide-react";

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  estMultiplier: number;
  riskRating: "Low" | "Moderate" | "High";
  riskColor: string;
  aiComment: string;
}

const CRYPTOS: CryptoOption[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
    estMultiplier: 1.45,
    riskRating: "Low",
    riskColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    aiComment: "Macro digital gold. Sustained institutional ETF inflows make BTC ideal as 40–50% core demo holding."
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    estMultiplier: 1.68,
    riskRating: "Moderate",
    riskColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    aiComment: "Smart contract dominance. Layer 2 scaling upgrades drive yield utility and capital efficiency."
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
    estMultiplier: 2.15,
    riskRating: "Moderate",
    riskColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    aiComment: "High-throughput retail leader. High DEX velocity delivers explosive trend momentum."
  },
  {
    id: "pepe",
    name: "Pepe",
    symbol: "PEPE",
    icon: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.png",
    estMultiplier: 2.80,
    riskRating: "High",
    riskColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    aiComment: "High-beta meme asset. Sharp rallies paired with rapid drawdowns — strict stop-losses advised."
  }
];

export function ProfitCalculator() {
  const { currency, rate } = useCurrencyStore();
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption>(CRYPTOS[0]);
  const [capital, setCapital] = useState<number>(2000);
  const [months, setMonths] = useState<number>(6);

  const durationMultiplier = useMemo(() => {
    if (months === 3) return 0.65;
    if (months === 6) return 1.0;
    return 1.85; // 12 months
  }, [months]);

  const estimatedGrowth = useMemo(() => {
    const rawGain = (selectedCrypto.estMultiplier - 1) * durationMultiplier;
    const profit = capital * rawGain;
    const total = capital + profit;
    const percentage = rawGain * 100;
    return {
      profit: Math.round(profit),
      total: Math.round(total),
      percentage: Math.round(percentage)
    };
  }, [capital, durationMultiplier, selectedCrypto.estMultiplier]);

  const formatMoney = (usd: number) => {
    if (currency === "INR") {
      return `₹${(usd * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return formatUSD(usd);
  };

  return (
    <GlassCard glow className="p-6 sm:p-10 border-primary/25 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <div className="grid lg:grid-cols-12 gap-8 items-center">
        {/* Left: Interactive Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1.5">
              <Calculator className="w-3.5 h-3.5" /> Interactive ROI Simulator
            </Badge>
            <h3 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-foreground">
              Calculate your <span className="text-gradient">practice potential</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Explore how strategic asset allocation across different market cycles affects simulated portfolio returns — powered by Nova AI risk models.
            </p>
          </div>

          {/* Asset Selector Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Crypto Asset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CRYPTOS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCrypto(c)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selectedCrypto.id === c.id
                      ? "bg-primary/15 border-primary shadow-glow-primary/25 text-foreground font-bold"
                      : "bg-background/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <img src={c.icon} alt={c.name} className="w-5 h-5 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{c.symbol}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{c.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Capital Slider */}
          <div className="space-y-2 p-4 rounded-2xl bg-background/50 border border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Simulated Allocation
              </span>
              <span className="text-lg font-mono font-extrabold text-foreground">
                {formatMoney(capital)}
              </span>
            </div>

            <Slider
              value={[capital]}
              min={200}
              max={10000}
              step={100}
              onValueChange={(val) => setCapital(val[0])}
              className="py-2 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
              <span>{formatMoney(200)}</span>
              <span>{formatMoney(5000)}</span>
              <span>{formatMoney(10000)}</span>
            </div>
          </div>

          {/* Timeframe selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Holding Horizon
            </label>
            <div className="flex items-center gap-2">
              {[
                { label: "3 Months", val: 3 },
                { label: "6 Months", val: 6 },
                { label: "12 Months (1 Year)", val: 12 }
              ].map((t) => (
                <button
                  key={t.val}
                  onClick={() => setMonths(t.val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                    months === t.val
                      ? "bg-primary/20 border-primary/50 text-primary font-bold shadow-glow-primary/20"
                      : "bg-background/40 border-border/50 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Projected Outcome & Nova AI Diagnosis */}
        <div className="lg:col-span-5">
          <div className="p-6 rounded-3xl bg-card/90 border border-primary/30 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Simulated Projection
              </span>
              <Badge className={`border text-xs px-2.5 py-0.5 font-bold ${selectedCrypto.riskColor}`}>
                <Shield className="w-3 h-3 mr-1 inline" /> {selectedCrypto.riskRating} Risk
              </Badge>
            </div>

            {/* Total Value */}
            <div>
              <div className="text-xs text-muted-foreground">Estimated Projected Value</div>
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-foreground mt-1">
                {formatMoney(estimatedGrowth.total)}
              </div>
              <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 inline" /> +{formatMoney(estimatedGrowth.profit)} ({estimatedGrowth.percentage > 0 ? `+${estimatedGrowth.percentage}%` : `${estimatedGrowth.percentage}%`})
              </div>
            </div>

            {/* Nova AI Insight Box */}
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Bot className="w-4 h-4" /> Nova AI Analysis
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                "{selectedCrypto.aiComment}"
              </p>
            </div>

            {/* Direct CTA */}
            <Button asChild size="lg" className="w-full bg-gradient-neon text-background shadow-glow-primary h-12 font-bold text-sm">
              <Link to="/register">
                Trade with $100,000 Demo Funds <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>

            <div className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Instant setup • No deposit or credit card required
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
