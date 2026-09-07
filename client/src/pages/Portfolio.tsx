import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/glass/GlassCard";
import { useDemo, formatUSD, formatPct, formatNum } from "@/store/demo";
import { useCoinsByIds, type Coin } from "@/lib/coingecko";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Heart,
  RefreshCw,
  HelpCircle,
  X,
  ShieldCheck,
  Layers,
  Star,
  Zap,
  BrainCircuit,
  Activity,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  LineChart as LineChartIcon,
  DollarSign,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  Trophy,
  ArrowRight,
  Target,
} from "lucide-react";
import { usePrices } from "@/lib/binance";
import { aiApi, tradesApi } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradeDialog } from "@/components/trade/TradeDialog";
import { OpenOrdersTable } from "@/components/trade/OpenOrdersTable";
import { motion } from "framer-motion";
import { clsx } from "clsx";


const COLORS = [
  "hsl(142 76% 56%)",
  "hsl(258 90% 76%)",
  "hsl(190 95% 60%)",
  "hsl(38 92% 60%)",
  "hsl(0 84% 65%)",
  "hsl(220 80% 60%)",
  "hsl(320 85% 65%)",
  "hsl(160 80% 50%)",
];

const PERFORMANCE_TIMEFRAMES = [
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "ALL" },
] as const;

type PerformanceTimeframe = typeof PERFORMANCE_TIMEFRAMES[number]["key"];

// ─── Score ring ───────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const strokeMap: Record<string, string> = {
    emerald: "#34d399",
    sky: "#38bdf8",
    amber: "#fbbf24",
    violet: "#a78bfa",
    rose: "#f87171",
    primary: "#8b5cf6",
  };
  const strokeColor = strokeMap[color] ?? "#8b5cf6";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} strokeWidth={6} fill="none" stroke="rgba(255,255,255,0.06)" />
      <circle
        cx={36}
        cy={36}
        r={r}
        strokeWidth={6}
        fill="none"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
      />
      <text x={36} y={40} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">
        {score}
      </text>
    </svg>
  );
}

// ─── Number Counter Animation ─────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 800;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue}</span>;
}

