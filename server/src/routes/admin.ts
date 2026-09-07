import { Router } from "express";
import { desc, sql, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, transactions, notifications } from "../db/schema.js";
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
    const updated = await db
      .update(transactions)
      .set({ status: "completed" })
      .where(and(eq(transactions.id, id as string), eq(transactions.type, "withdraw"), eq(transactions.status, "pending")))
      .returning();

    if (updated.length === 0) {
      return res.status(400).json({ error: "Transaction not found or already processed" });
    }

    res.json({ message: "Withdrawal approved" });
  } catch (err) { console.error("Approve error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /admin/withdrawals/:id/reject
router.post("/withdrawals/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let refundedTx: typeof transactions.$inferSelect | null = null;

    await db.transaction(async (trx) => {
      const updated = await trx
        .update(transactions)
        .set({ status: "failed" })
        .where(and(eq(transactions.id, id as string), eq(transactions.type, "withdraw"), eq(transactions.status, "pending")))
        .returning();

      if (updated.length === 0) {
        return;
      }

      refundedTx = updated[0];

      // Atomically refund the user wallet
      await trx
        .update(wallets)
        .set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${refundedTx.amount}` })
        .where(eq(wallets.userId, refundedTx.userId));
    });

    if (!refundedTx) {
      return res.status(400).json({ error: "Transaction not found or already processed" });
    }

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

// ─── KYC Admin Routes ────────────────────────────────────

// GET /admin/kyc/pending
router.get("/kyc/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const pending = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        kycStatus: users.kycStatus,
        kycFullName: users.kycFullName,
        kycDob: users.kycDob,
        kycCountry: users.kycCountry,
        kycDocumentType: users.kycDocumentType,
        kycDocumentNumber: users.kycDocumentNumber,
        kycSubmittedAt: users.kycSubmittedAt,
      })
      .from(users)
      .where(eq(users.kycStatus, "pending"))
      .orderBy(desc(users.kycSubmittedAt))
      .limit(100);

    res.json(pending);
  } catch (err) {
    console.error("KYC pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/kyc/:userId/approve
router.post("/kyc/:userId/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const updated = await db
      .update(users)
      .set({
        kycStatus: "verified",
        kycLevel: 2,
        kycReviewedAt: new Date(),
        kycRejectionReason: null,
      })
      .where(and(eq(users.id, userId as string), eq(users.kycStatus, "pending")))
      .returning({ id: users.id });

    if (updated.length === 0) {
      return res.status(400).json({ error: "User not found or KYC is not pending" });
    }

    // Notify user
    await db.insert(notifications).values({
      userId: userId as string,
      type: "security",
      title: "KYC Approved ✅",
      message: "Your identity has been verified! You are now Tier 2 with unlimited withdrawal access.",
      link: "/settings",
    });

    res.json({ message: "KYC approved. User upgraded to Tier 2." });
  } catch (err) {
    console.error("KYC approve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/kyc/:userId/reject
router.post("/kyc/:userId/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const updated = await db
      .update(users)
      .set({
        kycStatus: "rejected",
        kycReviewedAt: new Date(),
        kycRejectionReason: reason || "Your submitted documents did not pass verification.",
      })
      .where(and(eq(users.id, userId as string), eq(users.kycStatus, "pending")))
      .returning({ id: users.id });

    if (updated.length === 0) {
      return res.status(400).json({ error: "User not found or KYC is not pending" });
    }

    // Notify user
    await db.insert(notifications).values({
      userId: userId as string,
      type: "security",
      title: "KYC Rejected ❌",
      message: `Your identity verification was rejected: ${reason || "Documents did not pass verification."}. You may resubmit.`,
      link: "/settings",
    });

    res.json({ message: "KYC rejected." });
  } catch (err) {
    console.error("KYC reject error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
