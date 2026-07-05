import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen, Trash2, RefreshCw, BrainCircuit, TrendingUp, TrendingDown,
  Lightbulb, Shield, AlertTriangle, Zap, PenLine, ChevronDown, ChevronUp,
  BarChart3, Target, Star, Clock, Info
} from "lucide-react";
import { journalApi, aiApi, tradesApi } from "@/lib/api";
import { useDemo } from "@/store/demo";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Trade Reason options ─────────────────────────────────
const TRADE_REASONS = [
  { value: "technical_analysis", label: "📊 Technical Analysis", desc: "Chart patterns, indicators" },
  { value: "fundamental", label: "📰 Fundamental / News", desc: "Project updates, market news" },
  { value: "fomo", label: "😱 FOMO", desc: "Fear of missing out" },
  { value: "long_term", label: "🌱 Long-term Investment", desc: "Conviction based hold" },
  { value: "profit_booking", label: "💰 Profit Booking", desc: "Taking profits / stop loss" },
  { value: "other", label: "🎯 Other", desc: "Custom reason" },
];

// ─── Score bar ────────────────────────────────────────────
function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

// ─── Behavior gauge ───────────────────────────────────────
function BehaviorGauge({ label, score, color, icon: Icon, explanation }: {
  label: string; score: number; color: string; icon: any; explanation?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div className="glass rounded-xl p-4 border border-border/30 relative">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {explanation && (
          <button 
            onClick={() => setShowTooltip(!showTooltip)} 
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-white/10 transition-colors"
            title="Why this score?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
        <span className={`ml-auto text-sm font-bold ${color}`}>{score}/100</span>
      </div>
      <ScoreBar score={score} color={color.replace("text-", "bg-")} />
      {showTooltip && explanation && (
        <div className="absolute top-12 left-0 w-full z-10 p-3 text-xs bg-slate-900 border border-border/50 rounded-lg shadow-xl text-slate-200">
          <div className="font-semibold text-white mb-1">AI Explanation</div>
          {explanation}
        </div>
      )}
    </div>
  );
}

// ─── Journal Entry Card ───────────────────────────────────
function JournalEntryCard({ entry, onDelete }: { entry: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const txType = entry.txType;
  const typeColor = txType === "buy" ? "text-emerald-400" : txType === "sell" ? "text-rose-400" : "text-sky-400";
  const date = entry.txCreatedAt
    ? new Date(entry.txCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const reasonInfo = TRADE_REASONS.find(r => r.value === entry.txReason);

  return (
    <div className="glass rounded-2xl border border-border/30 hover:border-primary/20 transition-all">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {txType && (
                <span className={`text-xs font-bold uppercase ${typeColor}`}>{txType}</span>
              )}
              {entry.txSymbol && (
                <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded">{entry.txSymbol?.toUpperCase()}</span>
              )}
              {reasonInfo && (
                <span className="text-[11px] text-muted-foreground">{reasonInfo.label}</span>
              )}
              {entry.txConfidence != null && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {entry.txConfidence}% confident
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {date}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
          <p className="text-sm leading-relaxed">{entry.notes}</p>
          {entry.txAmount != null && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-xs font-semibold">{Number(entry.txAmount).toFixed(4)}</div>
                <div className="text-[10px] text-muted-foreground">Amount</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-xs font-semibold">${Number(entry.txPrice).toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Price</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-xs font-semibold">${Number(entry.txTotal).toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function Journal() {
  const qc = useQueryClient();
  const { mode } = useDemo();

  // State for new entry
  const [newNote, setNewNote] = useState("");
  const [selectedTx, setSelectedTx] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<"journal" | "analysis">("journal");

  // Fetch journal entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: () => journalApi.list(),
  });

  // Fetch recent transactions to link to
  const { data: txHistory = [] } = useQuery({
    queryKey: ["trades-history"],
    queryFn: () => tradesApi.history(),
    enabled: mode === "live",
  });

  // Fetch journal analysis history
  const { data: analysisHistory = [] } = useQuery({
    queryKey: ["journal-history"],
    queryFn: () => aiApi.journalAnalysisHistory(),
  });

  // Save journal entry
  const saveMutation = useMutation({
    mutationFn: (data: { transactionId?: string; notes: string }) =>
      journalApi.save(data),
    onSuccess: () => {
      toast.success("Journal entry saved!");
      setNewNote("");
      setSelectedTx("");
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: () => toast.error("Failed to save entry"),
  });

  // Delete journal entry
  const deleteMutation = useMutation({
    mutationFn: (id: string) => journalApi.delete(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["journal"] });
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  const handleSave = () => {
    if (!newNote.trim()) { toast.error("Write something before saving"); return; }
    saveMutation.mutate({ transactionId: selectedTx === "none" ? undefined : (selectedTx || undefined), notes: newNote.trim() });
  };

  const handleAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const result = await aiApi.journalAnalysis();
      setAnalysis(result);
      setActiveTab("analysis");
      qc.invalidateQueries({ queryKey: ["journal-history"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Derive charts data
  const chartData = analysisHistory.slice().reverse().map((a: any, i: number) => ({
    name: `Run ${i+1}`,
    fomo: a.fomoScore,
    panic: a.panicScore,
    discipline: a.disciplineScore,
  }));

  // Derive summary stats
  const totalEntries = entries.length;
  let confSum = 0;
  let confCount = 0;
  const reasonCounts: Record<string, number> = {};
  entries.forEach((e: any) => {
    if (e.txConfidence != null) { confSum += e.txConfidence; confCount++; }
    if (e.txReason) reasonCounts[e.txReason] = (reasonCounts[e.txReason] ?? 0) + 1;
  });
  const avgConfidence = confCount > 0 ? Math.round(confSum / confCount) : 0;
  const topReasonEntry = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
  const topReasonText = topReasonEntry 
    ? TRADE_REASONS.find(r => r.value === topReasonEntry[0])?.label ?? topReasonEntry[0]
    : "None";

  // Use either the newly run analysis, or the latest historical one
  const currentAnalysis = analysis || analysisHistory[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <BookOpen className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Trading Journal</h1>
            <p className="text-muted-foreground text-sm">Log your trades, reflect on decisions, and discover behavioral patterns.</p>
          </div>
        </div>
        <button
          onClick={handleAnalysis}
          disabled={loadingAnalysis || entries.length < 3}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-primary text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-glow-primary/20"
        >
          {loadingAnalysis ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</> : <><BrainCircuit className="w-4 h-4" /> Run AI Analysis</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        {[
          { key: "journal", label: "Journal", icon: PenLine },
          { key: "analysis", label: "Behavior Analysis", icon: BrainCircuit },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-primary/20 text-primary shadow-glow-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {activeTab === "journal" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Write Entry ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-border/30 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <PenLine className="w-4 h-4" /> Write Entry
              </h2>

              {/* Link to transaction */}
              {txHistory.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Link to Transaction (optional)</label>
                  <Select value={selectedTx} onValueChange={setSelectedTx}>
                    <SelectTrigger className="w-full bg-white/5 border border-border/30 rounded-xl px-3 py-2 text-sm focus:ring-0 focus:outline-none focus:border-primary/50 text-foreground">
                      <SelectValue placeholder="— Free-form entry —" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-border/30">
                      <SelectItem value="none">— Free-form entry —</SelectItem>
                      {txHistory.slice(0, 30).map((tx: any) => (
                        <SelectItem key={tx.id} value={tx.id}>
                          {tx.type?.toUpperCase()} {tx.symbol?.toUpperCase()} — ${Number(tx.total).toFixed(2)} · {new Date(tx.createdAt).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Your Notes & Reflection</label>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Why did you make this trade? What were you feeling? What would you do differently next time?"
                  rows={5}
                  className="w-full bg-white/5 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
                />
                <div className="text-[10px] text-muted-foreground text-right">{newNote.length} / 2000</div>
              </div>

              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || !newNote.trim()}
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : <><PenLine className="w-4 h-4" /> Save Journal Entry</>}
              </button>
            </div>

            {/* Tips */}
            <div className="glass rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Journaling Tips</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><Star className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> Write right after each trade while emotions are fresh</li>
                <li className="flex items-start gap-2"><Star className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> Note whether you were panicking, confident, or uncertain</li>
                <li className="flex items-start gap-2"><Star className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> After 5+ entries, run the AI Analysis to discover patterns</li>
                <li className="flex items-start gap-2"><Star className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" /> Be honest — the AI sees the data, not just your words</li>
              </ul>
            </div>
          </div>

          {/* ─── Entry List ───────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Your Entries ({entries.length})
            </h2>
            {isLoading ? (
              <div className="glass rounded-2xl p-8 border border-border/30 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <div className="glass rounded-2xl p-10 border border-border/30 flex flex-col items-center gap-3 text-muted-foreground">
                <BookOpen className="w-10 h-10 opacity-20" />
                <p className="text-sm">No journal entries yet</p>
                <p className="text-xs opacity-60">Write your first entry to start tracking your trading mindset</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto scrollbar-thin pr-1">
                {entries.map((entry: any) => (
                  <JournalEntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() => deleteMutation.mutate(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── Behavior Analysis Tab ─────────────────────── */
        <div className="space-y-6">
          {!currentAnalysis ? (
            <div className="glass rounded-2xl p-10 border border-border/30 flex flex-col items-center gap-4 text-muted-foreground">
              <BrainCircuit className="w-12 h-12 opacity-20" />
              <p className="text-sm font-medium">No analysis yet</p>
              <p className="text-xs opacity-60 text-center max-w-xs">
                {entries.length < 3
                  ? `Add at least 3 journal entries (you have ${entries.length}) to unlock AI behavioral analysis.`
                  : "Click “Run AI Analysis” above to discover your trading behavioral patterns."}
              </p>
              {entries.length >= 3 && (
                <button
                  onClick={handleAnalysis}
                  disabled={loadingAnalysis}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-primary text-white text-sm font-semibold hover:opacity-90 transition-all mt-2"
                >
                  {loadingAnalysis ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</> : <><BrainCircuit className="w-4 h-4" /> Run AI Analysis</>}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Stats & Scores */}
              <div className="space-y-4">
                
                {/* Summary Statistics */}
                <div className="glass rounded-2xl p-5 border border-border/30">
                   <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Journal Stats</h3>
                   <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-white/5 p-3">
                        <div className="text-xl font-bold">{totalEntries}</div>
                        <div className="text-[10px] text-muted-foreground">Total Entries</div>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <div className="text-lg font-bold truncate px-1" title={topReasonText}>{topReasonText.split(' ')[0]}</div>
                        <div className="text-[10px] text-muted-foreground">Top Reason</div>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <div className="text-xl font-bold text-primary">{avgConfidence}%</div>
                        <div className="text-[10px] text-muted-foreground">Avg Confidence</div>
                      </div>
                   </div>
                </div>

                {/* Behavioral Scores */}
                <div className="glass rounded-2xl p-5 border border-border/30 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Behavioral Scores</h3>
                  <BehaviorGauge 
                    label="FOMO Tendency" 
                    score={currentAnalysis.fomoScore} 
                    color="text-rose-400" 
                    icon={Zap} 
                    explanation={currentAnalysis.fomoExplanation}
                  />
                  <BehaviorGauge 
                    label="Panic Trading" 
                    score={currentAnalysis.panicScore} 
                    color="text-amber-400" 
                    icon={AlertTriangle} 
                    explanation={currentAnalysis.panicExplanation}
                  />
                  <BehaviorGauge 
                    label="Trading Discipline" 
                    score={currentAnalysis.disciplineScore} 
                    color="text-emerald-400" 
                    icon={Shield} 
                    explanation={currentAnalysis.disciplineExplanation}
                  />
                </div>
              </div>

              {/* Right Column: Insights & Trends */}
              <div className="space-y-4">
                
                {/* Trend Chart */}
                {chartData.length > 1 && (
                  <div className="glass rounded-2xl p-5 border border-border/30">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Behavior Trend
                    </h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                          <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} />
                          <YAxis stroke="#ffffff40" fontSize={10} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}
                          />
                          <Line type="monotone" dataKey="fomo" name="FOMO" stroke="#fb7185" strokeWidth={2} dot={{r:3}} />
                          <Line type="monotone" dataKey="panic" name="Panic" stroke="#fbbf24" strokeWidth={2} dot={{r:3}} />
                          <Line type="monotone" dataKey="discipline" name="Discipline" stroke="#34d399" strokeWidth={2} dot={{r:3}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                <div className="glass rounded-2xl p-5 border border-border/30 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Summary</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{currentAnalysis.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400">Top Strength</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentAnalysis.topStrength}</p>
                  </div>

                  <div className="glass rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                      <span className="text-sm font-semibold text-rose-400">Top Weakness</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{currentAnalysis.topWeakness}</p>
                  </div>
                </div>

                {/* AI Advice */}
                <div className="glass rounded-2xl p-5 border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Actionable Advice</span>
                  </div>
                  {Array.isArray(currentAnalysis.advice) ? (
                     <ul className="space-y-2">
                       {currentAnalysis.advice.map((adv: string, idx: number) => (
                         <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                           <span className="text-primary mt-1">•</span> 
                           <span className="leading-relaxed">{adv}</span>
                         </li>
                       ))}
                     </ul>
                  ) : (
                     <p className="text-sm leading-relaxed text-muted-foreground">{currentAnalysis.advice}</p>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