// ─── Detailed Why Modal ───────────────────────────────────
function WhyModal({ type, metrics, score, count }: { type: string; metrics: any; score: number; count: number }) {
  let content = null;

  if (type === "diversification") {
    content = (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">HHI Index Value</span>
          <span className="text-sm font-bold text-white font-mono">{metrics?.hhi ?? "N/A"}</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Number of Assets</span>
          <span className="text-sm font-bold text-white font-mono">{count}</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Target Threshold</span>
          <span className="text-sm font-bold text-sky-400 font-mono">{"< 1500 = Excellent"}</span>
        </div>
        <p className="text-sm text-slate-400">
          The Herfindahl-Hirschman Index (HHI) measures market concentration. A lower number means your portfolio is spread widely across multiple assets, reducing risk.
        </p>
      </div>
    );
  } else if (type === "stability") {
    content = (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Cash / Stablecoin Ratio</span>
          <span className="text-sm font-bold text-white font-mono">{metrics?.stableRatio ?? 0}%</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Optimal Range</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">15% - 30%</span>
        </div>
        <p className="text-sm text-slate-400">
          Holding cash provides a buffer against market crashes and gives you capital to buy dips. Having 0% means maximum risk exposure.
        </p>
      </div>
    );
  } else if (type === "quality") {
    content = (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Blue-chip (BTC/ETH) Ratio</span>
          <span className="text-sm font-bold text-white font-mono">{metrics?.bluechipRatio ?? 0}%</span>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Suggested Threshold</span>
          <span className="text-sm font-bold text-amber-400 font-mono">{"> 30%"}</span>
        </div>
        <p className="text-sm text-slate-400">
          Measures the percentage of volatile assets held in proven large-cap cryptocurrencies (BTC and ETH), lowering overall portfolio volatility.
        </p>
      </div>
    );
  } else if (type === "concentration") {
    content = (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Largest Asset Weight</span>
          <span className="text-sm font-bold text-white font-mono">
            {metrics?.largestAsset ? `${metrics.largestAsset.weight}% (${metrics.largestAsset.name})` : "0%"}
          </span>
        </div>
        <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-border/30">
          <span className="text-sm font-medium text-slate-300">Penalty Threshold</span>
          <span className="text-sm font-bold text-violet-400 font-mono">{"> 50% = High Risk"}</span>
        </div>
        <p className="text-sm text-slate-400">
          If a single asset exceeds 50% of your portfolio, returns become dangerously correlated to that single token.
        </p>
      </div>
    );
  }

  const TitleMap: Record<string, string> = {
    diversification: "Diversification Math",
    stability: "Stability Math",
    quality: "Quality Math",
    concentration: "Concentration Math",
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full hover:bg-white/10 ml-2">
          <HelpCircle className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-border/30 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" /> {TitleMap[type]}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {content}
          <div className="mt-6 space-y-3">
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <div className="text-xs uppercase tracking-wider font-bold text-primary mb-1">Calculation Result</div>
              <div className="text-xl font-black text-white">{score}/100</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Health Category Card ─────────────────────────────────
const colorClasses: Record<string, { text: string; bg: string }> = {
  sky: { text: "text-sky-400", bg: "bg-sky-400" },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-400" },
  amber: { text: "text-amber-400", bg: "bg-amber-400" },
  violet: { text: "text-violet-400", bg: "bg-violet-400" },
  rose: { text: "text-rose-400", bg: "bg-rose-400" },
  primary: { text: "text-primary", bg: "bg-primary" },
};

function HealthCategoryCard({
  type,
  name,
  icon: Icon,
  color,
  data,
  metrics,
  assetCount,
}: {
  type: string;
  name: string;
  icon: any;
  color: string;
  data: { score: number; contribution?: number };
  metrics: any;
  assetCount: number;
}) {
  const cls = colorClasses[color] ?? colorClasses.primary;
  return (
    <div className="glass rounded-2xl p-4 border border-border/30 flex items-center gap-4 relative overflow-hidden group hover:border-border/60 transition-all">
      <ScoreRing score={data.score} color={color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <Icon className={`w-4 h-4 mr-2 ${cls.text}`} />
          <span className="font-semibold text-sm">{name}</span>
          <WhyModal type={type} metrics={metrics} score={data.score} count={assetCount} />
        </div>
        <div className="flex items-end justify-between mt-0.5">
          <div className={`text-lg font-black ${cls.text}`}>
            <AnimatedNumber value={data.score} />
            <span className="text-sm font-medium">/100</span>
          </div>
          {data.contribution != null && (
            <div className="text-[10px] text-muted-foreground font-medium bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              +{data.contribution} pts
            </div>
          )}
        </div>
        <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${cls.bg}`}
            initial={{ width: 0 }}
            animate={{ width: `${data.score}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Deterministic Generators ─────────────────────────────
const generateGradeInfo = (score: number, categories: any) => {
  let grade = "F",
    desc = "",
    color = "text-rose-400",
    bg = "bg-rose-500/10",
    border = "border-rose-500/20";
  if (score >= 95) {
    grade = "A+";
    desc = "Flawless structure";
    color = "text-emerald-400";
    bg = "bg-emerald-500/10";
    border = "border-emerald-500/20";
  } else if (score >= 90) {
    grade = "A";
    desc = "Excellent long-term portfolio";
    color = "text-emerald-400";
    bg = "bg-emerald-500/10";
    border = "border-emerald-500/20";
  } else if (score >= 80) {
    grade = "B";
    desc = "Healthy, minor tweaks needed";
    color = "text-sky-400";
    bg = "bg-sky-500/10";
    border = "border-sky-500/20";
  } else if (score >= 70) {
    grade = "C";
    desc = "Balanced but has noticeable weaknesses";
    color = "text-amber-400";
    bg = "bg-amber-500/10";
    border = "border-amber-500/20";
  } else if (score >= 60) {
    grade = "D";
    desc = "High risk; stability or diversification lacking";
    color = "text-orange-400";
    bg = "bg-orange-500/10";
    border = "border-orange-500/20";
  }

  const bullets = [];
  if (categories) {
    if (categories.diversification?.score >= 80) bullets.push({ text: "Excellent diversification", pass: true });
    else bullets.push({ text: "High variance (Poor diversification)", pass: false });

    if (categories.concentration?.score >= 80) bullets.push({ text: "Low concentration risk", pass: true });
    else bullets.push({ text: "Heavy concentration in a single asset", pass: false });

    if (categories.quality?.score >= 70) bullets.push({ text: "Strong blue-chip foundation", pass: true });
    else bullets.push({ text: "Low BTC/ETH allocation", pass: false });

    if (categories.stability?.score >= 70) bullets.push({ text: "Optimal cash buffer", pass: true });
    else bullets.push({ text: "Stability outside recommended range", pass: false });
  }

  return { grade, desc, color, bg, border, bullets };
};

const generateRecommendations = (metrics: any) => {
  const recs = [];
  if (!metrics) return recs;

  if (metrics.stableRatio < 15) {
    recs.push(`Increase stablecoin/cash buffer from ${metrics.stableRatio}% to 15-30% to withstand drawdowns.`);
  } else if (metrics.stableRatio > 40) {
    recs.push(`Your cash allocation is very high (${metrics.stableRatio}%). Consider DCAing into quality assets.`);
  }

  if (metrics.bluechipRatio < 30) {
    recs.push(`Allocate at least 30% of volatile holdings to blue-chips (BTC or ETH) for stability.`);
  }

  if (metrics.largestAsset && metrics.largestAsset.weight > 50) {
    recs.push(`Reduce weight of ${metrics.largestAsset.name} (currently ${metrics.largestAsset.weight}%) below 50% to prevent single-asset drawdown.`);
  }

  if (metrics.hhi > 2500) {
    recs.push(`Portfolio concentration is elevated. Adding 2-3 quality non-correlated assets will bring HHI < 1500.`);
  }

  if (recs.length === 0) {
    recs.push("Your portfolio meets all optimal risk and diversification thresholds. Great discipline!");
  }

  return recs;
};

// ─── Main Portfolio Page ──────────────────────────────────
export default function Portfolio() {
  const { holdings, walletUSD, transactions, orders = [], checkDemoOrders, mode } = useDemo();
  const { prices: livePrices } = usePrices();
  const { data: coins = [] } = useCoinsByIds(holdings.map((h) => h.coinId));
  const qc = useQueryClient();

  const openOrdersCount = orders.filter((o) => o.status === "open").length;

  useEffect(() => {
    if (mode === "demo" && checkDemoOrders) {
      checkDemoOrders(livePrices);
    }
  }, [livePrices, mode, checkDemoOrders]);

  const [performanceTimeframe, setPerformanceTimeframe] = useState<PerformanceTimeframe>("all");


  // Health check query
  const { data: history = [] } = useQuery({
    queryKey: ["portfolio-health-history"],
    queryFn: () => aiApi.portfolioHealthHistory(),
    enabled: mode === "live",
  });

  // Server P&L summary query (for Live mode)
  const { data: serverPnl } = useQuery({
    queryKey: ["trades-pnl-summary"],
    queryFn: () => tradesApi.pnlSummary(),
    enabled: mode === "live",
  });

  const [localHealth, setLocalHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // ─── 1. Enriched Holdings Calculation ───────────────────
  const enriched = useMemo(() => {
    return holdings.map((h) => {
      const coin = coins.find((c) => c.id === h.coinId);
      const rawPrice =
        livePrices[h.symbol.toLowerCase()] ||
        livePrices[h.symbol.toUpperCase()] ||
        coin?.current_price ||
        h.avgPrice ||
        0;
      const livePrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : (h.avgPrice || 0);
      const safeAmount = Number.isFinite(h.amount) ? h.amount : 0;
      const safeAvgPrice = Number.isFinite(h.avgPrice) ? h.avgPrice : 0;
      const currentValue = safeAmount * livePrice;
      const costBasis = safeAmount * safeAvgPrice;
      const unrealizedPnL = currentValue - costBasis;
      const unrealizedPnLPct = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
      const rawChange24h = coin?.price_change_percentage_24h;
      const change24h = Number.isFinite(rawChange24h) ? (rawChange24h as number) : 0;
      const divisor = 1 + change24h / 100;
      const safeDivisor = Math.abs(divisor) < 0.001 ? 1 : divisor;
      const change24hUSD = currentValue - currentValue / safeDivisor;

      return {
        ...h,
        currentPrice: livePrice,
        coin,
        currentValue: Number.isFinite(currentValue) ? currentValue : 0,
        costBasis: Number.isFinite(costBasis) ? costBasis : 0,
        unrealizedPnL: Number.isFinite(unrealizedPnL) ? unrealizedPnL : 0,
        unrealizedPnLPct: Number.isFinite(unrealizedPnLPct) ? unrealizedPnLPct : 0,
        change24h,
        change24hUSD: Number.isFinite(change24hUSD) ? change24hUSD : 0,
      };
    });
  }, [holdings, coins, livePrices]);

  // ─── 2. Totals & Core P&L Metrics ────────────────────────
  const totalHoldingsValue = useMemo(() => enriched.reduce((s, h) => s + h.currentValue, 0), [enriched]);
  const totalCostBasis = useMemo(() => enriched.reduce((s, h) => s + h.costBasis, 0), [enriched]);
  const totalPortfolioValue = totalHoldingsValue + walletUSD;
  const totalUnrealizedPnL = totalHoldingsValue - totalCostBasis;
  const totalUnrealizedPnLPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0;
  const total24hChangeUSD = useMemo(() => enriched.reduce((s, h) => s + h.change24hUSD, 0), [enriched]);
  const total24hChangePct =
    totalPortfolioValue > 0 ? (total24hChangeUSD / (totalPortfolioValue - total24hChangeUSD)) * 100 : 0;

  // ─── 3. Realized P&L from Transactions (Client / Demo & Live) ─
  const { clientRealizedPnL, winningTrades, totalSellCount, winRate } = useMemo(() => {
    const tracker: Record<string, { totalAmt: number; totalCost: number }> = {};
    let realized = 0;
    let wins = 0;
    let sells = 0;

    const sortedTxs = [...transactions]
      .filter((t) => t.status === "completed")
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const tx of sortedTxs) {
      if (!tx.coinId) continue;
      if (!tracker[tx.coinId]) {
        tracker[tx.coinId] = { totalAmt: 0, totalCost: 0 };
      }
      const c = tracker[tx.coinId];

      if (tx.type === "buy") {
        c.totalAmt += tx.amount;
        c.totalCost += tx.total;
      } else if (tx.type === "sell") {
        if (c.totalAmt > 0) {
          sells++;
          const avgCost = c.totalCost / c.totalAmt;
          const soldCost = tx.amount * avgCost;
          const profit = tx.total - soldCost;
          realized += profit;
          if (profit > 0) wins++;

          c.totalAmt = Math.max(0, c.totalAmt - tx.amount);
          c.totalCost = Math.max(0, c.totalCost - soldCost);
        }
      }
    }

    const wr = sells > 0 ? Math.round((wins / sells) * 100) : 0;
    return { clientRealizedPnL: realized, winningTrades: wins, totalSellCount: sells, winRate: wr };
  }, [transactions]);

  const totalRealizedPnL = mode === "live" && serverPnl ? serverPnl.totalRealizedPnL : clientRealizedPnL;
  const effectiveWinRate = mode === "live" && serverPnl ? serverPnl.winRate : winRate;

  // ─── 4. Best & Worst Performers ──────────────────────────
  const sortedByPnL = useMemo(() => [...enriched].sort((a, b) => b.unrealizedPnLPct - a.unrealizedPnLPct), [enriched]);
  const bestPerformer = sortedByPnL.length > 0 && sortedByPnL[0].unrealizedPnLPct > 0 ? sortedByPnL[0] : null;
  const worstPerformer =
    sortedByPnL.length > 0 && sortedByPnL[sortedByPnL.length - 1].unrealizedPnLPct < 0
      ? sortedByPnL[sortedByPnL.length - 1]
      : null;

  // ─── 5. Asset Allocation Pie Data ────────────────────────
  const pieData = useMemo(() => {
    const safeWalletUSD = Number.isFinite(walletUSD) && walletUSD > 0 ? walletUSD : 0;
    const safePortfolioVal = Number.isFinite(totalPortfolioValue) && totalPortfolioValue > 0 ? totalPortfolioValue : safeWalletUSD;

    return [
      ...(safeWalletUSD > 0
        ? [
            {
              name: "USD Cash",
              symbol: "USD",
              value: safeWalletUSD,
              pct: safePortfolioVal > 0 ? (safeWalletUSD / safePortfolioVal) * 100 : 0,
              color: "hsl(217 91% 60%)",
            },
          ]
        : []),
      ...enriched.map((h, i) => {
        const val = Number.isFinite(h.currentValue) && h.currentValue > 0 ? h.currentValue : 0;
        return {
          name: h.coin?.name || h.name || h.symbol.toUpperCase(),
          symbol: h.symbol.toUpperCase(),
          value: val,
          pct: safePortfolioVal > 0 ? (val / safePortfolioVal) * 100 : 0,
          color: COLORS[i % COLORS.length],
        };
      }),
    ].filter((d) => Number.isFinite(d.value) && d.value > 0);
  }, [walletUSD, enriched, totalPortfolioValue]);

  // ─── 6. Real Ledger-Based Valuation History ───────────────
  const performanceData = useMemo(() => {
    const now = Date.now();
    const safeWalletUSD = Number.isFinite(walletUSD) ? walletUSD : 0;
    const safePortfolioVal =
      Number.isFinite(totalPortfolioValue) && totalPortfolioValue > 0
        ? totalPortfolioValue
        : safeWalletUSD;
    const safeHoldingsVal = Number.isFinite(totalHoldingsValue) ? totalHoldingsValue : 0;

    // Filter and sort completed transactions chronologically
    const completedTxs = [...transactions]
      .filter((t) => (t.status === "completed" || !t.status) && Number.isFinite(t.createdAt))
      .sort((a, b) => a.createdAt - b.createdAt);

    // Calculate net cash change across all transactions to find baseline starting cash
    let deltaCash = 0;
    for (const t of completedTxs) {
      const amt = Number(t.amount) || 0;
      const tot = Number(t.total) || 0;
      if (t.type === "deposit") {
        deltaCash += amt;
      } else if (t.type === "withdraw" || t.type === "transfer") {
        deltaCash -= amt;
      } else if (t.type === "buy") {
        deltaCash -= tot;
      } else if (t.type === "sell") {
        deltaCash += tot;
      }
    }

    // In live mode, starting cash before first transaction is max(0, walletUSD - deltaCash).
    // If demo mode has no deposit transactions, initial cash was $100k.
    const initialCash =
      mode === "demo" && completedTxs.every((t) => t.type !== "deposit")
        ? 100000
        : Math.max(0, safeWalletUSD - deltaCash);

    // If zero transactions and zero holdings: flat baseline at current net worth
    if (completedTxs.length === 0 && enriched.length === 0) {
      const pts = [];
      const duration =
        performanceTimeframe === "24h"
          ? 24 * 3600 * 1000
          : performanceTimeframe === "7d"
          ? 7 * 24 * 3600 * 1000
          : performanceTimeframe === "30d"
          ? 30 * 24 * 3600 * 1000
          : performanceTimeframe === "90d"
          ? 90 * 24 * 3600 * 1000
          : 24 * 3600 * 1000;
      const count = 12;
      for (let i = count; i >= 0; i--) {
        const t = now - (i / count) * duration;
        pts.push({
          time:
            performanceTimeframe === "24h"
              ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }),
          fullTime: new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
          timestamp: t,
          value: parseFloat(safePortfolioVal.toFixed(2)),
          cash: parseFloat(safeWalletUSD.toFixed(2)),
          crypto: 0,
          profit: 0,
        });
      }
      return pts;
    }

    // Determine timeframe boundaries [timeframeStart, now]
    const firstTxTime = completedTxs.length > 0 ? completedTxs[0].createdAt : now - 24 * 3600 * 1000;
    let timeframeStart = now - 24 * 3600 * 1000;
    if (performanceTimeframe === "24h") {
      timeframeStart = now - 24 * 3600 * 1000;
    } else if (performanceTimeframe === "7d") {
      timeframeStart = now - 7 * 24 * 3600 * 1000;
    } else if (performanceTimeframe === "30d") {
      timeframeStart = now - 30 * 24 * 3600 * 1000;
    } else if (performanceTimeframe === "90d") {
      timeframeStart = now - 90 * 24 * 3600 * 1000;
    } else if (performanceTimeframe === "all") {
      // For "all", frame starting 1 hour before first activity
      timeframeStart = Math.min(firstTxTime - 3600 * 1000, now - 24 * 3600 * 1000);
    }

    // Build sequential balance milestones at each transaction
    interface LedgerSnapshot {
      timestamp: number;
      cash: number;
      holdings: Record<string, number>;
      costs: Record<string, number>;
      netDeposited: number;
      event?: string;
    }

    const snapshots: LedgerSnapshot[] = [];

    // State at the very beginning (prior to first transaction)
    let currentCash = initialCash;
    const currentHoldingAmts: Record<string, number> = {};
    const currentHoldingCosts: Record<string, number> = {};
    let currentNetDeposited = mode === "demo" && initialCash === 100000 ? 100000 : 0;

    // Snapshot before first transaction
    snapshots.push({
      timestamp: Math.min(timeframeStart, firstTxTime - 1000),
      cash: currentCash,
      holdings: { ...currentHoldingAmts },
      costs: { ...currentHoldingCosts },
      netDeposited: currentNetDeposited,
    });

    for (const tx of completedTxs) {
      const sym = (tx.symbol || tx.coinId || "").toLowerCase();
      const amt = Number(tx.amount) || 0;
      const tot = Number(tx.total) || 0;
      let eventDesc: string | undefined;

      // Pre-event snapshot (1ms before tx) to show clear steps on charts
      snapshots.push({
        timestamp: tx.createdAt - 1,
        cash: currentCash,
        holdings: { ...currentHoldingAmts },
        costs: { ...currentHoldingCosts },
        netDeposited: currentNetDeposited,
      });

      if (tx.type === "deposit") {
        currentCash += amt;
        currentNetDeposited += amt;
        eventDesc = `Deposit: +${formatUSD(amt)}`;
      } else if (tx.type === "withdraw") {
        currentCash = Math.max(0, currentCash - amt);
        currentNetDeposited -= amt;
        eventDesc = `Withdraw: -${formatUSD(amt)}`;
      } else if (tx.type === "transfer") {
        currentCash = Math.max(0, currentCash - amt);
        currentNetDeposited -= amt;
        eventDesc = `Transfer: -${formatUSD(amt)}`;
      } else if (tx.type === "buy") {
        currentCash = Math.max(0, currentCash - tot);
        if (sym) {
          currentHoldingAmts[sym] = (currentHoldingAmts[sym] || 0) + amt;
          currentHoldingCosts[sym] = (currentHoldingCosts[sym] || 0) + tot;
        }
        eventDesc = `Buy ${sym ? sym.toUpperCase() : "Crypto"}: ${formatUSD(tot)}`;
      } else if (tx.type === "sell") {
        currentCash += tot;
        if (sym) {
          currentHoldingAmts[sym] = Math.max(0, (currentHoldingAmts[sym] || 0) - amt);
          if (currentHoldingAmts[sym] === 0) {
            currentHoldingCosts[sym] = 0;
          }
        }
        eventDesc = `Sell ${sym ? sym.toUpperCase() : "Crypto"}: +${formatUSD(tot)}`;
      }

      // Post-event snapshot
      snapshots.push({
        timestamp: tx.createdAt,
        cash: currentCash,
        holdings: { ...currentHoldingAmts },
        costs: { ...currentHoldingCosts },
        netDeposited: currentNetDeposited,
        event: eventDesc,
      });
    }

    // Helper: evaluate portfolio valuation at any timestamp t
    const evaluateAt = (targetTime: number, isLatest = false) => {
      if (isLatest) {
        return {
          totalVal: safePortfolioVal,
          cashVal: safeWalletUSD,
          cryptoVal: safeHoldingsVal,
          profitVal: safePortfolioVal - currentNetDeposited,
        };
      }

      // Find the latest snapshot on or before targetTime
      let snap = snapshots[0];
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (snapshots[i].timestamp <= targetTime) {
          snap = snapshots[i];
          break;
        }
      }

      let cryptoVal = 0;
      for (const sym of Object.keys(snap.holdings)) {
        const heldAmt = snap.holdings[sym] || 0;
        if (heldAmt <= 0) continue;

        // Current live price for this coin
        const livePrice =
          livePrices[sym.toLowerCase()] ||
          livePrices[sym.toUpperCase()] ||
          enriched.find((h) => h.symbol.toLowerCase() === sym)?.currentPrice ||
          1;

        // Average cost or transaction price
        const costBasis = snap.costs[sym] || 0;
        const avgCostPrice = heldAmt > 0 && costBasis > 0 ? costBasis / heldAmt : livePrice;

        // Time factor between transaction and now for smooth real price evolution
        const timeSpan = Math.max(1000, now - snap.timestamp);
        const elapsed = Math.max(0, Math.min(timeSpan, targetTime - snap.timestamp));
        const alpha = elapsed / timeSpan;

        const effectivePrice = avgCostPrice + alpha * (livePrice - avgCostPrice);
        cryptoVal += heldAmt * effectivePrice;
      }

      const totalVal = Math.max(0, snap.cash + cryptoVal);
      const profitVal = totalVal - snap.netDeposited;

      return {
        totalVal,
        cashVal: snap.cash,
        cryptoVal,
        profitVal,
        event: snap.timestamp === targetTime ? snap.event : undefined,
      };
    };

    // Generate grid timestamps within [timeframeStart, now]
    const gridCount =
      performanceTimeframe === "24h"
        ? 24
        : performanceTimeframe === "7d"
        ? 28
        : performanceTimeframe === "30d"
        ? 30
        : 45;

    const sampleTimestamps = new Set<number>();
    sampleTimestamps.add(timeframeStart);
    sampleTimestamps.add(now);

    const stepMs = (now - timeframeStart) / gridCount;
    for (let i = 1; i < gridCount; i++) {
      sampleTimestamps.add(Math.round(timeframeStart + i * stepMs));
    }

    // Include all transaction event timestamps within the timeframe
    for (const snap of snapshots) {
      if (snap.timestamp >= timeframeStart && snap.timestamp <= now) {
        sampleTimestamps.add(snap.timestamp);
      }
    }

    const sortedTimes = Array.from(sampleTimestamps).sort((a, b) => a - b);

    const points = sortedTimes.map((t, idx) => {
      const isLast = idx === sortedTimes.length - 1;
      const { totalVal, cashVal, cryptoVal, profitVal, event } = evaluateAt(t, isLast);

      const label =
        performanceTimeframe === "24h"
          ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });

      const fullTime = new Date(t).toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        time: label,
        fullTime,
        timestamp: t,
        value: parseFloat(totalVal.toFixed(2)),
        cash: parseFloat(cashVal.toFixed(2)),
        crypto: parseFloat(cryptoVal.toFixed(2)),
        profit: parseFloat(profitVal.toFixed(2)),
        event,
      };
    });

    return points;
  }, [
    performanceTimeframe,
    totalPortfolioValue,
    totalHoldingsValue,
    walletUSD,
    transactions,
    enriched,
    livePrices,
    mode,
  ]);

  // Guaranteed finite numeric domain for YAxis with adaptive padding
  const yDomain = useMemo<[number, number]>(() => {
    const values = performanceData.map((d) => d.value).filter((v) => Number.isFinite(v));
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100];
    if (min === max) {
      return [Math.max(0, Math.floor(min * 0.9)), Math.ceil(max * 1.1) || 100];
    }
    const span = max - min;
    const padding = span * 0.08;
    const domainMin = min === 0 || min - padding < 0 ? 0 : Math.floor(min - padding);
    const domainMax = Math.ceil(max + padding);
    return [domainMin, domainMax];
  }, [performanceData]);

  // Intelligent Y-axis tick formatter preventing duplicate identical labels
  const formatYAxisTick = (v: number) => {
    if (!Number.isFinite(v)) return "$0";
    if (v === 0) return "$0";
    const span = yDomain[1] - yDomain[0];
    if (span <= 10) return `$${v.toFixed(2)}`;
    if (span <= 500) return `$${Math.round(v).toLocaleString()}`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 10_000) return `$${(v / 1000).toFixed(span < 20000 ? 1 : 0)}k`;
    if (v >= 1000) return `$${(v / 1000).toFixed(span < 2000 ? 2 : 1)}k`;
    return `$${Math.round(v)}`;
  };

  // ─── 7. Health Check Handlers ────────────────────────────
  const handleAnalysis = async () => {
    setLoadingHealth(true);
    try {
      const payload = {
        walletBalance: walletUSD,
        holdings: enriched.map((h) => ({
          coinId: h.coinId,
          symbol: h.symbol,
          name: h.coin?.name || h.symbol,
          amount: h.amount,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
        })),
      };

      if (mode === "live") {
        await aiApi.portfolioHealth(payload);
        qc.invalidateQueries({ queryKey: ["portfolio-health-history"] });
        toast.success("Portfolio Health Check completed!");
      } else {
        const res = await aiApi.portfolioHealth(payload);
        setLocalHealth(res);
        toast.success("Demo Health Check completed!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze portfolio");
    } finally {
      setLoadingHealth(false);
    }
  };

  const health = mode === "live" ? history[0] : localHealth;
  const gradeInfo = health ? generateGradeInfo(health.overallScore, health.categories) : null;
  const detRecs = health ? generateRecommendations(health.metrics) : [];
  const riskLevel = health?.overallScore >= 70 ? "Low" : health?.overallScore >= 40 ? "Medium" : "High";

  // Health trend chart points
  const chartData = useMemo(() => {
    if (!history?.length) return [];
    return [...history]
      .reverse()
      .filter((h: any) => h && Number.isFinite(h.overallScore))
      .map((h: any, i: number) => ({
        name: new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score: Number(h.overallScore),
        delta: i > 0 ? h.overallScore - history[history.length - i].overallScore : 0,
        grade: generateGradeInfo(h.overallScore, h.categories).grade,
        risk: h.overallScore >= 70 ? "Low" : h.overallScore >= 40 ? "Medium" : "High",
      }));
  }, [history]);

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-display font-black tracking-tight">Portfolio</h1>
            <Badge
              variant="outline"
              className={mode === "live" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-primary/40 text-primary bg-primary/10"}
            >
              {mode === "live" ? "LIVE ACCOUNT" : "DEMO TRADING"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time valuation, cost basis analysis, and portfolio intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="glass hover:border-primary/40">
            <Link to="/wallet">
              <Wallet className="w-3.5 h-3.5 mr-1.5" /> Wallet
            </Link>
          </Button>
          <Button
            onClick={handleAnalysis}
            disabled={loadingHealth || totalPortfolioValue <= 0}
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-primary text-white hover:opacity-90 shadow-glow-primary"
          >
            {loadingHealth ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 mr-1.5" /> Run Health Check
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Top P&L Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Worth */}
        <GlassCard className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Worth</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-display font-black tracking-tight">
            {formatUSD(totalPortfolioValue)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>Cash: <b className="text-foreground">{formatUSD(walletUSD)}</b></span>
            <span>Crypto: <b className="text-foreground">{formatUSD(totalHoldingsValue)}</b></span>
          </div>
        </GlassCard>

        {/* Card 2: Unrealized P&L */}
        <GlassCard className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unrealized P&L</span>
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                totalUnrealizedPnL >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}
            >
              {totalUnrealizedPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div
            className={clsx(
              "text-2xl lg:text-3xl font-display font-black tracking-tight",
              totalUnrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {totalUnrealizedPnL >= 0 ? "+" : ""}
            {formatUSD(totalUnrealizedPnL)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span
              className={clsx(
                "font-semibold px-1.5 py-0.5 rounded text-[11px]",
                totalUnrealizedPnLPct >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              )}
            >
              {formatPct(totalUnrealizedPnLPct)} return
            </span>
            <span>Invested: <b className="text-foreground">{formatUSD(totalCostBasis)}</b></span>
          </div>
        </GlassCard>

        {/* Card 3: Realized P&L */}
        <GlassCard className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Realized P&L</span>
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                totalRealizedPnL >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}
            >
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div
            className={clsx(
              "text-2xl lg:text-3xl font-display font-black tracking-tight",
              totalRealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {totalRealizedPnL >= 0 ? "+" : ""}
            {formatUSD(totalRealizedPnL)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span className="bg-sky-500/15 text-sky-400 font-semibold px-1.5 py-0.5 rounded text-[11px]">
              {effectiveWinRate}% Win Rate
            </span>
            <span>{totalSellCount} closed trades</span>
          </div>
        </GlassCard>

        {/* Card 4: 24h Performance */}
        <GlassCard className="p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">24h Movement</span>
            <div
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                total24hChangeUSD >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
              )}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div
            className={clsx(
              "text-2xl lg:text-3xl font-display font-black tracking-tight",
              total24hChangeUSD >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {total24hChangeUSD >= 0 ? "+" : ""}
            {formatUSD(total24hChangeUSD)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span
              className={clsx(
                "font-semibold px-1.5 py-0.5 rounded text-[11px]",
                total24hChangePct >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              )}
            >
              {formatPct(total24hChangePct)} 24h
            </span>
            <span>Today's portfolio drift</span>
          </div>
        </GlassCard>
      </div>

      {/* ─── Main Tabs Navigation ─────────────────────────────── */}
      <Tabs defaultValue="holdings" className="space-y-6">
        <TabsList className="bg-secondary/40 p-1 rounded-xl glass border border-border/40">
          <TabsTrigger value="holdings" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
            <Layers className="w-4 h-4" />
            Holdings & P&L
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
              {enriched.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
            <BarChart3 className="w-4 h-4" />
            Performance & Allocation
          </TabsTrigger>
          <TabsTrigger value="health" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
            <Heart className="w-4 h-4" />
            Health & AI Insights
            {health && (
              <Badge className="ml-1 bg-primary/20 text-primary text-[10px] px-1.5 py-0 h-4">
                {health.overallScore}/100
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
            <Target className="w-4 h-4" />
            Orders & Limit
            {openOrdersCount > 0 && (
              <Badge className="ml-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0 h-4 font-mono">
                {openOrdersCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>


        {/* ════════════════════════════════════════════════════════════
            TAB 1: HOLDINGS & P&L TABLE
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="holdings" className="space-y-4">
          {/* Best / Worst Performer chips */}
          {(bestPerformer || worstPerformer) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bestPerformer && (
                <div className="glass rounded-xl p-3 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Top Performer:
                    </span>
                    <span className="text-sm font-bold">{bestPerformer.symbol.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    {formatPct(bestPerformer.unrealizedPnLPct)} (+{formatUSD(bestPerformer.unrealizedPnL)})
                  </div>
                </div>
              )}
              {worstPerformer && (
                <div className="glass rounded-xl p-3 border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                      Drawdown:
                    </span>
                    <span className="text-sm font-bold">{worstPerformer.symbol.toUpperCase()}</span>
                  </div>
                  <div className="text-sm font-bold text-rose-400">
                    {formatPct(worstPerformer.unrealizedPnLPct)} ({formatUSD(worstPerformer.unrealizedPnL)})
                  </div>
                </div>
              )}
            </div>
          )}

          {enriched.length === 0 ? (
            <GlassCard className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">No Crypto Holdings Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You currently have {formatUSD(walletUSD)} cash available. Explore the market to buy your first cryptocurrency and start tracking live returns!
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button asChild className="bg-gradient-neon text-background">
                  <Link to="/market">
                    Explore Markets <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="glass">
                  <Link to="/wallet">Deposit Cash</Link>
                </Button>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="p-0 overflow-hidden border-border/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-white/[0.02] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3.5 px-4">Asset</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">24h</th>
                      <th className="py-3.5 px-4">Holdings</th>
                      <th className="py-3.5 px-4">Avg Buy (Cost)</th>
                      <th className="py-3.5 px-4">Unrealized P&L</th>
                      <th className="py-3.5 px-4">Weight</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {enriched.map((h) => {
                      const allocationPct =
                        totalPortfolioValue > 0 ? (h.currentValue / totalPortfolioValue) * 100 : 0;
                      const coinObj: Coin = h.coin || {
                        id: h.coinId,
                        symbol: h.symbol,
                        name: h.name || h.symbol,
                        image: h.image || "",
                        current_price: h.currentPrice,
                        market_cap: 0,
                        market_cap_rank: 0,
                        total_volume: 0,
                        price_change_percentage_24h: h.change24h,
                      };

                      return (
                        <tr key={h.coinId} className="hover:bg-white/[0.03] transition-colors">
                          {/* Asset */}
                          <td className="py-3.5 px-4">
                            <Link
                              to={`/coin/${h.coinId}`}
                              className="flex items-center gap-3 group"
                            >
                              <img
                                src={h.image || h.coin?.image}
                                alt={h.name}
                                className="w-8 h-8 rounded-full bg-secondary/30 object-cover"
                              />
                              <div>
                                <div className="font-bold uppercase flex items-center gap-1.5 group-hover:text-primary transition-colors">
                                  {h.symbol}
                                </div>
                                <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                  {h.name || h.coin?.name}
                                </div>
                              </div>
                            </Link>
                          </td>

                          {/* Live Price */}
                          <td className="py-3.5 px-4 font-mono font-medium">
                            {formatUSD(h.currentPrice)}
                          </td>

                          {/* 24h Change */}
                          <td className="py-3.5 px-4 font-mono">
                            <span
                              className={clsx(
                                "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded",
                                h.change24h >= 0
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                              )}
                            >
                              {formatPct(h.change24h)}
                            </span>
                          </td>

                          {/* Holdings */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold">{formatUSD(h.currentValue)}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {formatNum(h.amount, 4)} {h.symbol.toUpperCase()}
                            </div>
                          </td>

                          {/* Avg Buy Price */}
                          <td className="py-3.5 px-4 font-mono text-muted-foreground">
                            {formatUSD(h.avgPrice)}
                          </td>

                          {/* Unrealized P&L */}
                          <td className="py-3.5 px-4 font-mono">
                            <div
                              className={clsx(
                                "font-bold text-sm",
                                h.unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                              )}
                            >
                              {h.unrealizedPnL >= 0 ? "+" : ""}
                              {formatUSD(h.unrealizedPnL)}
                            </div>
                            <div
                              className={clsx(
                                "text-xs font-semibold",
                                h.unrealizedPnLPct >= 0 ? "text-emerald-400/80" : "text-rose-400/80"
                              )}
                            >
                              {formatPct(h.unrealizedPnLPct)}
                            </div>
                          </td>

                          {/* Allocation % bar */}
                          <td className="py-3.5 px-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.min(allocationPct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                                {allocationPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <TradeDialog
                              coin={coinObj}
                              trigger={
                                <Button size="sm" variant="outline" className="h-7 px-3 text-xs glass hover:border-primary/50">
                                  Trade
                                </Button>
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 2: PERFORMANCE & ALLOCATION ANALYTICS
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Asset Allocation Donut */}
            <GlassCard className="lg:col-span-5 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-primary" /> Asset Allocation
                  </h3>
                  <p className="text-xs text-muted-foreground">Portfolio diversification by weight</p>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {pieData.length} Assets
                </Badge>
              </div>

              <div className="h-56 relative my-auto">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={2}
                        paddingAngle={3}
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff", fontWeight: "bold" }}
                        formatter={(value: number) => [
                          `${formatUSD(value)} (${((value / totalPortfolioValue) * 100).toFixed(1)}%)`,
                          "Value",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No asset allocation yet
                  </div>
                )}
                {totalPortfolioValue > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total</span>
                    <span className="text-lg font-black">{formatUSD(totalPortfolioValue, { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>

              {/* Allocation List */}
              <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin pr-1">
                {pieData.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <div>
                        <div className="font-semibold text-sm leading-none">{d.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{d.pct.toFixed(1)}% of total</div>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold">{formatUSD(d.value)}</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Right: Portfolio Valuation History Curve */}
            <GlassCard className="lg:col-span-7 p-6 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <LineChartIcon className="w-4 h-4 text-primary" /> Valuation History
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {transactions.length > 0
                        ? `Real ledger tracking • ${transactions.length} trade${transactions.length > 1 ? "s" : ""} & transfers recorded`
                        : "Live balance tracking over selected timeframe"}
                    </p>
                  </div>

                  {/* Timeframe selector */}
                  <div className="flex gap-1 glass p-0.5 rounded-lg text-xs">
                    {PERFORMANCE_TIMEFRAMES.map((tf) => (
                      <button
                        key={tf.key}
                        onClick={() => setPerformanceTimeframe(tf.key)}
                        className={clsx(
                          "px-2.5 py-1 rounded-md font-medium transition",
                          performanceTimeframe === tf.key
                            ? "bg-primary text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#ffffff40"
                        fontSize={11}
                        tickMargin={8}
                        minTickGap={25}
                      />
                      <YAxis
                        stroke="#ffffff40"
                        fontSize={11}
                        domain={yDomain}
                        tickFormatter={formatYAxisTick}
                        width={58}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                        }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const data = payload[0].payload;
                          return (
                            <div className="p-3 space-y-1.5 text-xs bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl shadow-xl min-w-[200px]">
                              <div className="text-slate-400 font-medium pb-1 border-b border-slate-800">
                                {data.fullTime || data.time}
                              </div>
                              {data.event && (
                                <div className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold text-[11px] mt-1 mb-1">
                                  {data.event}
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Portfolio Value:</span>
                                <span className="font-bold text-white text-sm">{formatUSD(data.value)}</span>
                              </div>
                              {data.cash !== undefined && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-400">Cash Balance:</span>
                                  <span className="font-medium text-sky-400">{formatUSD(data.cash)}</span>
                                </div>
                              )}
                              {data.crypto !== undefined && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-400">Crypto Assets:</span>
                                  <span className="font-medium text-amber-400">{formatUSD(data.crypto)}</span>
                                </div>
                              )}
                              {data.profit !== undefined && (
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                                  <span className="text-slate-400">Net Return:</span>
                                  <span className={clsx("font-semibold", data.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {data.profit >= 0 ? "+" : ""}{formatUSD(data.profit)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#portfolioGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Analytics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-border/40 mt-4">
                <div className="glass p-3 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Cash Ratio</div>
                  <div className="text-base font-bold text-sky-400 mt-0.5">
                    {totalPortfolioValue > 0 ? ((walletUSD / totalPortfolioValue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="glass p-3 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Blue-Chip (BTC/ETH)</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">
                    {totalHoldingsValue > 0
                      ? (
                          (enriched
                            .filter((h) => ["btc", "eth"].includes(h.symbol.toLowerCase()))
                            .reduce((s, h) => s + h.currentValue, 0) /
                            totalHoldingsValue) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>
                <div className="glass p-3 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Assets Held</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{enriched.length} Coins</div>
                </div>
                <div className="glass p-3 rounded-xl">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Trades Executed</div>
                  <div className="text-base font-bold text-violet-400 mt-0.5">{transactions.length} Total</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 3: PORTFOLIO HEALTH & AI INSIGHTS
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="health" className="space-y-6">
          {!health ? (
            <GlassCard className="p-16 flex flex-col items-center justify-center text-center shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <LineChartIcon className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h2 className="text-2xl font-black mb-3">Run Health Check</h2>
              <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
                Deterministic algorithmic analysis checks your portfolio against proven risk matrices: HHI diversification, cash stability buffer, blue-chip foundation, and single-asset concentration.
              </p>
              <Button
                onClick={handleAnalysis}
                disabled={loadingHealth || totalPortfolioValue <= 0}
                className="bg-primary text-white shadow-glow-primary px-8 py-3 h-auto text-base font-bold"
              >
                {loadingHealth ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing Portfolio…
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" /> Analyze Portfolio Now
                  </>
                )}
              </Button>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              {/* Top Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Overall Score */}
                <div className="glass rounded-2xl p-6 border border-border/30 flex flex-col items-center justify-center md:col-span-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Overall Health Score
                  </div>
                  <ScoreRing
                    score={health.overallScore}
                    color={health.overallScore >= 70 ? "emerald" : health.overallScore >= 40 ? "amber" : "rose"}
                  />
                </div>

                {/* Portfolio Grade Summary */}
                <div
                  className={`glass rounded-2xl p-6 border ${gradeInfo?.border} ${gradeInfo?.bg} md:col-span-8 flex flex-col justify-center`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        Portfolio Grade
                      </div>
                      <div className={`text-4xl font-black ${gradeInfo?.color} drop-shadow-lg`}>
                        {gradeInfo?.grade}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                        Risk Level
                      </div>
                      <div
                        className={clsx(
                          "text-lg font-bold",
                          riskLevel === "Low" ? "text-emerald-400" : riskLevel === "Medium" ? "text-amber-400" : "text-rose-400"
                        )}
                      >
                        {riskLevel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2">
                    {gradeInfo?.bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {b.pass ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span className="text-slate-300">{b.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Health Trend Graph & Stats */}
              {chartData.length > 0 && (
                <div className="glass rounded-2xl p-5 border border-border/30">
                  <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> Health Score History
                    </div>
                  </div>

                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                        <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickMargin={8} minTickGap={20} />
                        <YAxis stroke="#ffffff40" fontSize={10} domain={[0, 100]} hide />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: "#fff" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Category Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HealthCategoryCard
                  type="diversification"
                  name="Diversification"
                  icon={Layers}
                  color="sky"
                  data={health.categories.diversification}
                  metrics={health.metrics}
                  assetCount={enriched.length}
                />
                <HealthCategoryCard
                  type="stability"
                  name="Stability"
                  icon={ShieldCheck}
                  color="emerald"
                  data={health.categories.stability}
                  metrics={health.metrics}
                  assetCount={0}
                />
                <HealthCategoryCard
                  type="quality"
                  name="Quality Assets"
                  icon={Star}
                  color="amber"
                  data={health.categories.quality}
                  metrics={health.metrics}
                  assetCount={0}
                />
                <HealthCategoryCard
                  type="concentration"
                  name="Concentration"
                  icon={Zap}
                  color="violet"
                  data={health.categories.concentration}
                  metrics={health.metrics}
                  assetCount={0}
                />
              </div>

              {/* Score Contribution Equation */}
              <div className="glass rounded-2xl p-6 border border-border/30">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-primary" /> Formula Transparency
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3 font-mono text-xs bg-black/20 p-4 rounded-xl">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Diversification ({health.categories.diversification.score} × 30%)</span>
                      <span className="font-bold text-sky-400">+{health.categories.diversification.contribution}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Stability ({health.categories.stability.score} × 25%)</span>
                      <span className="font-bold text-emerald-400">+{health.categories.stability.contribution}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Quality ({health.categories.quality.score} × 20%)</span>
                      <span className="font-bold text-amber-400">+{health.categories.quality.contribution}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Concentration ({health.categories.concentration.score} × 25%)</span>
                      <span className="font-bold text-violet-400">+{health.categories.concentration.contribution}</span>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-base mt-2">
                      <span className="font-semibold text-white">Final Score</span>
                      <span className="font-black text-primary">{health.overallScore} / 100</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-white/5 pb-2">
                      <span>HHI &lt; 1500</span>
                      <span className="font-bold text-sky-400">Excellent</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-white/5 pb-2">
                      <span>Stable Ratio 15–30%</span>
                      <span className="font-bold text-emerald-400">Ideal</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 border-b border-white/5 pb-2">
                      <span>Blue-chip Allocation &gt; 30%</span>
                      <span className="font-bold text-amber-400">Max Score</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pb-1">
                      <span>Largest Holding &lt; 50%</span>
                      <span className="font-bold text-violet-400">No Penalty</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              {detRecs.length > 0 && (
                <div className="glass rounded-2xl p-6 border border-primary/20 bg-primary/5 transition-all hover:bg-primary/10">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-primary">
                    <Lightbulb className="w-5 h-5" /> Actionable Recommendations
                  </h3>
                  <div className="space-y-3">
                    {detRecs.map((item: string, i: number) => (
                      <div key={i} className="text-sm text-slate-300 flex items-start gap-3 bg-black/20 p-3 rounded-lg">
                        <span className="text-primary font-black mt-0.5">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>


        {/* ════════════════════════════════════════════════════════════
            TAB 4: ORDERS & HISTORY
           ════════════════════════════════════════════════════════════ */}
        <TabsContent value="orders" className="space-y-4">
          <OpenOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

