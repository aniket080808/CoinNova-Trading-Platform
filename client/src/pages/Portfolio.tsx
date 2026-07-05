import { useState, useEffect } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { useDemo, formatUSD } from "@/store/demo";
import { useCoinsByIds } from "@/lib/coingecko";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import {
  TrendingUp, TrendingDown, Heart, RefreshCw, HelpCircle, X,
  ShieldCheck, Layers, Star, Zap, BrainCircuit, Activity,
  AlertTriangle, Lightbulb, CheckCircle2, Calendar, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { usePrices } from "@/lib/binance";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const COLORS = ["hsl(142 76% 56%)", "hsl(258 90% 76%)", "hsl(190 95% 60%)", "hsl(38 92% 60%)", "hsl(0 84% 65%)", "hsl(220 80% 60%)"];

// ─── Score ring ───────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const strokeMap: Record<string, string> = {
    emerald: "#34d399", sky: "#38bdf8", amber: "#fbbf24", violet: "#a78bfa", rose: "#f87171", primary: "#8b5cf6",
  };
  const strokeColor = strokeMap[color] ?? "#8b5cf6";
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} strokeWidth={6} fill="none" stroke="rgba(255,255,255,0.06)" />
      <circle cx={36} cy={36} r={r} strokeWidth={6} fill="none" stroke={strokeColor}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset 1s ease-in-out" }} />
      <text x={36} y={40} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">{score}</text>
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
    
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue}</span>;
}

// ─── Detailed Why Modal ───────────────────────────────────
function WhyModal({ type, metrics, score, count }: { type: string, metrics: any, score: number, count: number }) {
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
        <p className="text-sm text-slate-400">The Herfindahl-Hirschman Index (HHI) measures market concentration. A lower number means your portfolio is spread widely across multiple assets, reducing single-point-of-failure risk.</p>
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
        <p className="text-sm text-slate-400">Holding cash or stablecoins provides a buffer against market crashes and gives you "dry powder" to buy dips. Having 0% means maximum risk exposure.</p>
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
        <p className="text-sm text-slate-400">This measures the percentage of your volatile assets that are held in proven, large-cap cryptocurrencies (BTC and ETH). A higher percentage dramatically lowers overall volatility risk.</p>
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
        <p className="text-sm text-slate-400">If a single asset exceeds 50% of your portfolio, your portfolio's performance becomes dangerously correlated to that one asset's price movements.</p>
      </div>
    );
  }

  const TitleMap: Record<string, string> = { diversification: "Diversification Math", stability: "Stability Math", quality: "Quality Math", concentration: "Concentration Math" };

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

// ─── Deterministic Generators ─────────────────────────────
const generateGradeInfo = (score: number, categories: any) => {
  let grade = "F", desc = "", color = "text-rose-400", bg = "bg-rose-500/10", border = "border-rose-500/20";
  if (score >= 95) { grade = "A+"; desc = "Flawless structure"; color = "text-emerald-400"; bg = "bg-emerald-500/10"; border = "border-emerald-500/20"; }
  else if (score >= 90) { grade = "A"; desc = "Excellent long-term portfolio"; color = "text-emerald-400"; bg = "bg-emerald-500/10"; border = "border-emerald-500/20"; }
  else if (score >= 80) { grade = "B"; desc = "Healthy, minor tweaks needed"; color = "text-sky-400"; bg = "bg-sky-500/10"; border = "border-sky-500/20"; }
  else if (score >= 70) { grade = "C"; desc = "Balanced but has noticeable weaknesses"; color = "text-amber-400"; bg = "bg-amber-500/10"; border = "border-amber-500/20"; }
  else if (score >= 60) { grade = "D"; desc = "High risk; stability or diversification lacking"; color = "text-orange-400"; bg = "bg-orange-500/10"; border = "border-orange-500/20"; }

  const bullets = [];
  if (categories) {
    if (categories.diversification.score >= 80) bullets.push({ text: "Excellent diversification", pass: true });
    else bullets.push({ text: "High variance (Poor diversification)", pass: false });

    if (categories.concentration.score >= 80) bullets.push({ text: "Low concentration risk", pass: true });
    else bullets.push({ text: "Heavy concentration in a single asset", pass: false });

    if (categories.quality.score >= 70) bullets.push({ text: "Strong blue-chip foundation", pass: true });
    else bullets.push({ text: "Low BTC/ETH allocation", pass: false });

    if (categories.stability.score >= 70) bullets.push({ text: "Optimal cash buffer", pass: true });
    else bullets.push({ text: "Stability outside recommended range", pass: false });
  }

  return { grade, desc, color, bg, border, bullets };
};

