import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PlaySquare, Trophy, TrendingUp, TrendingDown, BarChart2,
  RefreshCw, ChevronDown, Clock, Zap, AlertTriangle, Award,
  Star, Target, Search, FastForward, Pause, Play, RotateCcw,
  BookOpen, ChevronRight, Coins,
} from "lucide-react";
import { aiApi, coinsApi, replayApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────
interface OHLCVPoint { time: number; price: number }
interface SimTrade {
  timestamp: number; action: "buy" | "sell";
  price: number; quantity: number;
  cashBalance: number; portfolioValue: number;
}
interface ReplayState {
  cash: number; coins: number; trades: SimTrade[];
  phase: "idle" | "running" | "paused" | "done";
  currentIndex: number;
  maxDrawdown: number; peakValue: number;
  winCount: number; lossCount: number;
}

// ─── Difficulty config ────────────────────────────────────
const DIFFICULTIES = {
  beginner: { label: "Beginner", color: "emerald", description: "30-day historical period, gentle volatility", days: 30 },
  intermediate: { label: "Intermediate", color: "amber", description: "90-day period with real market events", days: 90 },
  advanced: { label: "Advanced", color: "rose", description: "365-day period through full market cycles", days: 365 },
} as const;

const POPULAR_COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
];

const SPEEDS = [1, 2, 4, 8];

// ─── Helper functions ─────────────────────────────────────
function calcMetrics(state: ReplayState, priceData: OHLCVPoint[], startCapital: number) {
  const lastPrice = priceData[priceData.length - 1]?.price ?? 1;
  const portfolioValue = state.cash + state.coins * lastPrice;
  const userReturn = ((portfolioValue - startCapital) / startCapital) * 100;
  const startPrice = priceData[0]?.price ?? 1;
  const buyAndHoldReturn = ((lastPrice - startPrice) / startPrice) * 100;
  const totalTrades = state.trades.length;
  const winRate = state.winCount + state.lossCount > 0
    ? (state.winCount / (state.winCount + state.lossCount)) * 100 : 0;
  return { portfolioValue, userReturn, buyAndHoldReturn, totalTrades, winRate, maxDrawdown: state.maxDrawdown };
}

