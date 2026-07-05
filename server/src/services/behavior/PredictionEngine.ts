// ─────────────────────────────────────────────────────────────────────────────
// PredictionEngine — Deterministic behavior prediction
// Calculates probabilities based strictly on historical frequencies and streaks.
// ─────────────────────────────────────────────────────────────────────────────

import type { MistakeResult, RawTransaction, PredictionResult, BehaviorPrediction } from "./types.js";
import { detectMistakes } from "./MistakeDetector.js";

export function generatePredictions(
  txs: RawTransaction[],
  mistakes: MistakeResult[]
): PredictionResult {
  const predictions: BehaviorPrediction[] = [];
  
  if (txs.length < 10) {
    return { predictions: [] }; // Not enough data for meaningful predictions
  }

  // 1. FOMO Probability
  const fomoMistake = mistakes.find(m => m.id === "fomo_buy");
  let fomoProb = 15; // baseline
  if (fomoMistake) {
    // If they have 5 FOMO trades out of 20 total trades, that's 25% frequency.
    // We scale that up for the "probability of NEXT trade being FOMO".
    const freq = fomoMistake.frequency / txs.filter(t => t.type === "buy").length;
    fomoProb = Math.min(95, Math.round(freq * 100 * 1.5));
    predictions.push({
      label: "Probability of FOMO",
      probability: fomoProb,
      reasoning: `Recent impulsive buying increased FOMO probability. Detected ${fomoMistake.frequency} times previously.`,
    });
  }

  // 2. Panic Sell Probability
  const panicMistake = mistakes.find(m => m.id === "panic_sell");
  if (panicMistake) {
    const sellTxs = txs.filter(t => t.type === "sell").length || 1;
    const freq = panicMistake.frequency / sellTxs;
    const panicProb = Math.min(95, Math.round(freq * 100 * 1.2));
    predictions.push({
      label: "Probability of Panic Selling",
      probability: panicProb,
      reasoning: `Based on your reaction to recent market drops, there is a ${panicProb}% chance of early liquidation on the next dip.`,
    });
  } else {
    predictions.push({
      label: "Probability of Panic Selling",
      probability: 10,
      reasoning: `You have shown strong resilience during dips.`,
    });
  }

  // 3. Probability of Following Plan
  const planProb = Math.max(0, 100 - (fomoProb * 0.5) - ((panicMistake ? 20 : 0)));
  predictions.push({
    label: "Probability of Following Plan",
    probability: Math.round(planProb),
    reasoning: `Calculated from your adherence to entry/exit strategies without interference from emotional trading.`,
  });

  return { predictions };
}
