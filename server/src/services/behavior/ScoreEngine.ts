// ─────────────────────────────────────────────────────────────────────────────
// ScoreEngine — Deterministic scoring for Trading DNA
// Calculates the overarching behavior score, radar axes, and top strengths.
// ─────────────────────────────────────────────────────────────────────────────

import type { MistakeResult, PatternResult, RawTransaction, ScoreEngineResult } from "./types.js";

function calculateDiscipline(mistakes: MistakeResult[]): number {
  const fomo = mistakes.find(m => m.id === "fomo_buy")?.frequency || 0;
  const overtrading = mistakes.find(m => m.id === "overtrading")?.frequency || 0;
  let score = 100 - (fomo * 10) - (overtrading * 15);
  return Math.max(0, Math.min(100, score));
}

function calculatePatience(mistakes: MistakeResult[], patterns: PatternResult): number {
  const earlyExit = mistakes.find(m => m.id === "early_exit")?.frequency || 0;
  // A higher average holding period generally indicates patience
  const holdBonus = Math.min(30, patterns.avgHoldingPeriodHours / 2);
  let score = 70 - (earlyExit * 15) + holdBonus;
  return Math.max(0, Math.min(100, score));
}

function calculateConfidence(patterns: PatternResult): number {
  // If they have high win rates in high confidence buckets, their confidence is justified
  const highConfBucket = patterns.winRateByConfidence.find(b => b.min >= 75);
  if (!highConfBucket || highConfBucket.trades === 0) return 50; // Neutral if no data
  return Math.max(0, Math.min(100, highConfBucket.winRate));
}

function calculateRiskControl(mistakes: MistakeResult[], patterns: PatternResult): number {
  const longHoldLoser = mistakes.find(m => m.id === "long_hold_loser")?.frequency || 0;
  const largestLoss = Math.abs(patterns.largestLoss); // e.g. 50 for -50%
  let score = 100 - (longHoldLoser * 10) - (largestLoss * 0.5);
  return Math.max(0, Math.min(100, score));
}

function calculateConsistency(patterns: PatternResult): number {
  // Win rate is a proxy for consistency
  return Math.max(0, Math.min(100, patterns.winRate));
}

function calculateEmotionalControl(mistakes: MistakeResult[]): number {
  const panic = mistakes.find(m => m.id === "panic_sell")?.frequency || 0;
  const fomo = mistakes.find(m => m.id === "fomo_buy")?.frequency || 0;
  let score = 100 - (panic * 20) - (fomo * 10);
  return Math.max(0, Math.min(100, score));
}

export function generateTradingDNA(
  txs: RawTransaction[],
  mistakes: MistakeResult[],
  patterns: PatternResult
): ScoreEngineResult {
  const discipline = calculateDiscipline(mistakes);
  const patience = calculatePatience(mistakes, patterns);
  const confidence = calculateConfidence(patterns);
  const riskControl = calculateRiskControl(mistakes, patterns);
  const consistency = calculateConsistency(patterns);
  const emotionalControl = calculateEmotionalControl(mistakes);

  const radarValues = {
    discipline: Math.round(discipline),
    patience: Math.round(patience),
    confidence: Math.round(confidence),
    riskControl: Math.round(riskControl),
    consistency: Math.round(consistency),
    emotionalControl: Math.round(emotionalControl),
  };

  const behaviorScore = Math.round(
    (discipline + patience + riskControl + consistency + emotionalControl) / 5
  );

  // Determine strengths and weaknesses
  const radarEntries = Object.entries(radarValues);
  radarEntries.sort((a, b) => b[1] - a[1]);
  
  const topStrength = radarEntries[0][0]; // the key
  const topWeakness = radarEntries[radarEntries.length - 1][0];

  return {
    behaviorScore,
    radarValues,
    trend: 0, // This would be calculated by comparing with historical DB entries
    topStrength,
    topWeakness,
  };
}
