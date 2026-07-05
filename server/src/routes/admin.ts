import { Router } from "express";
import { desc, sql, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, transactions } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /admin/stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    const [volume] = await db.select({ total: sql<number>`coalesce(sum(${transactions.total}::numeric), 0)` }).from(transactions);

    res.json({
      users: Number(userCount.count),
      transactions: Number(txCount.count),
      totalVolume: Number(volume.total),
    });
  } catch (err) { console.error("Admin stats error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// GET /admin/users
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        balance: wallets.balanceUsd,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .orderBy(desc(users.createdAt))
      .limit(100);

    res.json(result.map(u => ({ ...u, balance: Number(u.balance ?? 0) })));
  } catch (err) { console.error("Admin users error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// GET /admin/transactions
router.get("/transactions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const txs = await db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        type: transactions.type,
        coinId: transactions.coinId,
        symbol: transactions.symbol,
        amount: transactions.amount,
        price: transactions.price,
        total: transactions.total,
        status: transactions.status,
        toDest: transactions.toDest,
        createdAt: transactions.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(200);

    res.json(txs.map(t => ({
      ...t,
      amount: Number(t.amount),
      price: t.price ? Number(t.price) : null,
      total: Number(t.total),
      createdAt: new Date(t.createdAt).getTime(),
    })));
  } catch (err) { console.error("Admin txs error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /admin/withdrawals/:id/approve
router.post("/withdrawals/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id as string)).limit(1);
    
    if (!tx || tx.type !== "withdraw" || tx.status !== "pending") {
      return res.status(400).json({ error: "Invalid transaction" });
    }

    await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, id as string));
    res.json({ message: "Withdrawal approved" });
  } catch (err) { console.error("Approve error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id as string)).limit(1);
    
    if (!tx || tx.type !== "withdraw" || tx.status !== "pending") {
      return res.status(400).json({ error: "Invalid transaction" });
    }

    // REFUND THE USER
    await db.transaction(async (trx) => {
      await trx.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${tx.amount}` }).where(eq(wallets.userId, tx.userId));
      await trx.update(transactions).set({ status: "failed" }).where(eq(transactions.id, id as string));
    });

    res.json({ message: "Withdrawal rejected and refunded" });
  } catch (err) { console.error("Reject error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// DELETE /admin/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user!.userId) return res.status(400).json({ error: "Cannot delete yourself" });
    
    await db.delete(users).where(eq(users.id, id as string));
    res.json({ message: "User deleted" });
  } catch (err) { console.error("Delete user error:", err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
