import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { tradingReplays, replayTransactions, replayReviews } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
const router = Router();
// ─── Schemas ────────────────────────────────────────────
const saveReplaySchema = z.object({
    coinId: z.string().min(1),
    symbol: z.string().min(1),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    startCapital: z.number().positive(),
    finalBalance: z.number(),
    userReturn: z.number(),
    buyAndHoldReturn: z.number(),
    totalTrades: z.number().int().min(0),
    winRate: z.number().min(0).max(100),
    maxDrawdown: z.number(),
    averageHoldingTime: z.number().min(0),
    replayDuration: z.number().int().min(0),
    trades: z.array(z.object({
        timestamp: z.number().int(),
        action: z.enum(["buy", "sell"]),
        price: z.number().positive(),
        quantity: z.number().positive(),
        cashBalance: z.number(),
        portfolioValue: z.number(),
    })),
    // Optional AI review (passed from client after calling /ai/replay-review)
    review: z.object({
        critique: z.string(),
        aiGrade: z.string(),
        promptVersion: z.string().default("v1"),
    }).optional(),
});
// ─── GET /replay/history ─────────────────────────────────
router.get("/history", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const replays = await db
            .select()
            .from(tradingReplays)
            .where(eq(tradingReplays.userId, userId))
            .orderBy(desc(tradingReplays.createdAt))
            .limit(50);
        // Fetch review for each replay
        const replayIds = replays.map((r) => r.id);
        let reviewsMap = {};
        if (replayIds.length > 0) {
            // Fetch all reviews for these replays
            for (const rid of replayIds) {
                const [review] = await db
                    .select()
                    .from(replayReviews)
                    .where(eq(replayReviews.replayId, rid))
                    .limit(1);
                if (review)
                    reviewsMap[rid] = review;
            }
        }
        const result = replays.map((r) => ({
            ...r,
            startCapital: Number(r.startCapital),
            finalBalance: Number(r.finalBalance),
            userReturn: Number(r.userReturn),
            buyAndHoldReturn: Number(r.buyAndHoldReturn),
            winRate: Number(r.winRate),
            maxDrawdown: Number(r.maxDrawdown),
            averageHoldingTime: Number(r.averageHoldingTime),
            review: reviewsMap[r.id] ?? null,
        }));
        res.json(result);
    }
    catch (err) {
        console.error("Replay history error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ─── GET /replay/:id/trades ──────────────────────────────
router.get("/:id/trades", requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        // Verify the replay belongs to this user
        const [replay] = await db
            .select({ userId: tradingReplays.userId })
            .from(tradingReplays)
            .where(eq(tradingReplays.id, id))
            .limit(1);
        if (!replay || replay.userId !== userId) {
            res.status(404).json({ error: "Replay not found" });
            return;
        }
        const trades = await db
            .select()
            .from(replayTransactions)
            .where(eq(replayTransactions.replayId, id));
        res.json(trades.map((t) => ({
            ...t,
            price: Number(t.price),
            quantity: Number(t.quantity),
            cashBalance: Number(t.cashBalance),
            portfolioValue: Number(t.portfolioValue),
        })));
    }
    catch (err) {
        console.error("Replay trades error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ─── POST /replay/save ───────────────────────────────────
router.post("/save", requireAuth, validate(saveReplaySchema), async (req, res) => {
    try {
        const { coinId, symbol, difficulty, startCapital, finalBalance, userReturn, buyAndHoldReturn, totalTrades, winRate, maxDrawdown, averageHoldingTime, replayDuration, trades, review, } = req.body;
        const userId = req.user.userId;
        const [savedReplay] = await db
            .insert(tradingReplays)
            .values({
            userId,
            coinId,
            symbol,
            difficulty,
            startCapital: String(startCapital),
            finalBalance: String(finalBalance),
            userReturn: String(userReturn),
            buyAndHoldReturn: String(buyAndHoldReturn),
            totalTrades,
            winRate: String(winRate),
            maxDrawdown: String(maxDrawdown),
            averageHoldingTime: String(averageHoldingTime),
            replayDuration,
        })
            .returning();
        // Insert individual simulation trades
        if (trades && trades.length > 0) {
            await db.insert(replayTransactions).values(trades.map((t) => ({
                replayId: savedReplay.id,
                timestamp: t.timestamp,
                action: t.action,
                price: String(t.price),
                quantity: String(t.quantity),
                cashBalance: String(t.cashBalance),
                portfolioValue: String(t.portfolioValue),
            })));
        }
        // If a review was provided, save it too
        let savedReview = null;
        if (review) {
            const [r] = await db
                .insert(replayReviews)
                .values({
                replayId: savedReplay.id,
                critique: review.critique,
                aiGrade: review.aiGrade,
                promptVersion: review.promptVersion ?? "v1",
            })
                .returning();
            savedReview = r;
        }
        res.status(201).json({
            replay: {
                ...savedReplay,
                startCapital: Number(savedReplay.startCapital),
                finalBalance: Number(savedReplay.finalBalance),
                userReturn: Number(savedReplay.userReturn),
                buyAndHoldReturn: Number(savedReplay.buyAndHoldReturn),
                winRate: Number(savedReplay.winRate),
                maxDrawdown: Number(savedReplay.maxDrawdown),
                averageHoldingTime: Number(savedReplay.averageHoldingTime),
            },
            review: savedReview,
        });
    }
    catch (err) {
        console.error("Replay save error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
