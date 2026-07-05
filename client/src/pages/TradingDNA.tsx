import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, AlertTriangle, TrendingUp, ChevronRight, Activity, Zap, CheckCircle2, ShieldAlert,
  Flame, CalendarDays, Award, MessageSquare, Loader2
} from "lucide-react";
import { behaviorApi, aiApi } from "../lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { format } from "date-fns";
import { RadarChartVisualizer } from "../components/trading-dna/RadarChartVisualizer";
import { HabitCalendar } from "../components/trading-dna/HabitCalendar";

const COLORS = {
  fomo: "hsl(var(--destructive))",
  panic: "hsl(var(--warning))",
  discipline: "hsl(var(--success))",
  behavior: "hsl(var(--primary))",
};

export default function TradingDNA() {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "mistakes" | "patterns" | "calibration" | "achievements">("overview");
  // Stores the full scan result (mistakes, patterns, calibration, etc.)
  const [scanResult, setScanResult] = useState<any>(null);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["behaviorHistory"],
    queryFn: behaviorApi.history,
  });

  const { data: achievements } = useQuery({
    queryKey: ["behaviorAchievements"],
    queryFn: behaviorApi.achievements,
  });

  // Latest history row — has behaviorScore, radarValues, personality, grade directly
  const latestHistory = history && history.length > 0 ? history[history.length - 1] : null;

  const fetchAiExplanation = async (payload: any) => {
    setIsAiLoading(true);
    try {
      const { explanation } = await aiApi.explainBehavior(payload);
      setAiExplanation(explanation);
    } catch (err) {
      console.error(err);
      setAiExplanation("AI Coach is currently analyzing your data. Please try again later.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const scanMutation = useMutation({
    mutationFn: behaviorApi.scan,
    onMutate: () => setIsScanning(true),
    onSuccess: (data) => {
      setScanResult(data);
      queryClient.invalidateQueries({ queryKey: ["behaviorHistory"] });
      fetchAiExplanation(data);
    },
    onSettled: () => setIsScanning(false)
  });

  useEffect(() => {
    if (latestHistory && !aiExplanation && !isAiLoading) {
      fetchAiExplanation(latestHistory);
    }
  }, [latestHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  if (historyLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Trading DNA...</p>
      </div>
    );
  }

  const hasData = !!latestHistory;

  if (!hasData) {
    return (
      <div className="p-6 max-w-7xl mx-auto pb-32">
        <div className="text-center py-20 px-4 glass-panel rounded-3xl mt-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <Brain className="w-20 h-20 text-primary/50 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Discover Your Trading DNA</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-lg">
            Understand yourself before trying to predict the market. We analyze your actual trades to find patterns, expensive habits, and your true investor personality.
          </p>
          <button
            onClick={() => scanMutation.mutate()}
            disabled={isScanning}
            className="btn-primary group relative overflow-hidden px-8 py-4 text-lg"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isScanning ? "Scanning Trades..." : "Run Initial Scan"}
              {!isScanning && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Radar values come directly from the history row, or from scanResult.scoreData
  const rv = latestHistory.radarValues ?? scanResult?.scoreData?.radarValues ?? {};
  const radarData = [
    { subject: 'Discipline', A: rv.discipline ?? 50, fullMark: 100 },
    { subject: 'Patience', A: rv.patience ?? 50, fullMark: 100 },
    { subject: 'Confidence', A: rv.confidence ?? 50, fullMark: 100 },
    { subject: 'Risk Control', A: rv.riskControl ?? 50, fullMark: 100 },
    { subject: 'Consistency', A: rv.consistency ?? 50, fullMark: 100 },
    { subject: 'Emotional', A: rv.emotionalControl ?? 50, fullMark: 100 },
  ];

  // Use scanResult for detailed breakdowns; fall back to latestHistory for top-level data
  const displayData = {
    personality: scanResult?.personality?.dominantTrait ?? latestHistory.personality ?? "Unknown",
    behaviorScore: scanResult?.scoreData?.behaviorScore ?? latestHistory.behaviorScore ?? 0,
    grade: scanResult?.grade ?? latestHistory.grade ?? "C",
    mostExpensiveHabit: scanResult?.mostExpensiveHabit ?? null,
    calibration: scanResult?.calibration ?? null,
    patterns: scanResult?.patterns ?? null,
    mistakes: scanResult?.mistakes ?? [],
    predictions: scanResult?.predictions ?? null,
    tradeCount: scanResult?.tradeCount ?? 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Trading DNA
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Understand yourself before trying to predict the market.
          </p>
        </div>
        <button
          onClick={() => scanMutation.mutate()}
          disabled={isScanning}
          className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          Refresh DNA Scan
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        
        {/* ── Bloomberg Terminal Style Top Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-primary/50 relative overflow-hidden group hover:border-l-primary transition-colors">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">DNA Type</p>
            <span className="text-2xl font-bold text-foreground block truncate">{displayData.personality}</span>
            <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity"><Brain className="w-8 h-8" /></div>
          </div>
          
          <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-success/50 relative overflow-hidden group hover:border-l-success transition-colors">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Overall Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{displayData.behaviorScore}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${displayData.grade.includes('A') ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
              Grade: {displayData.grade}
            </span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-destructive/50 relative overflow-hidden group hover:border-l-destructive transition-colors">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Expensive Habit</p>
            {displayData.mostExpensiveHabit ? (
              <>
                <span className="text-xl font-bold text-destructive block truncate" title={displayData.mostExpensiveHabit.label}>{displayData.mostExpensiveHabit.label}</span>
                <span className="text-sm text-muted-foreground">Lost: <span className="text-destructive font-semibold">-${displayData.mostExpensiveHabit.lostUsd?.toFixed(2) ?? '0.00'}</span></span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-success block mt-2">None Detected</span>
                <span className="text-xs text-muted-foreground">Run a scan for details</span>
              </>
            )}
          </div>

          <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-warning/50 relative overflow-hidden group hover:border-l-warning transition-colors">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Confidence Calibration</p>
            <span className="text-3xl font-bold text-foreground block mt-1">{displayData.calibration?.accuracyScore ?? '—'}</span>
            <span className="text-xs text-muted-foreground">Accuracy Score</span>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-purple-500/50 relative overflow-hidden group hover:border-l-purple-500 transition-colors">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Win Rate</p>
            <span className="text-3xl font-bold text-foreground block mt-1">{displayData.patterns?.winRate ?? '—'}%</span>
            <span className="text-xs text-muted-foreground">Historical Baseline</span>
          </div>
        </div>

        {/* ── Main Dashboard Layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column: Radar & Calendar */}
          <div className="space-y-6 xl:col-span-1">
            <div className="glass-panel p-6 rounded-2xl h-[450px] flex flex-col">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-primary" /> Behavioral Radar
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Multidimensional deterministic behavioral profile.</p>
              <div className="flex-1 -mt-4">
                <RadarChartVisualizer data={radarData} />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-primary" /> Habit Calendar
              </h3>
              <HabitCalendar history={history || []} />
            </div>
          </div>

          {/* Right Column: AI Coach & Timelines */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Deterministic AI Explanation */}
            <div className="glass-strong p-6 rounded-2xl relative overflow-hidden border border-primary/30 shadow-glow-primary/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <h3 className="font-semibold text-lg flex items-center gap-2 text-primary mb-4">
                <MessageSquare className="w-5 h-5" /> Behavioral Coach Translation
              </h3>
              <div className="prose prose-invert max-w-none text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {isAiLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" /> Translating deterministic data into plain English...
                  </div>
                ) : aiExplanation ? (
                  aiExplanation
                ) : (
                  "Scan required to generate explanation."
                )}
              </div>
            </div>

            {/* Evolution Timeline */}
            <div className="glass-panel p-6 rounded-2xl h-[400px] flex flex-col">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" /> Evolution Timeline
              </h3>
              <div className="flex-1">
                {history && history.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(t) => format(new Date(t), "MMM d")}
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                        labelFormatter={(l) => format(new Date(l), "MMM d, yyyy HH:mm")}
                      />
                      <Line type="monotone" dataKey="behaviorScore" stroke={COLORS.behavior} strokeWidth={3} dot={{ r: 4, fill: COLORS.behavior }} name="Behavior Score" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    <p>Run multiple scans over time to see your evolution timeline.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Detailed Breakdown Tabs ── */}
        <div className="mt-8">
          <div className="flex items-center gap-2 border-b border-border/30 pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: "mistakes", label: "Mistake Detector", icon: ShieldAlert },
              { id: "patterns", label: "Pattern Recognition", icon: Activity },
              { id: "calibration", label: "Confidence", icon: Zap },
              { id: "achievements", label: "Achievements", icon: Award }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              {activeTab === "mistakes" && (
                <motion.div key="mistakes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {displayData.mistakes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayData.mistakes.map((m: any, i: number) => (
                        <div key={i} className="glass-panel p-4 rounded-xl border-l-2 border-l-destructive">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-destructive" /> {m.label}
                                <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">{m.frequency}x Detected</span>
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1 font-mono">{m.formula}</p>
                            </div>
                          </div>
                          <p className="text-sm mt-3"><span className="text-primary mr-1">Fix:</span>{m.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      {scanResult ? "No deterministic mistakes detected — great discipline!" : "Run a DNA Scan to detect trading mistakes."}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "patterns" && (
                <motion.div key="patterns" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {displayData.patterns ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-semibold mb-4">Key Metrics</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center py-2 border-b border-border/20">
                            <span className="text-muted-foreground">Overall Win Rate</span>
                            <span className="font-bold">{displayData.patterns.winRate}%</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/20">
                            <span className="text-muted-foreground">Avg Holding Time</span>
                            <span className="font-bold">{displayData.patterns.avgHoldingPeriodHours}h</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/20">
                            <span className="text-muted-foreground">Most Traded</span>
                            <span className="font-bold">{displayData.patterns.mostTradedAsset || "N/A"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-muted-foreground">Best Performer</span>
                            <span className="font-bold text-success">{displayData.patterns.bestAssetByWinRate || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                      {displayData.patterns.winRateByReason?.length > 0 && (
                        <div className="glass-panel p-6 rounded-2xl h-[300px]">
                          <h3 className="font-semibold mb-4">Win Rate by Reason</h3>
                          <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={displayData.patterns.winRateByReason}>
                              <XAxis dataKey="reason" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                              <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", borderRadius: "8px" }} />
                              <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                                {displayData.patterns.winRateByReason.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.winRate > 50 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      Run a DNA Scan to discover trading patterns.
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "calibration" && (
                <motion.div key="calibration" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {displayData.calibration ? (
                    <div className="glass-panel p-6 rounded-2xl max-w-2xl">
                      <h3 className="font-semibold text-lg mb-2">Confidence vs Reality</h3>
                      <p className="text-muted-foreground text-sm mb-6">{displayData.calibration.insight}</p>
                      <div className="space-y-6">
                        {displayData.calibration.buckets?.map((b: any) => (
                          <div key={b.bucket} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{b.bucket} Confidence ({b.trades} trades)</span>
                              <span className={b.delta > 0 ? "text-success" : b.delta < 0 ? "text-destructive" : "text-muted-foreground"}>
                                Actual: {b.actualWinRate}%
                              </span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10" style={{ left: `${b.expectedWinRate}%` }} />
                              <div className={`h-full rounded-full transition-all ${b.delta >= 0 ? "bg-success" : "bg-warning"}`} style={{ width: `${b.actualWinRate}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      Run a DNA Scan to analyze confidence calibration.
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "achievements" && (
                <motion.div key="achievements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {achievements && achievements.length > 0 ? achievements.map((a: any) => (
                      <div key={a.id} className="glass-panel p-4 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center flex-shrink-0">
                          <Award className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold">{a.badgeId.replace(/_/g, " ")}</h4>
                          <p className="text-xs text-muted-foreground">Unlocked {format(new Date(a.unlockedAt), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl">
                        No achievements unlocked yet. Keep trading securely!
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
