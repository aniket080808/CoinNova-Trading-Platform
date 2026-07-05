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
export type MistakeCategory = "fomo_buy" | "panic_sell" | "early_exit" | "long_hold_loser" | "overtrading" | "high_confidence_loss" | "consecutive_same_coin";
export interface MistakeResult {
    id: MistakeCategory;
    label: string;
    frequency: number;
    severity: "low" | "medium" | "high";
    confidence: number;
    supportingTradeCount: number;
    formula: string;
    rawValues: Record<string, unknown>;
    suggestion: string;
}
export interface WinRateByReason {
    reason: string;
    trades: number;
    wins: number;
    winRate: number;
}
export interface WinRateByConfidence {
    bucket: string;
    min: number;
    max: number;
    trades: number;
    wins: number;
    winRate: number;
}
export interface HourlyActivity {
    hour: number;
    trades: number;
}
export interface PatternResult {
    totalTrades: number;
    buys: number;
    sells: number;
    winRate: number;
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
export interface CalibrationBucket {
    bucket: string;
    min: number;
    max: number;
    trades: number;
    avgConfidence: number;
    actualWinRate: number;
    expectedWinRate: number;
    delta: number;
}
export interface CalibrationResult {
    accuracyScore: number;
    overconfidenceIndex: number;
    underconfidenceIndex: number;
    buckets: CalibrationBucket[];
    formula: string;
    insight: string;
}
export interface PersonalityTrait {
    label: string;
    key: string;
    percentage: number;
    tradeCount: number;
    description: string;
}
export interface PersonalityResult {
    dominantTrait: string;
    traits: PersonalityTrait[];
    formula: string;
}
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
export interface GuardianWarning {
    matchedPatterns: string[];
    historicalWinRate: number;
    historicalLoss: number;
    averageLoss: number;
    recommendation: string;
}
export interface GuardianResult {
    isSafe: boolean;
    riskScore: number;
    warning: GuardianWarning | null;
}
export interface BehaviorPrediction {
    label: string;
    probability: number;
    reasoning: string;
}
export interface PredictionResult {
    predictions: BehaviorPrediction[];
}
export interface ReplayAnalysis {
    actualPnL: number;
    ifHeld2HoursPnL: number;
    ifHeld24HoursPnL: number;
    ifTakeProfitPnL: number | null;
    ifStopLossPnL: number | null;
    timingEfficiency: number;
    missedProfit: number;
    avoidedLoss: number;
}
