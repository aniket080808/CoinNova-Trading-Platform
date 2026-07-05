// ─────────────────────────────────────────────────────────────────────────────
// MistakeDetector — Deterministic mistake detection engine
// Scans transaction history for recurring behavioral mistakes.
// ─────────────────────────────────────────────────────────────────────────────

import type { RawTransaction, MistakeResult } from "./types.js";

const PUMP_THRESHOLD = 0.05;  // 5% price rise = potential FOMO buy signal
const DROP_THRESHOLD = 0.05;  // 5% price drop = potential panic sell signal
const HOLD_LOSS_HOURS = 7 * 24; // 7 days
const QUICK_EXIT_HOURS = 24;

/**
 * Groups transactions by coin, sorted oldest-first.
 */
function groupByCoin(txs: RawTransaction[]): Record<string, RawTransaction[]> {
  const groups: Record<string, RawTransaction[]> = {};
  for (const tx of txs) {
    if (!tx.coinId) continue;
    if (!groups[tx.coinId]) groups[tx.coinId] = [];
    groups[tx.coinId].push(tx);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  return groups;
}

/**
 * Pairs up buy → sell transactions to compute holding periods and PnL.
 */
function pairTrades(coinTxs: RawTransaction[]): Array<{
  buy: RawTransaction;
  sell: RawTransaction;
  holdHours: number;
  pnlPct: number;
}> {
  const pairs: Array<{ buy: RawTransaction; sell: RawTransaction; holdHours: number; pnlPct: number }> = [];
  const buys: RawTransaction[] = [];

  for (const tx of coinTxs) {
    if (tx.type === "buy") {
      buys.push(tx);
    } else if (tx.type === "sell" && buys.length > 0) {
      const buy = buys.shift()!;
      const holdHours = (tx.createdAt.getTime() - buy.createdAt.getTime()) / (1000 * 60 * 60);
      const buyPrice = buy.price ?? 0;
      const sellPrice = tx.price ?? 0;
      const pnlPct = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
      pairs.push({ buy, sell: tx, holdHours, pnlPct });
    }
  }
  return pairs;
}

export function detectMistakes(txs: RawTransaction[]): MistakeResult[] {
  const tradeTxs = txs.filter(t => t.type === "buy" || t.type === "sell");
  const groups = groupByCoin(tradeTxs);
  const results: MistakeResult[] = [];

  // ── 1. FOMO Buy ─────────────────────────────────────────────────────────
  const fomoByLabel = tradeTxs.filter(t => t.type === "buy" && t.reason === "fomo");
  const fomoFreq = fomoByLabel.length;
  if (fomoFreq > 0) {
    results.push({
      id: "fomo_buy",
      label: "FOMO Buying",
      frequency: fomoFreq,
      severity: fomoFreq >= 5 ? "high" : fomoFreq >= 2 ? "medium" : "low",
      confidence: 95,
      supportingTradeCount: fomoFreq,
      formula: `Trades with reason = "fomo" → ${fomoFreq} detected`,
      rawValues: { fomoTrades: fomoFreq, total: tradeTxs.length },
      suggestion: "Before each buy, ask: 'Would I buy this if the price hadn't just risen?' If no, wait 24 hours.",
    });
  }

  // ── 2. Panic Sell ───────────────────────────────────────────────────────
  const panicSells = tradeTxs.filter(
    t => t.type === "sell" && t.reason !== "profit_booking" && t.reason !== "long_term" && (t.confidence ?? 0) > 70
  );
  if (panicSells.length > 0) {
    results.push({
      id: "panic_sell",
      label: "Panic Selling",
      frequency: panicSells.length,
      severity: panicSells.length >= 4 ? "high" : panicSells.length >= 2 ? "medium" : "low",
      confidence: 80,
      supportingTradeCount: panicSells.length,
      formula: `Sells where reason ≠ profit_booking AND confidence > 70% → ${panicSells.length} detected`,
      rawValues: { panicSells: panicSells.length, threshold: "confidence > 70%" },
      suggestion: "Set a stop-loss rule before entering a trade. Never sell based on fear alone — sell based on your original exit criteria.",
    });
  }

  // ── 3. Early Exit (sold within 24h at a gain) ───────────────────────────
  let earlyExits = 0;
  for (const pairs of Object.values(groups)) {
    for (const p of pairTrades(pairs)) {
      if (p.holdHours < QUICK_EXIT_HOURS && p.pnlPct > 0) earlyExits++;
    }
  }
  if (earlyExits > 0) {
    results.push({
      id: "early_exit",
      label: "Exiting Too Early",
      frequency: earlyExits,
      severity: earlyExits >= 5 ? "high" : earlyExits >= 2 ? "medium" : "low",
      confidence: 75,
      supportingTradeCount: earlyExits,
      formula: `Buy→Sell pairs: holdingTime < ${QUICK_EXIT_HOURS}h AND PnL > 0% → ${earlyExits} detected`,
      rawValues: { earlyExits, threshold: `< ${QUICK_EXIT_HOURS}h holding with profit` },
      suggestion: "Define a minimum holding target before buying. Missing a top is better than selling too early repeatedly.",
    });
  }

  // ── 4. Long Hold Losers (held >7 days at a loss) ────────────────────────
  let longHoldLosers = 0;
  for (const pairs of Object.values(groups)) {
    for (const p of pairTrades(pairs)) {
      if (p.holdHours > HOLD_LOSS_HOURS && p.pnlPct < 0) longHoldLosers++;
    }
  }
  if (longHoldLosers > 0) {
    results.push({
      id: "long_hold_loser",
      label: "Holding Losers Too Long",
      frequency: longHoldLosers,
      severity: longHoldLosers >= 4 ? "high" : longHoldLosers >= 2 ? "medium" : "low",
      confidence: 80,
      supportingTradeCount: longHoldLosers,
      formula: `Buy→Sell pairs: holdingTime > ${HOLD_LOSS_HOURS}h AND PnL < 0% → ${longHoldLosers} detected`,
      rawValues: { longHoldLosers, threshold: `> ${HOLD_LOSS_HOURS}h with loss` },
      suggestion: "Set a maximum loss tolerance (e.g., -15%) before entering any trade. A stop-loss prevents small losses from becoming large ones.",
    });
  }

  // ── 5. Overtrading (>3 trades in any 24h window) ────────────────────────
  let overtradingEvents = 0;
  const sorted = [...tradeTxs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (let i = 0; i < sorted.length; i++) {
    const window = sorted.filter(t =>
      Math.abs(t.createdAt.getTime() - sorted[i].createdAt.getTime()) < 24 * 60 * 60 * 1000
    );
    if (window.length > 3) { overtradingEvents++; i += window.length - 1; }
  }
  if (overtradingEvents > 0) {
    results.push({
      id: "overtrading",
      label: "Overtrading",
      frequency: overtradingEvents,
      severity: overtradingEvents >= 3 ? "high" : "medium",
      confidence: 85,
      supportingTradeCount: overtradingEvents,
      formula: `Windows of 24h with > 3 trades → ${overtradingEvents} occurrences`,
      rawValues: { windows: overtradingEvents, threshold: "> 3 trades / 24h" },
      suggestion: "Limit yourself to a maximum of 1–2 trades per day. Every additional trade adds transaction costs and emotional fatigue.",
    });
  }

  // ── 6. High Confidence Loss ─────────────────────────────────────────────
  let highConfLosses = 0;
  for (const pairs of Object.values(groups)) {
    for (const p of pairTrades(pairs)) {
      if ((p.buy.confidence ?? 0) >= 80 && p.pnlPct < -5) highConfLosses++;
    }
  }
  if (highConfLosses > 0) {
    results.push({
      id: "high_confidence_loss",
      label: "Overconfident Losing Trades",
      frequency: highConfLosses,
      severity: highConfLosses >= 3 ? "high" : "medium",
      confidence: 90,
      supportingTradeCount: highConfLosses,
      formula: `Trades: buyConfidence ≥ 80% AND PnL < -5% → ${highConfLosses} detected`,
      rawValues: { highConfLosses, thresholds: "confidence ≥ 80%, PnL < -5%" },
      suggestion: "High confidence does not equal certainty. Always size positions based on risk, not on how sure you feel.",
    });
  }

  // ── 7. Consecutive Same Coin Buys ───────────────────────────────────────
  let consecutiveSameCoin = 0;
  for (const coinTxs of Object.values(groups)) {
    const buys = coinTxs.filter(t => t.type === "buy");
    if (buys.length >= 3) consecutiveSameCoin++;
  }
  if (consecutiveSameCoin > 0) {
    results.push({
      id: "consecutive_same_coin",
      label: "Averaging Down Repeatedly",
      frequency: consecutiveSameCoin,
      severity: consecutiveSameCoin >= 2 ? "high" : "low",
      confidence: 70,
      supportingTradeCount: consecutiveSameCoin,
      formula: `Coins with ≥ 3 consecutive buy transactions → ${consecutiveSameCoin} assets`,
      rawValues: { assets: consecutiveSameCoin, threshold: "≥ 3 buys on same asset" },
      suggestion: "Averaging down can increase exposure to a failing position. Define your maximum allocation per asset before entering.",
    });
  }

  // Sort by severity then frequency
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return results.sort((a, b) =>
    severityOrder[a.severity] - severityOrder[b.severity] || b.frequency - a.frequency
  );
}

export function findMostExpensiveHabit(
  txs: RawTransaction[],
  mistakes: MistakeResult[]
): { label: string; detected: number; averageLossPct: number; largestLossAmount: number; estimatedTotalLoss: number } | null {
  if (mistakes.length === 0) return null;

  const groups = groupByCoin(txs.filter(t => t.type === "buy" || t.type === "sell"));
  const allPairs = Object.values(groups).flatMap(coinTxs => pairTrades(coinTxs));
  
  const lossCategories: Record<string, { count: number; totalLossPct: number; maxLossAmt: number; totalLossAmt: number }> = {};

  for (const p of allPairs) {
    if (p.pnlPct >= 0) continue; // Only care about losses
    const lossAmt = p.buy.price ? ((p.sell.price ?? 0) - p.buy.price) * p.buy.amount : 0;

    // Classify this loss
    let category = "Unknown";
    if (p.buy.reason === "fomo") category = "FOMO Buying";
    else if (p.sell.reason === "panic") category = "Panic Selling";
    else if (p.holdHours > HOLD_LOSS_HOURS) category = "Holding Losers Too Long";
    else if ((p.buy.confidence ?? 0) >= 80) category = "Overconfident Buying";
    
    if (category !== "Unknown") {
      if (!lossCategories[category]) {
        lossCategories[category] = { count: 0, totalLossPct: 0, maxLossAmt: 0, totalLossAmt: 0 };
      }
      lossCategories[category].count++;
      lossCategories[category].totalLossPct += p.pnlPct;
      lossCategories[category].totalLossAmt += lossAmt;
      if (Math.abs(lossAmt) > Math.abs(lossCategories[category].maxLossAmt)) {
        lossCategories[category].maxLossAmt = lossAmt;
      }
    }
  }

  let worstHabit = null;
  let maxTotalLoss = 0;

  for (const [label, data] of Object.entries(lossCategories)) {
    if (Math.abs(data.totalLossAmt) > Math.abs(maxTotalLoss)) {
      maxTotalLoss = data.totalLossAmt;
      worstHabit = {
        label,
        detected: data.count,
        averageLossPct: Math.round((data.totalLossPct / data.count) * 10) / 10,
        largestLossAmount: Math.round(data.maxLossAmt),
        estimatedTotalLoss: Math.round(data.totalLossAmt)
      };
    }
  }

  return worstHabit;
}

