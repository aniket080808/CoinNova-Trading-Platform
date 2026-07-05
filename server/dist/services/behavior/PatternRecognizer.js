// ─────────────────────────────────────────────────────────────────────────────
// PatternRecognizer — Deterministic trading pattern analysis
// Extracts actionable patterns from the full transaction history.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIDENCE_BUCKETS = [
    { label: "0–25%", min: 0, max: 25 },
    { label: "25–50%", min: 25, max: 50 },
    { label: "50–75%", min: 50, max: 75 },
    { label: "75–100%", min: 75, max: 100 },
];
function pairTrades(coinTxs) {
    const pairs = [];
    const buys = [];
    for (const tx of coinTxs) {
        if (tx.type === "buy")
            buys.push(tx);
        else if (tx.type === "sell" && buys.length > 0) {
            const buy = buys.shift();
            const holdHours = (tx.createdAt.getTime() - buy.createdAt.getTime()) / (1000 * 60 * 60);
            const pnlPct = buy.price && buy.price > 0 ? (((tx.price ?? 0) - buy.price) / buy.price) * 100 : 0;
            pairs.push({ buy, sell: tx, holdHours, pnlPct });
        }
    }
    return pairs;
}
export function recognizePatterns(txs) {
    const tradeTxs = txs.filter(t => t.type === "buy" || t.type === "sell");
    const buys = tradeTxs.filter(t => t.type === "buy");
    const sells = tradeTxs.filter(t => t.type === "sell");
    // ── Group by coin ────────────────────────────────────────────────────────
    const groups = {};
    for (const tx of tradeTxs) {
        if (!tx.coinId)
            continue;
        if (!groups[tx.coinId])
            groups[tx.coinId] = [];
        groups[tx.coinId].push(tx);
    }
    for (const key of Object.keys(groups)) {
        groups[key].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    // ── Holding period + PnL ─────────────────────────────────────────────────
    const allPairs = [];
    for (const coinTxs of Object.values(groups))
        allPairs.push(...pairTrades(coinTxs));
    const avgHoldingPeriodHours = allPairs.length > 0
        ? allPairs.reduce((s, p) => s + p.holdHours, 0) / allPairs.length
        : 0;
    const wins = allPairs.filter(p => p.pnlPct > 0).length;
    const overallWinRate = allPairs.length > 0 ? (wins / allPairs.length) * 100 : 0;
    const largestGain = allPairs.length > 0 ? Math.max(...allPairs.map(p => p.pnlPct)) : 0;
    const largestLoss = allPairs.length > 0 ? Math.min(...allPairs.map(p => p.pnlPct)) : 0;
    // ── Most traded & best/worst asset ───────────────────────────────────────
    const coinTradeCounts = {};
    for (const pairs of Object.values(groups)) {
        if (pairs.length === 0)
            continue;
        const symbol = pairs[0].symbol ?? pairs[0].coinId ?? "?";
        const coinId = pairs[0].coinId;
        const pairsForCoin = pairTrades(pairs);
        if (!coinTradeCounts[coinId])
            coinTradeCounts[coinId] = { symbol, count: 0, wins: 0, total: 0 };
        coinTradeCounts[coinId].count += pairs.length;
        coinTradeCounts[coinId].total += pairsForCoin.length;
        coinTradeCounts[coinId].wins += pairsForCoin.filter(p => p.pnlPct > 0).length;
    }
    const coinEntries = Object.entries(coinTradeCounts);
    const mostTradedEntry = coinEntries.sort((a, b) => b[1].count - a[1].count)[0];
    const mostTradedAsset = mostTradedEntry ? mostTradedEntry[1].symbol : null;
    const withPairs = coinEntries.filter(([, v]) => v.total > 0);
    const byWinRate = withPairs.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    const bestAsset = byWinRate[0]?.[1].symbol ?? null;
    const worstAsset = byWinRate[byWinRate.length - 1]?.[1].symbol ?? null;
    // ── Win rate by reason ───────────────────────────────────────────────────
    const reasonGroups = {};
    for (const p of allPairs) {
        const reason = p.buy.reason ?? "unspecified";
        if (!reasonGroups[reason])
            reasonGroups[reason] = { wins: 0, total: 0 };
        reasonGroups[reason].total++;
        if (p.pnlPct > 0)
            reasonGroups[reason].wins++;
    }
    const winRateByReason = Object.entries(reasonGroups).map(([reason, v]) => ({
        reason,
        trades: v.total,
        wins: v.wins,
        winRate: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
    })).sort((a, b) => b.trades - a.trades);
    // ── Win rate by confidence bucket ────────────────────────────────────────
    const winRateByConfidence = CONFIDENCE_BUCKETS.map(bucket => {
        const inBucket = allPairs.filter(p => {
            const conf = p.buy.confidence ?? 50;
            return conf >= bucket.min && conf < bucket.max;
        });
        const wins = inBucket.filter(p => p.pnlPct > 0).length;
        return {
            bucket: bucket.label,
            min: bucket.min,
            max: bucket.max,
            trades: inBucket.length,
            wins,
            winRate: inBucket.length > 0 ? Math.round((wins / inBucket.length) * 100) : 0,
        };
    });
    // ── Hourly activity ──────────────────────────────────────────────────────
    const hourCounts = new Array(24).fill(0);
    for (const tx of buys)
        hourCounts[tx.createdAt.getHours()]++;
    const hourlyActivity = hourCounts.map((trades, hour) => ({ hour, trades }));
    const preferredHour = hourCounts.reduce((maxH, v, h) => (v > hourCounts[maxH] ? h : maxH), 0);
    // ── Average trade size ───────────────────────────────────────────────────
    const avgTradeSize = buys.length > 0
        ? buys.reduce((s, t) => s + t.total, 0) / buys.length
        : 0;
    return {
        totalTrades: tradeTxs.length,
        buys: buys.length,
        sells: sells.length,
        winRate: Math.round(overallWinRate),
        avgHoldingPeriodHours: Math.round(avgHoldingPeriodHours),
        mostTradedAsset,
        bestAssetByWinRate: bestAsset,
        worstAssetByWinRate: worstAsset,
        winRateByReason,
        winRateByConfidence,
        hourlyActivity,
        avgTradeSize: Math.round(avgTradeSize),
        largestGain: Math.round(largestGain * 10) / 10,
        largestLoss: Math.round(largestLoss * 10) / 10,
        preferredHour: hourCounts.some(v => v > 0) ? preferredHour : null,
    };
}
