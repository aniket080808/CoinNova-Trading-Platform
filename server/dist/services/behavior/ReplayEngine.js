// ─────────────────────────────────────────────────────────────────────────────
// ReplayEngine — Deterministic Trade Replay Analysis
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeTradeReplay(buyTx, sellTx) {
    // NOTE: Historical market APIs are not yet integrated.
    // This feature is currently disabled gracefully.
    // We return a mock/empty payload that the UI can use to render a "Coming Soon" state.
    const buyPrice = buyTx.price ?? 0;
    const sellPrice = sellTx.price ?? 0;
    const amount = buyTx.amount;
    const actualPnL = buyPrice > 0 ? (sellPrice - buyPrice) * amount : 0;
    return {
        actualPnL,
        ifHeld2HoursPnL: 0,
        ifHeld24HoursPnL: 0,
        ifTakeProfitPnL: null,
        ifStopLossPnL: null,
        timingEfficiency: 0,
        missedProfit: 0,
        avoidedLoss: 0,
    };
}
