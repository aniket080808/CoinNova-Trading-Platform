// ─────────────────────────────────────────────────────────────────────────────
// Behavior Intelligence Engine — Shared Types
// All types used across the deterministic analysis modules.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawTransaction {
  id: string;
  type: "buy" | "sell" | "deposit" | "withdraw" | "transfer";
  coinId: string | null;
  symbol: string | null;
  amount: number;
  price: number | null;
  total: number;
  reason: string | null;
  confidence: number | null;
  createdAt: Date;
}

// ─── Mistake Detector ────────────────────────────────────────────────────────

export type MistakeCategory =
  | "fomo_buy"
  | "panic_sell"
  | "early_exit"
  | "long_hold_loser"
  | "overtrading"
  | "high_confidence_loss"
  | "consecutive_same_coin";

export interface MistakeResult {
  id: MistakeCategory;
  label: string;
  frequency: number;            // Number of times detected
  severity: "low" | "medium" | "high";
  confidence: number;           // 0–100 detection confidence
  supportingTradeCount: number;
  formula: string;              // Human-readable rule description
  rawValues: Record<string, unknown>;
  suggestion: string;
}

// ─── Pattern Recognizer ──────────────────────────────────────────────────────

export interface WinRateByReason {
  reason: string;
  trades: number;
  wins: number;
  winRate: number; // 0–100
}

export interface WinRateByConfidence {
  bucket: string;   // "0–25%", "25–50%", etc.
  min: number;
  max: number;
  trades: number;
  wins: number;
  winRate: number;
}

export interface HourlyActivity {
  hour: number; // 0–23
  trades: number;
}

export interface PatternResult {
  totalTrades: number;
  buys: number;
  sells: number;
  winRate: number;              // Overall win rate (0–100)
  avgHoldingPeriodHours: number;
  mostTradedAsset: string | null;
  bestAssetByWinRate: string | null;
  worstAssetByWinRate: string | null;
  winRateByReason: WinRateByReason[];
  winRateByConfidence: WinRateByConfidence[];
  hourlyActivity: HourlyActivity[];
  avgTradeSize: number;
  largestGain: number;
  largestLoss: number;
  preferredHour: number | null;
}

// ─── Confidence Calibrator ───────────────────────────────────────────────────

export interface CalibrationBucket {
  bucket: string;
  min: number;
  max: number;
  trades: number;
  avgConfidence: number;
  actualWinRate: number;     // 0–100
  expectedWinRate: number;   // midpoint of bucket, used as baseline
  delta: number;             // actualWinRate - expectedWinRate
}

export interface CalibrationResult {
  accuracyScore: number;       // 0–100
  overconfidenceIndex: number; // positive = overconfident
  underconfidenceIndex: number;
  buckets: CalibrationBucket[];
  formula: string;
  insight: string;
}

// ─── Personality Profiler ────────────────────────────────────────────────────

export interface PersonalityTrait {
  label: string;
  key: string;
  percentage: number;     // 0–100 (sum of all = 100)
  tradeCount: number;
  description: string;
}

export interface PersonalityResult {
  dominantTrait: string;
  traits: PersonalityTrait[];
  formula: string;
}

// ─── Full Analysis Result ────────────────────────────────────────────────────

export interface MostExpensiveHabit {
  label: string;
  detected: number;
  averageLossPct: number;
  largestLossAmount: number;
  estimatedTotalLoss: number;
}

export interface BehaviorAnalysisResult {
  behaviorScore: number;
  fomoScore: number;
  panicScore: number;
  disciplineScore: number;
  confidenceAccuracy: number;
  mistakes: MistakeResult[];
  patterns: PatternResult;
  calibration: CalibrationResult;
  personality: PersonalityResult;
  mostExpensiveHabit: MostExpensiveHabit | null;
}

// ─── Score Engine & Radar ──────────────────────────────────────────────────

export interface RadarValues {
  discipline: number;
  patience: number;
  confidence: number;
  riskControl: number;
  consistency: number;
  emotionalControl: number;
}

export interface ScoreEngineResult {
  behaviorScore: number;
  radarValues: RadarValues;
  trend: number;
  topStrength: string;
  topWeakness: string;
}

// ─── Smart Trade Guardian ──────────────────────────────────────────────────

export interface GuardianWarning {
  matchedPatterns: string[];
  historicalWinRate: number;
  historicalLoss: number;
  averageLoss: number;
  recommendation: string;
}

export interface GuardianResult {
  isSafe: boolean;
  riskScore: number; // 0-100
  warning: GuardianWarning | null;
}

// ─── Prediction Engine ─────────────────────────────────────────────────────

export interface BehaviorPrediction {
  label: string; // e.g. "Probability of FOMO"
  probability: number; // 0-100
  reasoning: string;
}

export interface PredictionResult {
  predictions: BehaviorPrediction[];
}

// ─── Replay Engine ─────────────────────────────────────────────────────────

export interface ReplayAnalysis {
  actualPnL: number;
  ifHeld2HoursPnL: number;
  ifHeld24HoursPnL: number;
  ifTakeProfitPnL: number | null;
  ifStopLossPnL: number | null;
  timingEfficiency: number; // 0-100
  missedProfit: number;
  avoidedLoss: number;
}