const generateRecommendations = (metrics: any) => {
  const recs = [];
  if (!metrics) return recs;

  if (metrics.stableRatio < 15) {
    recs.push(`Increase stablecoin allocation from ${metrics.stableRatio}% to approximately 15-30% for a better buffer.`);
  } else if (metrics.stableRatio > 40) {
    recs.push(`Your cash allocation is very high (${metrics.stableRatio}%). Consider deploying capital if you intend to invest.`);
  }

  if (metrics.bluechipRatio < 30) {
    recs.push(`Allocate 10-30% of your portfolio to BTC or ETH to improve blue-chip exposure.`);
  }

  if (metrics.largestAsset && metrics.largestAsset.weight > 50) {
    recs.push(`Reduce concentration in ${metrics.largestAsset.name} (currently ${metrics.largestAsset.weight}%) below 50% to decrease risk.`);
  }

  if (metrics.hhi > 2500) {
    recs.push(`Your portfolio is highly concentrated. Diversify into additional assets to lower your HHI index below 1500.`);
  }

  if (recs.length === 0) {
    recs.push("Your portfolio meets all deterministic threshold targets. Maintain current strategy.");
  }

  return recs;
};


// ─── Health category card ─────────────────────────────────
const colorClasses: Record<string, { text: string; bg: string }> = {
  sky:     { text: "text-sky-400",     bg: "bg-sky-400"     },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-400" },
  amber:   { text: "text-amber-400",   bg: "bg-amber-400"   },
  violet:  { text: "text-violet-400",  bg: "bg-violet-400"  },
  rose:    { text: "text-rose-400",    bg: "bg-rose-400"    },
  primary: { text: "text-primary",     bg: "bg-primary"     },
};

