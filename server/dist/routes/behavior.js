// ─────────────────────────────────────────────────────────────────────────────
// /behavior route — Behavioral Intelligence Engine API (Trading DNA)
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { transactions, achievements, behaviorHistoryDaily } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
// ── Deterministic engines ──────────────────────────────────────────────────
import { detectMistakes, findMostExpensiveHabit } from "../services/behavior/MistakeDetector.js";
import { recognizePatterns } from "../services/behavior/PatternRecognizer.js";
import { calibrateConfidence } from "../services/behavior/ConfidenceCalibrator.js";
import { profilePersonality } from "../services/behavior/PersonalityProfiler.js";
import { generateTradingDNA } from "../services/behavior/ScoreEngine.js";
import { generatePredictions } from "../services/behavior/PredictionEngine.js";
import { validateTrade } from "../services/behavior/SmartTradeGuardian.js";
const router = Router();
// ── Helper ─────────────────────────────────────────────────────────────────
async function fetchUserTxs(userId) {
    const rawTxs = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt))
        .limit(200);
    return rawTxs.map((t) => ({
        id: t.id,
        type: t.type,
        coinId: t.coinId,
        symbol: t.symbol,
        amount: Number(t.amount),
        price: t.price ? Number(t.price) : null,
        total: Number(t.total),
        reason: t.reason,
        confidence: t.confidence,
        createdAt: new Date(t.createdAt),
    }));
}
// ── POST /behavior/scan ────────────────────────────────────────────────────
router.post("/scan", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const txs = await fetchUserTxs(userId);
        const tradeTxs = txs.filter(t => t.type === "buy" || t.type === "sell");
        if (tradeTxs.length < 2) {
            res.status(400).json({ error: "Make at least 2 buy/sell trades to generate behavioral analysis." });
            return;
        }
        const mistakes = detectMistakes(txs);
        const patterns = recognizePatterns(txs);
        const calibration = calibrateConfidence(txs);
        const personality = profilePersonality(txs);
        const mostExpensiveHabit = findMostExpensiveHabit(txs, mistakes);
        const scoreData = generateTradingDNA(txs, mistakes, patterns);
        const predictions = generatePredictions(txs, mistakes);
        // Save history snapshot deterministically
        let grade = "C";
        if (scoreData.behaviorScore >= 90)
            grade = "A+";
        else if (scoreData.behaviorScore >= 80)
            grade = "A";
        else if (scoreData.behaviorScore >= 70)
            grade = "B";
        else if (scoreData.behaviorScore >= 60)
            grade = "C+";
        else if (scoreData.behaviorScore < 40)
            grade = "F";
        const [saved] = await db.insert(behaviorHistoryDaily).values({
            userId,
            behaviorScore: scoreData.behaviorScore,
            radarValues: scoreData.radarValues,
            personality: personality.dominantTrait,
            grade,
            strengths: [scoreData.topStrength],
            weaknesses: [scoreData.topWeakness],
            trend: scoreData.trend,
        }).returning();
        // Full deterministic payload
        res.json({
            id: saved.id,
            timestamp: saved.timestamp,
            scoreData,
            grade,
            personality,
            mistakes,
            mostExpensiveHabit,
            patterns,
            calibration,
            predictions,
            tradeCount: tradeTxs.length,
        });
    }
    catch (err) {
        console.error("Behavior scan error:", err);
        res.status(500).json({ error: "Analysis failed." });
    }
});
// ── POST /behavior/guardian ────────────────────────────────────────────────
router.post("/guardian", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, coinId, amount, price, confidence } = req.body;
        if (!type || !coinId || !amount || !price || confidence === undefined) {
            res.status(400).json({ error: "Missing required trade parameters." });
            return;
        }
        const txs = await fetchUserTxs(userId);
        const proposed = { type, coinId, amount, price, confidence };
        const result = validateTrade(proposed, txs);
        res.json(result);
    }
    catch (err) {
        console.error("Guardian error:", err);
        res.status(500).json({ error: "Guardian check failed." });
    }
});
// ── GET /behavior/history ──────────────────────────────────────────────────
router.get("/history", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const history = await db
            .select()
            .from(behaviorHistoryDaily)
            .where(eq(behaviorHistoryDaily.userId, userId))
            .orderBy(desc(behaviorHistoryDaily.timestamp))
            .limit(30);
        res.json(history.reverse());
    }
    catch (err) {
        console.error("Behavior history error:", err);
        res.status(500).json({ error: "Could not fetch history" });
    }
});
// ── GET /behavior/achievements ─────────────────────────────────────────────
router.get("/achievements", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const achs = await db
            .select()
            .from(achievements)
            .where(eq(achievements.userId, userId));
        res.json(achs);
    }
    catch (err) {
        console.error("Achievements error:", err);
        res.status(500).json({ error: "Could not fetch achievements" });
    }
});
export default router;
