import { Router } from "express";
import { z } from "zod";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { wallets, holdings, transactions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { verifyTransactionPin } from "../middleware/pin.js";
const router = Router();
const buySchema = z.object({
    coinId: z.string().min(1),
    symbol: z.string().min(1),
    name: z.string().min(1),
    image: z.string().default(""),
    usd: z.number().positive(),
    price: z.number().positive(),
    reason: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
});
const sellSchema = z.object({
    coinId: z.string().min(1),
    amount: z.number().positive(),
    price: z.number().positive(),
    reason: z.string().optional(),
    confidence: z.number().min(0).max(100).optional(),
});
// POST /trades/buy
router.post("/buy", requireAuth, verifyTransactionPin, validate(buySchema), async (req, res) => {
    try {
        const { coinId, symbol, name, image, usd, price } = req.body;
        const userId = req.user.userId;
        const coinAmount = usd / price;
        await db.transaction(async (tx) => {
            // Check balance
            console.log(`[BUY] Checking balance for user ${userId}...`);
            const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
            if (!wallet || Number(wallet.balanceUsd) < usd) {
                console.log(`[BUY] Insufficient balance: ${wallet?.balanceUsd} < ${usd}`);
                throw new Error("Insufficient balance");
            }
            // Deduct wallet
            console.log(`[BUY] Deducting ${usd} from wallet...`);
            await tx.update(wallets)
                .set({ balanceUsd: sql `CAST(${wallets.balanceUsd} AS NUMERIC) - CAST(${usd} AS NUMERIC)` })
                .where(eq(wallets.userId, userId));
            // Update or create holding
            console.log(`[BUY] Updating holdings for ${coinId}...`);
            const [existing] = await tx.select().from(holdings).where(and(eq(holdings.userId, userId), eq(holdings.coinId, coinId))).limit(1);
            if (existing) {
                const oldAmt = Number(existing.amount);
                const oldAvg = Number(existing.avgPrice);
                const newAmt = oldAmt + coinAmount;
                const newAvg = (oldAvg * oldAmt + price * coinAmount) / newAmt;
                await tx.update(holdings).set({ amount: String(newAmt), avgPrice: String(newAvg) }).where(eq(holdings.id, existing.id));
            }
            else {
                await tx.insert(holdings).values({ userId, coinId, symbol, name, image, amount: String(coinAmount), avgPrice: String(price) });
            }
            // Record transaction
            console.log(`[BUY] Recording transaction...`);
            const { reason, confidence } = req.body;
            await tx.insert(transactions).values({ userId, type: "buy", coinId, symbol, amount: String(coinAmount), price: String(price), total: String(usd), status: "completed", reason: reason ?? null, confidence: confidence ?? null });
        });
        console.log(`[BUY] Transaction complete. Fetching updated balance...`);
        const [updated] = await db.select({ balanceUsd: wallets.balanceUsd }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
        res.json({ message: `Bought ${coinAmount.toFixed(6)} ${symbol.toUpperCase()}`, balanceUsd: Number(updated.balanceUsd) });
    }
    catch (err) {
        console.error("Buy error details:", err);
        if (err.message === "Insufficient balance") {
            res.status(400).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || "Internal server error" });
        }
    }
});
// POST /trades/sell
router.post("/sell", requireAuth, verifyTransactionPin, validate(sellSchema), async (req, res) => {
    try {
        const { coinId, amount, price } = req.body;
        const userId = req.user.userId;
        const usd = amount * price;
        let symbolToReturn = "";
        await db.transaction(async (tx) => {
            console.log(`[SELL] Fetching holdings for ${coinId}...`);
            const [holding] = await tx.select().from(holdings).where(and(eq(holdings.userId, userId), eq(holdings.coinId, coinId))).limit(1);
            if (!holding || Number(holding.amount) < amount) {
                throw new Error("Insufficient holdings");
            }
            symbolToReturn = holding.symbol;
            const remaining = Number(holding.amount) - amount;
            console.log(`[SELL] Updating holdings...`);
            if (remaining < 1e-10) {
                await tx.delete(holdings).where(eq(holdings.id, holding.id));
            }
            else {
                await tx.update(holdings).set({ amount: String(remaining) }).where(eq(holdings.id, holding.id));
            }
            // Credit wallet
            console.log(`[SELL] Crediting ${usd} to wallet...`);
            await tx.update(wallets)
                .set({ balanceUsd: sql `CAST(${wallets.balanceUsd} AS NUMERIC) + CAST(${usd} AS NUMERIC)` })
                .where(eq(wallets.userId, userId));
            console.log(`[SELL] Recording transaction...`);
            await tx.insert(transactions).values({ userId, type: "sell", coinId, symbol: holding.symbol, amount: String(amount), price: String(price), total: String(usd), status: "completed" });
        });
        console.log(`[SELL] Transaction complete. Fetching updated balance...`);
        const [updated] = await db.select({ balanceUsd: wallets.balanceUsd }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
        res.json({ message: `Sold ${amount.toFixed(6)} ${symbolToReturn.toUpperCase()}`, balanceUsd: Number(updated.balanceUsd) });
    }
    catch (err) {
        console.error("Sell error details:", err);
        if (err.message === "Insufficient holdings") {
            res.status(400).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || "Internal server error" });
        }
    }
});
// GET /trades — transaction history
router.get("/", requireAuth, async (req, res) => {
    try {
        const txs = await db.select().from(transactions).where(eq(transactions.userId, req.user.userId)).orderBy(desc(transactions.createdAt)).limit(100);
        res.json(txs.map(t => ({ ...t, amount: Number(t.amount), price: t.price ? Number(t.price) : null, total: Number(t.total), createdAt: new Date(t.createdAt).getTime() })));
    }
    catch (err) {
        console.error("Trades list error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /trades/portfolio — holdings
router.get("/portfolio", requireAuth, async (req, res) => {
    try {
        const h = await db.select().from(holdings).where(eq(holdings.userId, req.user.userId));
        res.json(h.map(x => ({ ...x, amount: Number(x.amount), avgPrice: Number(x.avgPrice) })));
    }
    catch (err) {
        console.error("Portfolio error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