function HealthCategoryCard({ type, name, icon: Icon, color, data, metrics, assetCount }: {
  type: string; name: string; icon: any; color: string; data: { score: number; contribution?: number }; metrics: any; assetCount: number;
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
             <AnimatedNumber value={data.score} /><span className="text-sm font-medium">/100</span>
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
            initial={{ width: 0 }} animate={{ width: `${data.score}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-xl min-w-[200px]">
        <div className="text-xs text-slate-400 mb-2">{label}</div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-white">Score</span>
          <span className="text-lg font-black text-primary">{data.score}</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">Delta</span>
          <span className={clsx("text-xs font-bold", data.delta > 0 ? "text-emerald-400" : data.delta < 0 ? "text-rose-400" : "text-slate-400")}>
            {data.delta > 0 ? "+" : ""}{data.delta}
          </span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-400">Grade</span>
          <span className="text-xs font-bold text-white">{data.grade}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">Risk</span>
          <span className="text-xs font-bold text-amber-400">{data.risk}</span>
        </div>
      </div>
    );
  }
  return null;
};

// ─── Main Page ────────────────────────────────────────────
export default function Portfolio() {
  const { holdings, walletUSD, mode } = useDemo();
  const { prices: livePrices } = usePrices();
  const { data: coins = [] } = useCoinsByIds(holdings.map((h) => h.coinId));
  const qc = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ["portfolio-health-history"],
    queryFn: () => aiApi.portfolioHealthHistory(),
    enabled: mode === "live",
  });

  const [localHealth, setLocalHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const enriched = holdings.map((h) => {
    const coin = coins.find((c) => c.id === h.coinId);
    const livePrice = livePrices[h.symbol.toUpperCase()] || coin?.current_price || h.avgPrice;
    return { ...h, currentPrice: livePrice, coin };
  });

  const totalHoldingsValue = enriched.reduce((s, h) => s + h.currentPrice * h.amount, 0);
  const totalValue = totalHoldingsValue + walletUSD;

  const pieData = [
    { name: "USD Wallet", value: walletUSD },
    ...enriched.map((h) => ({ name: h.symbol.toUpperCase(), value: h.currentPrice * h.amount })),
  ].filter((d) => d.value > 0);

  const handleAnalysis = async () => {
    setLoadingHealth(true);
    try {
      const payload = {
        walletBalance: walletUSD,
        holdings: enriched.map(h => ({
          coinId: h.coinId,
          symbol: h.symbol,
          name: h.coin?.name || h.symbol,
          amount: h.amount,
          avgPrice: h.avgPrice,
          currentPrice: h.currentPrice,
        }))
      };
      const res = await aiApi.portfolioHealth(payload);
      setLocalHealth(res);
      qc.invalidateQueries({ queryKey: ["portfolio-health-history"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoadingHealth(false);
    }
  };

  const health = localHealth || history[0];
  const prevHealth = history.length > 1 && !localHealth ? history[1] : (history.length > 0 && localHealth ? history[0] : null);
  
  const delta = prevHealth && health ? health.overallScore - prevHealth.overallScore : 0;
  
  const getRisk = (score: number) => score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";
  
  const gradeInfo = health ? generateGradeInfo(health.overallScore, health.categories) : null;
  const riskLevel = health ? getRisk(health.overallScore) : "Unknown";
  const detRecs = health ? generateRecommendations(health.metrics) : [];

  const chartData = history.slice().reverse().map((h: any, i: number, arr: any[]) => {
    const prevScore = i > 0 ? arr[i-1].overallScore : h.overallScore;
    return {
      name: new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      score: h.overallScore,
      delta: h.overallScore - prevScore,
      grade: generateGradeInfo(h.overallScore, h.categories).grade,
      risk: getRisk(h.overallScore)
    };
  });
  if (localHealth) {
     chartData.push({ 
       name: "Just now", 
       score: localHealth.overallScore,
       delta: localHealth.overallScore - (history[0]?.overallScore ?? localHealth.overallScore),
       grade: generateGradeInfo(localHealth.overallScore, localHealth.categories).grade,
       risk: getRisk(localHealth.overallScore)
     });
  }

  const highestScore = chartData.length > 0 ? Math.max(...chartData.map(d => d.score)) : 0;
  const lowestScore = chartData.length > 0 ? Math.min(...chartData.map(d => d.score)) : 0;
  const avgScore = chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.score, 0) / chartData.length) : 0;

  return (
    <div className="space-y-8">
      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <Layers className="w-8 h-8 text-primary" /> Portfolio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your assets and analyze portfolio health deterministically.</p>
        </div>
        <div className="flex items-center gap-3">
          {mode === "demo" && (
            <div className="bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Star className="w-3.5 h-3.5" /> Demo Mode Active
            </div>
          )}
          <button
            onClick={handleAnalysis}
            disabled={loadingHealth || totalValue <= 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            {loadingHealth ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Heart className="w-4 h-4" /> Run Health Check</>}
          </button>
        </div>
      </div>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Assets */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6">
            <h3 className="font-semibold text-muted-foreground uppercase text-xs tracking-wider mb-2">Total Balance</h3>
            <div className="text-4xl font-black">{formatUSD(totalValue)}</div>
            
            <div className="mt-8 h-48">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} stroke="rgba(255,255,255,0.05)" strokeWidth={2} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#fff" }} itemStyle={{ color: "#fff", fontWeight: "bold" }} formatter={(value: number) => formatUSD(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No assets to display</div>
              )}
            </div>
            
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-semibold text-sm">{d.name}</span>
                  </div>
                  <div className="text-sm font-mono">{formatUSD(d.value)}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Health Analysis */}
        <div className="lg:col-span-8 space-y-6">
          {!health ? (
            <div className="glass rounded-2xl p-16 border border-border/30 flex flex-col items-center justify-center text-center shadow-2xl">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <LineChartIcon className="w-10 h-10 text-primary opacity-50" />
              </div>
              <h2 className="text-2xl font-black mb-3">Track Your Progress</h2>
              <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">Run your first Health Check to start tracking your portfolio's progress over time. Our deterministic algorithms analyze your risk, diversification, and stability.</p>
              <button
                onClick={handleAnalysis}
                disabled={loadingHealth || totalValue <= 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-glow-primary/20"
              >
                {loadingHealth ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
                {loadingHealth ? "Analyzing Portfolio..." : "Analyze Portfolio Now"}
              </button>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Top Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                 
                 {/* Overall Score */}
                 <motion.div 
                    key={health.overallScore + (health.createdAt ?? 'now')}
                    initial={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    animate={{ backgroundColor: ["rgba(16,185,129,0.2)", "rgba(255,255,255,0.02)"] }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="glass rounded-2xl p-6 border border-border/30 flex flex-col items-center justify-center relative overflow-hidden md:col-span-4"
                 >
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Overall Score</div>
                    <ScoreRing score={health.overallScore} color={health.overallScore >= 70 ? "emerald" : health.overallScore >= 40 ? "amber" : "rose"} />
                 </motion.div>

                 {/* Portfolio Grade Summary */}
                 <div className={`glass rounded-2xl p-6 border ${gradeInfo?.border} ${gradeInfo?.bg} md:col-span-8 flex flex-col justify-center`}>
                    <div className="flex justify-between items-start mb-4">
                       <div>
                         <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Portfolio Grade</div>
                         <div className={`text-4xl font-black ${gradeInfo?.color} drop-shadow-lg`}><AnimatedNumber value={0}/>{gradeInfo?.grade}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Risk Level</div>
                         <div className={clsx("text-lg font-bold", riskLevel === "Low" ? "text-emerald-400" : riskLevel === "Medium" ? "text-amber-400" : "text-rose-400")}>{riskLevel}</div>
                       </div>
                    </div>
                    
                    <div className="space-y-2 mt-2">
                       {gradeInfo?.bullets.map((b, i) => (
                         <div key={i} className="flex items-center gap-2 text-xs">
                           {b.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
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
                     <div className="flex gap-4">
                        <div className="text-right">
                           <div className="text-[10px] text-muted-foreground uppercase">High</div>
                           <div className="text-sm font-bold text-emerald-400">{highestScore}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] text-muted-foreground uppercase">Low</div>
                           <div className="text-sm font-bold text-rose-400">{lowestScore}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-[10px] text-muted-foreground uppercase">Avg</div>
                           <div className="text-sm font-bold text-sky-400">{avgScore}</div>
                        </div>
                     </div>
                  </div>
                  
                  {/* Trend Indicator */}
                  {chartData.length > 1 && (
                     <div className="mb-6 flex">
                       <div className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold",
                          delta > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                          delta < 0 ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
                          "bg-sky-500/10 border-sky-500/30 text-sky-400"
                       )}>
                          {delta > 0 ? <ArrowUpRight className="w-4 h-4" /> : delta < 0 ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          {delta > 0 ? `Improving (+${delta} since last check)` : delta < 0 ? `Declining (${delta} since last check)` : "Stable (No change)"}
                       </div>
                     </div>
                  )}

                  <div className="h-40 w-full">
                    {chartData.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                          <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickMargin={8} minTickGap={20} />
                          <YAxis stroke="#ffffff40" fontSize={10} domain={[0, 100]} hide />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{r:4, fill: "#8b5cf6", strokeWidth: 2}} activeDot={{r: 6, fill: "#fff"}} animationDuration={1500} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-white/5 rounded-xl">
                        <Activity className="w-6 h-6 mb-2 opacity-20" />
                        Run another health check later to see your trend.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Category Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HealthCategoryCard
                  type="diversification" name="Diversification" icon={Layers} color="sky" data={health.categories.diversification} metrics={health.metrics} assetCount={pieData.length - 1}
                />
                <HealthCategoryCard
                  type="stability" name="Stability" icon={ShieldCheck} color="emerald" data={health.categories.stability} metrics={health.metrics} assetCount={0}
                />
                <HealthCategoryCard
                  type="quality" name="Quality Assets" icon={Star} color="amber" data={health.categories.quality} metrics={health.metrics} assetCount={0}
                />
                <HealthCategoryCard
                  type="concentration" name="Concentration" icon={Zap} color="violet" data={health.categories.concentration} metrics={health.metrics} assetCount={0}
                />
              </div>
              
              {/* Score Contribution Equation */}
              <div className="glass rounded-2xl p-6 border border-border/30">
                 <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                   <BrainCircuit className="w-4 h-4 text-primary" /> Formula Transparency
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Equation */}
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

                    {/* Thresholds */}
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

              {/* Deterministic Actionable Recommendations */}
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

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
