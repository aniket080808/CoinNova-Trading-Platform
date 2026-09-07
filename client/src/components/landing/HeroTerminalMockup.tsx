import { useState, useMemo } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { formatUSD, formatPct } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, ArrowRight, Zap, CheckCircle2,
  Sparkles, RefreshCw, Layers, ShieldCheck
} from "lucide-react";

interface CoinSample {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  icon: string;
}

const SAMPLE_COINS: CoinSample[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", price: 79530.00, change24h: 3.45, icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", price: 2497.80, change24h: 1.82, icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { id: "solana", name: "Solana", symbol: "SOL", price: 148.60, change24h: 6.20, icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png" }
];

export function HeroTerminalMockup({ onGetStarted }: { onGetStarted?: () => void }) {
  const { currency, rate } = useCurrencyStore();
  const [selectedCoin, setSelectedCoin] = useState<CoinSample>(SAMPLE_COINS[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amountUSD, setAmountUSD] = useState<number>(2500);
  const [simulatedBalance, setSimulatedBalance] = useState<number>(100000);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const coinQty = useMemo(() => {
    return (amountUSD / selectedCoin.price).toFixed(4);
  }, [amountUSD, selectedCoin.price]);

  const handleExecute = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setOrderCount((prev) => prev + 1);
      
      const newBal = side === "buy" ? simulatedBalance - amountUSD : simulatedBalance + amountUSD;
      setSimulatedBalance(newBal);

      toast.success(
        `Order Filled: Simulated ${side.toUpperCase()} of ${coinQty} ${selectedCoin.symbol} @ ${formatUSD(selectedCoin.price)}!`,
        { description: "Virtual balance updated. Zero financial risk demo active." }
      );
    }, 400);
  };

  const displayPrice = currency === "INR" ? `₹${(selectedCoin.price * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : formatUSD(selectedCoin.price);

  return (
    <div className="relative group">
      {/* Outer ambient radiant glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-90 transition duration-700 -z-10" />

      <GlassCard glow className="p-5 sm:p-6 space-y-4 border-primary/25 shadow-2xl backdrop-blur-2xl rounded-3xl">
        {/* Header with Coin Selector & Live Status */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/50 border border-border/60">
            {SAMPLE_COINS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCoin(c)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCoin.id === c.id
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-glow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <img src={c.icon} alt={c.name} className="w-3.5 h-3.5 rounded-full" />
                <span>{c.symbol}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
              Live Feed
            </span>
          </div>
        </div>

        {/* Ticker Spotlight */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <span>{selectedCoin.name} Spot Price</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono font-bold">MATCHING ENGINE</span>
            </div>
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight mt-0.5">
              {displayPrice}
            </div>
          </div>
          <Badge className={`${selectedCoin.change24h >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"} border-0 font-mono text-xs px-2 py-1`}>
            {selectedCoin.change24h >= 0 ? <TrendingUp className="w-3.5 h-3.5 inline mr-1" /> : <TrendingDown className="w-3.5 h-3.5 inline mr-1" />}
            {formatPct(selectedCoin.change24h)}
          </Badge>
        </div>

        {/* Mini Candlestick Simulation Canvas */}
        <div className="h-16 w-full rounded-xl bg-background/40 border border-border/30 p-2 flex items-end justify-between gap-1 overflow-hidden relative">
          {[42, 48, 45, 55, 62, 58, 64, 72, 69, 78, 85, 82, 91, 88, 96, 100].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div 
                className={`w-full max-w-[10px] rounded-t-sm transition-all duration-500 ${
                  i % 3 === 0 ? "bg-emerald-400/80 shadow-glow-emerald/20" : "bg-primary/70"
                }`}
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
          <div className="absolute top-2 left-2 text-[10px] font-mono text-muted-foreground/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" /> Realistic Slip & Depth Simulation
          </div>
        </div>

        {/* Order Execution Widget */}
        <div className="space-y-3 pt-1">
          {/* Side Toggle & Order Type */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-0.5 bg-background/50 rounded-xl border border-border/50 flex">
              <button
                onClick={() => setSide("buy")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  side === "buy" ? "bg-emerald-500 text-white shadow-glow-emerald/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => setSide("sell")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  side === "sell" ? "bg-red-500 text-white shadow-glow-destructive/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            <div className="p-0.5 bg-background/50 rounded-xl border border-border/50 flex">
              <button
                onClick={() => setOrderType("market")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  orderType === "market" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                MARKET
              </button>
              <button
                onClick={() => setOrderType("limit")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  orderType === "limit" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                LIMIT
              </button>
            </div>
          </div>

          {/* Amount Slider & Presets */}
          <div className="space-y-2 p-3 rounded-xl bg-background/50 border border-border/40">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Order Allocation</span>
              <span className="font-mono font-bold text-foreground">{formatUSD(amountUSD)}</span>
            </div>

            <Slider
              value={[amountUSD]}
              min={100}
              max={25000}
              step={100}
              onValueChange={(val) => setAmountUSD(val[0])}
              className="py-1 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-1.5 pt-1">
              {[500, 1000, 2500, 5000, 10000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmountUSD(preset)}
                  className={`flex-1 py-0.5 text-[10px] font-mono rounded border transition ${
                    amountUSD === preset
                      ? "bg-primary/20 border-primary/40 text-primary font-bold"
                      : "border-border/50 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  ${preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Button */}
          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className={`w-full h-11 text-sm font-bold tracking-wide rounded-xl transition-all ${
              side === "buy"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-glow-emerald/30"
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-glow-destructive/30"
            }`}
          >
            {isExecuting ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-1.5" />
            )}
            Simulate {side.toUpperCase()} ({coinQty} {selectedCoin.symbol})
          </Button>

          {/* Live Virtual Cash Footer */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Risk-Free Demo Mode
            </span>
            <span>
              Practice Balance: <strong className="text-foreground font-mono">{formatUSD(simulatedBalance)}</strong>
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
