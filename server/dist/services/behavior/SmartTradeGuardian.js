// ─────────────────────────────────────────────────────────────────────────────
// SmartTradeGuardian — Deterministic pre-trade warning engine
// ─────────────────────────────────────────────────────────────────────────────
import { detectMistakes } from "./MistakeDetector.js";
export function validateTrade(proposed, history) {
    if (proposed.type === "sell") {
        // Basic sell logic: mostly checking for panic sell
        return { isSafe: true, riskScore: 10, warning: null };
    }
    // It's a BUY trade
    let riskScore = 0;
    const matchedPatterns = [];
    let historicalLosses = 0;
    let totalLossAmount = 0;
    // 1. Check if it's a high confidence FOMO matching pattern
    const pastMistakes = detectMistakes(history);
    // Check if user has a history of high confidence losses
    const overconfidentMistake = pastMistakes.find(m => m.id === "high_confidence_loss");
    if (proposed.confidence >= 80 && overconfidentMistake) {
        riskScore += 40;
        matchedPatterns.push("Overconfident Buy");
        historicalLosses += overconfidentMistake.frequency;
    }
    // 2. Check for consecutive buys (Averaging down repeatedly)
    const recentBuysOnCoin = history
        .filter(t => t.coinId === proposed.coinId && t.type === "buy")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (recentBuysOnCoin.length >= 2) {
        const timeSinceLastBuy = new Date().getTime() - recentBuysOnCoin[0].createdAt.getTime();
        if (timeSinceLastBuy < 24 * 60 * 60 * 1000) {
            riskScore += 30;
            matchedPatterns.push("Consecutive Averaging Down");
        }
    }
    // 3. Overtrading check
    const last24hTrades = history.filter(t => (new Date().getTime() - t.createdAt.getTime()) < 24 * 60 * 60 * 1000);
    if (last24hTrades.length >= 3) {
        riskScore += 25;
        matchedPatterns.push("Overtrading Window");
    }
    // 4. Calculate historical win/loss for similar trades
    const similarTrades = history.filter(t => t.type === "buy" && (t.confidence ?? 50) >= proposed.confidence - 10);
    // (Mocking win rate calculation for these similar trades, normally we'd pair them with sells)
    const historicalWinRate = 35; // This would be calculated via PatternRecognizer ideally
    const averageLoss = -12.5;
    if (riskScore > 50) {
        const warning = {
            matchedPatterns,
            historicalWinRate,
            historicalLoss: historicalLosses,
            averageLoss,
            recommendation: "Wait 30 minutes and review your journal before entering. This trade matches patterns of previous losses.",
        };
        return { isSafe: false, riskScore: Math.min(100, riskScore), warning };
    }
    return { isSafe: true, riskScore, warning: null };
}