// ─── Grade display ────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    "A+": "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    "A": "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
    "B+": "text-sky-400 border-sky-400/40 bg-sky-400/10",
    "B": "text-sky-400 border-sky-400/40 bg-sky-400/10",
    "C+": "text-amber-400 border-amber-400/40 bg-amber-400/10",
    "C": "text-amber-400 border-amber-400/40 bg-amber-400/10",
    "D": "text-orange-400 border-orange-400/40 bg-orange-400/10",
    "F": "text-rose-400 border-rose-400/40 bg-rose-400/10",
  };
  return (
    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl border text-xl font-black ${colors[grade] ?? colors["C"]}`}>
      {grade}
    </span>
  );
}

// ─── History card ─────────────────────────────────────────
function HistoryCard({ replay, onExpand }: { replay: any; onExpand: () => void }) {
  const ur = Number(replay.userReturn);
  const bhr = Number(replay.buyAndHoldReturn);
  return (
    <div className="glass rounded-2xl p-4 border border-border/30 hover:border-primary/30 transition-all cursor-pointer" onClick={onExpand}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{replay.symbol?.toUpperCase()}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            replay.difficulty === "beginner" ? "bg-emerald-500/20 text-emerald-400" :
            replay.difficulty === "intermediate" ? "bg-amber-500/20 text-amber-400" :
            "bg-rose-500/20 text-rose-400"
          }`}>{replay.difficulty}</span>
        </div>
        {replay.review && <GradeBadge grade={replay.review.aiGrade} />}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className={`text-sm font-bold ${ur >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {ur >= 0 ? "+" : ""}{ur.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Your Return</div>
        </div>
        <div>
          <div className={`text-sm font-bold ${bhr >= 0 ? "text-sky-400" : "text-rose-400"}`}>
            {bhr >= 0 ? "+" : ""}{bhr.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Buy & Hold</div>
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">{Number(replay.winRate).toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">Win Rate</div>
        </div>
      </div>
      {replay.review && (
        <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2 border-t border-border/30 pt-2">
          {replay.review.critique}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function Replay() {
  const qc = useQueryClient();

  // Setup state
  const [selectedCoin, setSelectedCoin] = useState(POPULAR_COINS[0]);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTIES>("intermediate");
  const [startCapital, setStartCapital] = useState(10000);
  const [speed, setSpeed] = useState(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof POPULAR_COINS>([]);
  const [searching, setSearching] = useState(false);

  // Replay state
  const [priceData, setPriceData] = useState<OHLCVPoint[]>([]);
  const [simState, setSimState] = useState<ReplayState | null>(null);
  const [tradeAmount, setTradeAmount] = useState(500);
  const [review, setReview] = useState<{ aiGrade: string; critique: string } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [expandedReplay, setExpandedReplay] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: history = [] } = useQuery({ queryKey: ["replay-history"], queryFn: () => replayApi.history() });

  // ─── Coin search ─────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await coinsApi.search(q);
      setSearchResults((data.coins ?? []).slice(0, 5).map((c: any) => ({
        id: c.id, symbol: c.symbol?.toUpperCase(), name: c.name,
      })));
    } catch { } finally { setSearching(false); }
  }, []);

  // ─── Load historical data ─────────────────────────────────
  const handleStartReplay = useCallback(async () => {
    setLoadingData(true);
    setReview(null);
    setSimState(null);
    const days = DIFFICULTIES[difficulty].days;
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    try {
      const data = await coinsApi.historyRange(selectedCoin.id, from, to);
      const points: OHLCVPoint[] = (data.prices ?? []).map(([t, p]: [number, number]) => ({ time: t, price: p }));
      if (points.length < 10) { toast.error("Not enough historical data for this coin/range."); setLoadingData(false); return; }
      setPriceData(points);
      setSimState({
        cash: startCapital, coins: 0, trades: [],
        phase: "idle", currentIndex: 0,
        maxDrawdown: 0, peakValue: startCapital,
        winCount: 0, lossCount: 0,
      });
    } catch { toast.error("Failed to load historical data"); }
    setLoadingData(false);
  }, [selectedCoin, difficulty, startCapital]);

  // ─── Simulation tick ──────────────────────────────────────
  const tick = useCallback(() => {
    setSimState(prev => {
      if (!prev || prev.phase !== "running" || prev.currentIndex >= priceData.length - 1) {
        return prev ? { ...prev, phase: "done" } : prev;
      }
      const nextIndex = prev.currentIndex + 1;
      const currentPrice = priceData[nextIndex]?.price ?? 0;
      const portfolioValue = prev.cash + prev.coins * currentPrice;
      const peakValue = Math.max(prev.peakValue, portfolioValue);
      const drawdown = peakValue > 0 ? ((peakValue - portfolioValue) / peakValue) * 100 : 0;
      return {
        ...prev,
        currentIndex: nextIndex,
        peakValue,
        maxDrawdown: Math.max(prev.maxDrawdown, drawdown),
      };
    });
  }, [priceData]);

  useEffect(() => {
    if (!simState) return;
    if (simState.phase === "running") {
      const interval = Math.max(50, 500 / speed);
      timerRef.current = setInterval(tick, interval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    if (simState.phase === "done" && simState.trades.length > 0 && !review) {
      generateReview(simState);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [simState?.phase, speed, tick]);

  const generateReview = async (state: ReplayState) => {
    if (priceData.length === 0) return;
    setLoadingReview(true);
    const m = calcMetrics(state, priceData, startCapital);
    const holdingTimes: number[] = [];
    const buys = state.trades.filter(t => t.action === "buy");
    const sells = state.trades.filter(t => t.action === "sell");
    sells.forEach((sell, i) => {
      if (buys[i]) {
        holdingTimes.push((sell.timestamp - buys[i].timestamp) / 3600000);
      }
    });
    const avgHolding = holdingTimes.length > 0 ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length : 24;
    try {
      const rev = await aiApi.replayReview({
        coinId: selectedCoin.id, symbol: selectedCoin.symbol, difficulty,
        userReturn: m.userReturn, buyAndHoldReturn: m.buyAndHoldReturn,
        totalTrades: m.totalTrades, winRate: m.winRate,
        maxDrawdown: m.maxDrawdown, averageHoldingTime: avgHolding,
        trades: state.trades,
      });
      setReview(rev);
      // Auto-save
      await replayApi.save({
        coinId: selectedCoin.id, symbol: selectedCoin.symbol, difficulty,
        startCapital, finalBalance: m.portfolioValue,
        userReturn: m.userReturn, buyAndHoldReturn: m.buyAndHoldReturn,
        totalTrades: m.totalTrades, winRate: m.winRate,
        maxDrawdown: m.maxDrawdown, averageHoldingTime: avgHolding,
        replayDuration: state.trades.length * 5,
        trades: state.trades,
        review: rev,
      });
      qc.invalidateQueries({ queryKey: ["replay-history"] });
    } catch { toast.error("Could not generate AI review"); }
    setLoadingReview(false);
  };

  // ─── Trade actions ────────────────────────────────────────
  const handleBuy = useCallback(() => {
    if (!simState || simState.phase !== "running" && simState.phase !== "paused") return;
    const currentPrice = priceData[simState.currentIndex]?.price;
    if (!currentPrice) return;
    if (simState.cash < tradeAmount) { toast.error("Insufficient cash"); return; }
    const qty = tradeAmount / currentPrice;
    setSimState(prev => {
      if (!prev) return prev;
      const trade: SimTrade = {
        timestamp: priceData[prev.currentIndex].time,
        action: "buy", price: currentPrice, quantity: qty,
        cashBalance: prev.cash - tradeAmount,
        portfolioValue: prev.cash - tradeAmount + (prev.coins + qty) * currentPrice,
      };
      return { ...prev, cash: prev.cash - tradeAmount, coins: prev.coins + qty, trades: [...prev.trades, trade] };
    });
    toast.success(`Bought ${qty.toFixed(4)} ${selectedCoin.symbol} @ $${currentPrice.toFixed(2)}`);
  }, [simState, priceData, tradeAmount, selectedCoin.symbol]);

  const handleSell = useCallback(() => {
    if (!simState || simState.coins <= 0) { toast.error("No coins to sell"); return; }
    const currentPrice = priceData[simState.currentIndex]?.price;
    if (!currentPrice) return;
    const lastBuy = [...simState.trades].reverse().find(t => t.action === "buy");
    const won = lastBuy ? currentPrice > lastBuy.price : false;
    const sellValue = simState.coins * currentPrice;
    setSimState(prev => {
      if (!prev) return prev;
      const trade: SimTrade = {
        timestamp: priceData[prev.currentIndex].time,
        action: "sell", price: currentPrice, quantity: prev.coins,
        cashBalance: prev.cash + sellValue,
        portfolioValue: prev.cash + sellValue,
      };
      return {
        ...prev, cash: prev.cash + sellValue, coins: 0,
        trades: [...prev.trades, trade],
        winCount: won ? prev.winCount + 1 : prev.winCount,
        lossCount: !won ? prev.lossCount + 1 : prev.lossCount,
      };
    });
    toast.success(`Sold all ${selectedCoin.symbol} @ $${currentPrice.toFixed(2)}`);
  }, [simState, priceData, selectedCoin.symbol]);

  const currentPrice = simState ? priceData[simState.currentIndex]?.price : null;
  const metrics = simState && priceData.length > 0 ? calcMetrics(simState, priceData, startCapital) : null;
  const progress = simState && priceData.length > 0 ? (simState.currentIndex / (priceData.length - 1)) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <PlaySquare className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Trading Replay Mode</h1>
          <p className="text-muted-foreground text-sm">Simulate trades on real historical price data. No risk, real lessons.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── Setup Panel ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 border border-border/30 space-y-5">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Setup Replay</h2>

            {/* Coin selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Select Coin</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search coins..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full bg-white/5 border border-border/30 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                />
              </div>
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map(c => (
                    <button key={c.id} onClick={() => { setSelectedCoin(c); setSearchResults([]); setSearchQuery(""); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5 flex items-center gap-2">
                      <span className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{c.symbol}</span>
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {POPULAR_COINS.map(c => (
                    <button key={c.id} onClick={() => setSelectedCoin(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                        selectedCoin.id === c.id
                          ? "bg-primary/20 border-primary/40 text-primary"
                          : "border-border/30 text-muted-foreground hover:bg-white/5"
                      }`}>{c.symbol}</button>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground px-1">
                Selected: <span className="text-foreground font-medium">{selectedCoin.name} ({selectedCoin.symbol})</span>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
              <div className="space-y-2">
                {(Object.entries(DIFFICULTIES) as [keyof typeof DIFFICULTIES, any][]).map(([key, d]) => (
                  <button key={key} onClick={() => setDifficulty(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      difficulty === key
                        ? `bg-${d.color}-500/10 border-${d.color}-500/40 text-${d.color}-400`
                        : "border-border/30 text-muted-foreground hover:bg-white/5"
                    }`}>
                    <div className="font-semibold text-sm">{d.label}</div>
                    <div className="text-[11px] opacity-70">{d.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Capital */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Starting Capital</label>
              <div className="flex gap-2">
                {[1000, 5000, 10000, 25000].map(v => (
                  <button key={v} onClick={() => setStartCapital(v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                      startCapital === v ? "bg-primary/20 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:bg-white/5"
                    }`}>${(v / 1000).toFixed(0)}k</button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartReplay}
              disabled={loadingData}
              className="w-full py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow-primary/20"
            >
              {loadingData ? <><RefreshCw className="w-4 h-4 animate-spin" /> Loading Data…</> : <><PlaySquare className="w-4 h-4" /> Load & Start Replay</>}
            </button>
          </div>

          {/* History */}
          <div className="glass rounded-2xl p-4 border border-border/30">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Past Replays</h2>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No replays yet. Play your first session!</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {history.map((r: any) => (
                  <HistoryCard key={r.id} replay={r} onExpand={() => setExpandedReplay(expandedReplay === r.id ? null : r.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Main Sim Area ────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {!simState ? (
            <div className="glass rounded-2xl border border-border/30 h-96 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <PlaySquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Configure your replay and press "Load & Start Replay"</p>
            </div>
          ) : (
            <>
              {/* Price display */}
              <div className="glass rounded-2xl p-5 border border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-black">
                      ${currentPrice?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {priceData[simState.currentIndex]?.time
                        ? new Date(priceData[simState.currentIndex].time).toLocaleDateString()
                        : ""}
                      &nbsp;·&nbsp;
                      {selectedCoin.name} ({selectedCoin.symbol})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Speed selector */}
                    <div className="flex gap-1">
                      {SPEEDS.map(s => (
                        <button key={s} onClick={() => setSpeed(s)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${speed === s ? "bg-primary text-white" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}>
                          {s}x
                        </button>
                      ))}
                    </div>
                    {/* Playback controls */}
                    {simState.phase === "idle" && (
                      <button onClick={() => setSimState(p => p ? { ...p, phase: "running" } : p)}
                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                    {simState.phase === "running" && (
                      <button onClick={() => setSimState(p => p ? { ...p, phase: "paused" } : p)}
                        className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all">
                        <Pause className="w-5 h-5" />
                      </button>
                    )}
                    {simState.phase === "paused" && (
                      <button onClick={() => setSimState(p => p ? { ...p, phase: "running" } : p)}
                        className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all">
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={handleStartReplay}
                      className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:bg-white/10 transition-all">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Day 0</span>
                  <span className="font-medium text-primary">
                    {simState.phase === "done" ? "Session Complete!" : simState.phase === "paused" ? "Paused" : "Running..."}
                  </span>
                  <span>Day {DIFFICULTIES[difficulty].days}</span>
                </div>
              </div>

              {/* Live metrics */}
              {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Portfolio Value", value: `$${metrics.portfolioValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: Coins, color: "text-foreground" },
                    { label: "Your Return", value: `${metrics.userReturn >= 0 ? "+" : ""}${metrics.userReturn.toFixed(2)}%`, icon: TrendingUp, color: metrics.userReturn >= 0 ? "text-emerald-400" : "text-rose-400" },
                    { label: "Buy & Hold", value: `${metrics.buyAndHoldReturn >= 0 ? "+" : ""}${metrics.buyAndHoldReturn.toFixed(2)}%`, icon: Target, color: metrics.buyAndHoldReturn >= 0 ? "text-sky-400" : "text-rose-400" },
                    { label: "Cash Left", value: `$${simState.cash.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, icon: Zap, color: "text-amber-400" },
                    { label: "Win Rate", value: `${metrics.winRate.toFixed(0)}%`, icon: Trophy, color: "text-primary" },
                    { label: "Max Drawdown", value: `${metrics.maxDrawdown.toFixed(1)}%`, icon: AlertTriangle, color: "text-rose-400" },
                  ].map(m => (
                    <div key={m.label} className="glass rounded-xl p-3 border border-border/20">
                      <div className="flex items-center gap-2 mb-1">
                        <m.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                      <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Trade controls */}
              {(simState.phase === "running" || simState.phase === "paused") && (
                <div className="glass rounded-2xl p-5 border border-border/30 space-y-4">
                  <h3 className="text-sm font-semibold">Trade Controls</h3>
                  <div>
                    <label className="text-xs text-muted-foreground">Trade Amount (USD)</label>
                    <div className="flex gap-2 mt-1">
                      {[100, 500, 1000, 2500].map(v => (
                        <button key={v} onClick={() => setTradeAmount(v)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            tradeAmount === v ? "bg-primary/20 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:bg-white/5"
                          }`}>${v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleBuy} disabled={!simState.cash || simState.cash < tradeAmount}
                      className="py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all font-semibold text-sm disabled:opacity-40">
                      🟢 Buy ${tradeAmount}
                    </button>
                    <button onClick={handleSell} disabled={simState.coins <= 0}
                      className="py-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-semibold text-sm disabled:opacity-40">
                      🔴 Sell All
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Holdings: <span className="text-foreground font-medium">{simState.coins.toFixed(4)} {selectedCoin.symbol}</span>
                    &nbsp;·&nbsp;Cash: <span className="text-foreground font-medium">${simState.cash.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* AI Review */}
              {simState.phase === "done" && (
                <div className="glass rounded-2xl p-5 border border-primary/20 bg-primary/5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Session Complete — AI Review</h3>
                    {review && <GradeBadge grade={review.aiGrade} />}
                  </div>

                  {/* Performance comparison */}
                  {metrics && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/5 p-3 text-center">
                        <div className={`text-xl font-black ${metrics.userReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {metrics.userReturn >= 0 ? "+" : ""}{metrics.userReturn.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Your Return</div>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 text-center">
                        <div className={`text-xl font-black ${metrics.buyAndHoldReturn >= 0 ? "text-sky-400" : "text-rose-400"}`}>
                          {metrics.buyAndHoldReturn >= 0 ? "+" : ""}{metrics.buyAndHoldReturn.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Buy & Hold</div>
                      </div>
                    </div>
                  )}

                  {loadingReview ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Generating AI critique…
                    </div>
                  ) : review ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.critique}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No trades made — no review to generate.</p>
                  )}

                  {/* Trade log */}
                  {simState.trades.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Trade Log</h4>
                      <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                        {simState.trades.map((t, i) => (
                          <div key={i} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
                            t.action === "buy" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            <span className="font-medium uppercase">{t.action}</span>
                            <span>{t.quantity.toFixed(4)} {selectedCoin.symbol}</span>
                            <span>@ ${t.price.toFixed(2)}</span>
                            <span>${t.portfolioValue.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
