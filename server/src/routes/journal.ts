import { Router } from "express";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { tradeJournals, transactions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const saveJournalSchema = z.object({
  transactionId: z.string().uuid().optional(),
  notes: z.string().min(1).max(2000),
});

// ─── GET /journal ────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const journals = await db
      .select({
        id: tradeJournals.id,
        transactionId: tradeJournals.transactionId,
        notes: tradeJournals.notes,
        sentiment: tradeJournals.sentiment,
        createdAt: tradeJournals.createdAt,
        // Join transaction details
        txType: transactions.type,
        txCoinId: transactions.coinId,
        txSymbol: transactions.symbol,
        txAmount: transactions.amount,
        txPrice: transactions.price,
        txTotal: transactions.total,
        txReason: transactions.reason,
        txConfidence: transactions.confidence,
        txCreatedAt: transactions.createdAt,
      })
      .from(tradeJournals)
      .leftJoin(transactions, eq(tradeJournals.transactionId, transactions.id))
      .where(eq(tradeJournals.userId, userId))
      .orderBy(desc(tradeJournals.createdAt))
      .limit(100);

    res.json(journals.map((j) => ({
      ...j,
      txAmount: j.txAmount ? Number(j.txAmount) : null,
      txPrice: j.txPrice ? Number(j.txPrice) : null,
      txTotal: j.txTotal ? Number(j.txTotal) : null,
      txCreatedAt: j.txCreatedAt ? new Date(j.txCreatedAt).getTime() : null,
    })));
  } catch (err) {
    console.error("Journal list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /journal ────────────────────────────────────────

router.post("/", requireAuth, validate(saveJournalSchema), async (req, res) => {
  try {
    const { transactionId, notes } = req.body;
    const userId = req.user!.userId;

    // If transactionId provided, verify it belongs to this user
    if (transactionId) {
      const [tx] = await db
        .select({ userId: transactions.userId })
        .from(transactions)
        .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
        .limit(1);
      if (!tx) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }
    }

    // Upsert: if journal for this tx exists, update it
    if (transactionId) {
      const [existing] = await db
        .select({ id: tradeJournals.id })
        .from(tradeJournals)
        .where(and(eq(tradeJournals.userId, userId), eq(tradeJournals.transactionId, transactionId)))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(tradeJournals)
          .set({ notes })
          .where(eq(tradeJournals.id, existing.id))
          .returning();
        res.json(updated);
        return;
      }
    }

    const [journal] = await db
      .insert(tradeJournals)
      .values({ userId, transactionId: transactionId ?? null, notes })
      .returning();

    res.status(201).json(journal);
  } catch (err) {
    console.error("Journal save error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /journal/:id ─────────────────────────────────

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const [j] = await db
      .select({ userId: tradeJournals.userId })
      .from(tradeJournals)
      .where(eq(tradeJournals.id, id as string))
      .limit(1);

    if (!j || j.userId !== userId) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    await db.delete(tradeJournals).where(eq(tradeJournals.id, id as string));
    res.json({ message: "Journal entry deleted" });
  } catch (err) {
    console.error("Journal delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
