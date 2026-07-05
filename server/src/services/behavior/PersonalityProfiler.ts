// ─────────────────────────────────────────────────────────────────────────────
// PersonalityProfiler — Deterministic Decision DNA Engine
// Classifies each trade into a personality archetype and computes distribution.
// ─────────────────────────────────────────────────────────────────────────────

import type { RawTransaction, PersonalityResult, PersonalityTrait } from "./types.js";

const HOLD_LONG_HOURS = 30 * 24; // 30 days = long-term
const SWING_HOURS = 24;          // 24–168h = swing

type TraitKey = "momentum" | "long_term" | "swing" | "emotional" | "technical" | "fundamental";

const TRAIT_META: Record<TraitKey, { label: string; description: string }> = {
  momentum:    { label: "Momentum Trader",     description: "Buys after recent price strength with short holds." },
  long_term:   { label: "Long-term Investor",  description: "Holds positions for weeks or months with conviction." },
  swing:       { label: "Swing Trader",        description: "Captures multi-day price movements with deliberate entries." },
  emotional:   { label: "Emotional Trader",    description: "Decisions driven by FOMO or panic rather than analysis." },
  technical:   { label: "Technical Analyst",   description: "Uses chart patterns and indicators to time entries/exits." },
  fundamental: { label: "Fundamental Investor",description: "Invests based on news, fundamentals, and macro events." },
};

function classifyTrade(
  tx: RawTransaction,
  holdHours: number | null
): TraitKey {
  const reason = tx.reason ?? "";

  if (reason === "fomo" || reason === "panic") return "emotional";
  if (reason === "technical_analysis")          return "technical";
  if (reason === "fundamental" || reason === "news") return "fundamental";
  if (reason === "long_term")                   return "long_term";

  // Fallback: classify by holding period
  if (holdHours !== null) {
    if (holdHours > HOLD_LONG_HOURS) return "long_term";
    if (holdHours < SWING_HOURS)     return "momentum";
    return "swing";
  }
  return "swing";
}

function pairWithHold(txs: RawTransaction[]): Array<{ tx: RawTransaction; holdHours: number | null }> {
  const groups: Record<string, RawTransaction[]> = {};
  for (const tx of txs) {
    if (!tx.coinId) continue;
    if (!groups[tx.coinId]) groups[tx.coinId] = [];
    groups[tx.coinId].push(tx);
  }
  const result: Array<{ tx: RawTransaction; holdHours: number | null }> = [];
  for (const coinTxs of Object.values(groups)) {
    const sorted = [...coinTxs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const buys: RawTransaction[] = [];
    for (const tx of sorted) {
      if (tx.type === "buy") buys.push(tx);
      else if (tx.type === "sell" && buys.length > 0) {
        const buy = buys.shift()!;
        const holdHours = (tx.createdAt.getTime() - buy.createdAt.getTime()) / (1000 * 60 * 60);
        result.push({ tx: buy, holdHours });
      }
    }
    // Unpaired buys (still holding)
    for (const buy of buys) result.push({ tx: buy, holdHours: null });
  }
  return result;
}

export function profilePersonality(txs: RawTransaction[]): PersonalityResult {
  const tradeTxs = txs.filter(t => t.type === "buy" || t.type === "sell");
  const paired = pairWithHold(tradeTxs);

  const counts: Record<TraitKey, number> = {
    momentum: 0, long_term: 0, swing: 0,
    emotional: 0, technical: 0, fundamental: 0,
  };

  for (const { tx, holdHours } of paired) {
    const trait = classifyTrade(tx, holdHours);
    counts[trait]++;
  }

  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;

  const traits: PersonalityTrait[] = (Object.keys(counts) as TraitKey[])
    .map(key => ({
      label: TRAIT_META[key].label,
      key,
      percentage: Math.round((counts[key] / total) * 100),
      tradeCount: counts[key],
      description: TRAIT_META[key].description,
    }))
    .filter(t => t.tradeCount > 0)
    .sort((a, b) => b.percentage - a.percentage);

  // Normalize to exactly 100%
  if (traits.length > 0) {
    const diff = 100 - traits.reduce((s, t) => s + t.percentage, 0);
    traits[0].percentage += diff;
  }

  const dominant = traits[0]?.label ?? "Unknown";

  return {
    dominantTrait: dominant,
    traits,
    formula: "Trait classification per buy trade using: reason field → fallback to holding period (LONG >30d, MOMENTUM <24h, SWING otherwise)",
  };
}
