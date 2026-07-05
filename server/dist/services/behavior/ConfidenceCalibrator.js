// ─────────────────────────────────────────────────────────────────────────────
// ConfidenceCalibrator — Deterministic confidence accuracy engine
// Compares stated confidence level against actual trade outcomes.
// ─────────────────────────────────────────────────────────────────────────────
const BUCKETS = [
    { label: "0–25%", min: 0, max: 25, expected: 12.5 },
    { label: "25–50%", min: 25, max: 50, expected: 37.5 },
    { label: "50–75%", min: 50, max: 75, expected: 62.5 },
    { label: "75–100%", min: 75, max: 100, expected: 87.5 },
];
function pairTrades(txs) {
    const groups = {};
    for (const tx of txs) {
        if (!tx.coinId)
            continue;
        if (!groups[tx.coinId])
            groups[tx.coinId] = [];
        groups[tx.coinId].push(tx);
    }
    const pairs = [];
    for (const coinTxs of Object.values(groups)) {
        const sorted = [...coinTxs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const buys = [];
        for (const tx of sorted) {
            if (tx.type === "buy")
                buys.push(tx);
            else if (tx.type === "sell" && buys.length > 0) {
                const buy = buys.shift();
                if (buy.confidence == null)
                    continue;
                const buyPrice = buy.price ?? 0;
                const sellPrice = tx.price ?? 0;
                const win = buyPrice > 0 && sellPrice > buyPrice;
                pairs.push({ conf: buy.confidence, win });
            }
        }
    }
    return pairs;
}
export function calibrateConfidence(txs) {
    const tradeTxs = txs.filter(t => t.type === "buy" || t.type === "sell");
    const pairs = pairTrades(tradeTxs);
    const buckets = BUCKETS.map(b => {
        const inBucket = pairs.filter(p => p.conf >= b.min && p.conf < b.max);
        const wins = inBucket.filter(p => p.win).length;
        const avgConf = inBucket.length > 0
            ? inBucket.reduce((s, p) => s + p.conf, 0) / inBucket.length
            : b.expected;
        const actualWinRate = inBucket.length > 0 ? (wins / inBucket.length) * 100 : 0;
        return {
            bucket: b.label,
            min: b.min,
            max: b.max,
            trades: inBucket.length,
            avgConfidence: Math.round(avgConf),
            actualWinRate: Math.round(actualWinRate),
            expectedWinRate: Math.round(b.expected),
            delta: Math.round(actualWinRate - b.expected),
        };
    });
    // ── Accuracy Score ───────────────────────────────────────────────────────
    // Average absolute deviation from expected win rate, converted to a 0-100 score.
    const populatedBuckets = buckets.filter(b => b.trades > 0);
    let accuracyScore = 50; // default when not enough data
    if (populatedBuckets.length > 0) {
        const avgDeviation = populatedBuckets.reduce((s, b) => s + Math.abs(b.delta), 0) / populatedBuckets.length;
        accuracyScore = Math.max(0, Math.round(100 - avgDeviation));
    }
    // ── Overconfidence Index ─────────────────────────────────────────────────
    // High confidence bucket (75-100%) actual win rate vs expected.
    // Positive = performing worse than confidence suggests.
    const highBucket = buckets.find(b => b.min === 75);
    const overconfidenceIndex = highBucket?.trades
        ? Math.round(highBucket.expectedWinRate - highBucket.actualWinRate)
        : 0;
    // ── Underconfidence Index ────────────────────────────────────────────────
    const lowBucket = buckets.find(b => b.min === 0);
    const underconfidenceIndex = lowBucket?.trades
        ? Math.round(lowBucket.actualWinRate - lowBucket.expectedWinRate)
        : 0;
    const insight = overconfidenceIndex > 20
        ? "Your highest-confidence trades perform significantly worse than expected — a classic overconfidence bias."
        : underconfidenceIndex > 20
            ? "Your low-confidence trades perform better than expected — you tend to underestimate your own analysis."
            : accuracyScore >= 70
                ? "Your confidence levels are well-calibrated relative to your actual outcomes."
                : "Your confidence levels have significant variance from actual outcomes. Focus on consistency.";
    return {
        accuracyScore,
        overconfidenceIndex: Math.max(0, overconfidenceIndex),
        underconfidenceIndex: Math.max(0, underconfidenceIndex),
        buckets,
        formula: "Accuracy = 100 - avg(|actual_win_rate - expected_win_rate|) per confidence bucket",
        insight,
    };
}
