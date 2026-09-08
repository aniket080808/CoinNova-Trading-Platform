import { Router } from "express";
import { desc, sql, eq, and, ne, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, transactions, notifications, orders, referrals, holdings } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { config } from "../config.js";
import { sendAccountBlockedEmail, sendAccountUnblockedEmail } from "../services/email.js";

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
        isBlocked: users.isBlocked,
        blockReason: users.blockReason,
        blockedAt: users.blockedAt,
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

// POST /admin/users/:id/block
router.post("/users/:id/block", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ error: "A valid suspension reason is required." });
    }

    if (id === req.user!.userId) {
      return res.status(400).json({ error: "Administrators cannot suspend their own account." });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id as string))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.role === "admin" || user.email === config.adminEmail) {
      return res.status(400).json({ error: "Administrator accounts cannot be suspended." });
    }

    const trimmedReason = reason.trim();
    const blockedAt = new Date();

    // 1. Update user account status
    await db
      .update(users)
      .set({
        isBlocked: true,
        blockReason: trimmedReason,
        blockedAt,
      })
      .where(eq(users.id, id as string));

    // 2. Cancel open limit and stop orders
    try {
      await db
        .update(orders)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(and(eq(orders.userId, id as string), eq(orders.status, "open")));
    } catch (orderErr) {
      console.warn("Could not cancel open orders on user block:", orderErr);
    }

    // 3. Dispatch official email notification
    try {
      await sendAccountBlockedEmail(user.email, user.name, trimmedReason);
    } catch (emailErr) {
      console.error("Failed to send block notification email:", emailErr);
    }

    // 4. Create internal security notification
    try {
      await db.insert(notifications).values({
        userId: user.id,
        type: "security",
        title: "Account Suspended 🚫",
        message: `Your account has been suspended by an administrator. Reason: "${trimmedReason}". Please contact support@coinnova.io to appeal.`,
        link: "/settings",
      });
    } catch (notifErr) {
      console.error("Failed to insert suspension notification:", notifErr);
    }

    res.json({
      message: `Account for ${user.email} has been suspended and notification email dispatched.`,
      user: {
        id: user.id,
        isBlocked: true,
        blockReason: trimmedReason,
        blockedAt,
      },
    });
  } catch (err) {
    console.error("Block user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /admin/users/:id/unblock
router.post("/users/:id/unblock", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id as string))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Update user account status
    await db
      .update(users)
      .set({
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
      })
      .where(eq(users.id, id as string));

    // Dispatch email notification
    try {
      await sendAccountUnblockedEmail(user.email, user.name);
    } catch (emailErr) {
      console.error("Failed to send unblock notification email:", emailErr);
    }

    // Create internal notification
    try {
      await db.insert(notifications).values({
        userId: user.id,
        type: "security",
        title: "Account Re-activated ✅",
        message: "Your CoinNova account access has been restored. You may now resume trading.",
        link: "/dashboard",
      });
    } catch (notifErr) {
      console.error("Failed to insert restoration notification:", notifErr);
    }

    res.json({
      message: `Account for ${user.email} has been re-activated.`,
      user: {
        id: user.id,
        isBlocked: false,
        blockReason: null,
        blockedAt: null,
      },
    });
  } catch (err) {
    console.error("Unblock user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
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

// ─── GET /admin/kyc/verified — All Verified KYC Users ────
router.get("/kyc/verified", requireAuth, requireAdmin, async (req, res) => {
  try {
    const verified = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        kycStatus: users.kycStatus,
        kycLevel: users.kycLevel,
        kycFullName: users.kycFullName,
        kycDob: users.kycDob,
        kycCountry: users.kycCountry,
        kycDocumentType: users.kycDocumentType,
        kycDocumentNumber: users.kycDocumentNumber,
        kycSubmittedAt: users.kycSubmittedAt,
        kycReviewedAt: users.kycReviewedAt,
        createdAt: users.createdAt,
        balance: wallets.balanceUsd,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.kycStatus, "verified"))
      .orderBy(desc(users.kycReviewedAt))
      .limit(500);

    res.json(
      verified.map((u) => ({
        ...u,
        balance: Number(u.balance ?? 0),
      }))
    );
  } catch (err) {
    console.error("KYC verified error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /admin/users/:id/detail — Full User Profile ─────
router.get("/users/:id/detail", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. User profile + wallet
    const [profile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        isBlocked: users.isBlocked,
        blockReason: users.blockReason,
        blockedAt: users.blockedAt,
        kycStatus: users.kycStatus,
        kycLevel: users.kycLevel,
        kycFullName: users.kycFullName,
        kycDob: users.kycDob,
        kycCountry: users.kycCountry,
        kycDocumentType: users.kycDocumentType,
        kycDocumentNumber: users.kycDocumentNumber,
        kycSubmittedAt: users.kycSubmittedAt,
        kycReviewedAt: users.kycReviewedAt,
        referralCode: users.referralCode,
        referredBy: users.referredBy,
        createdAt: users.createdAt,
        balance: wallets.balanceUsd,
      })
      .from(users)
      .leftJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.id, id as string))
      .limit(1);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    // 2. Recent transactions (last 30)
    const recentTxs = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        coinId: transactions.coinId,
        symbol: transactions.symbol,
        amount: transactions.amount,
        price: transactions.price,
        total: transactions.total,
        status: transactions.status,
        toDest: transactions.toDest,
        reason: transactions.reason,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, id as string))
      .orderBy(desc(transactions.createdAt))
      .limit(30);

    // 3. Holdings
    const userHoldings = await db
      .select({
        coinId: holdings.coinId,
        symbol: holdings.symbol,
        name: holdings.name,
        amount: holdings.amount,
        avgPrice: holdings.avgPrice,
      })
      .from(holdings)
      .where(eq(holdings.userId, id as string));

    // 4. Referral info — who referred them
    let referrerInfo = null;
    if (profile.referredBy) {
      const [referrer] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, profile.referredBy))
        .limit(1);
      referrerInfo = referrer || null;
    }

    // 5. Users they referred
    const referredUsers = await db
      .select({
        id: referrals.id,
        referredUserId: referrals.referredUserId,
        status: referrals.status,
        rewardAmount: referrals.rewardAmount,
        claimed: referrals.claimed,
        createdAt: referrals.createdAt,
        referredName: users.name,
        referredEmail: users.email,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referredUserId, users.id))
      .where(eq(referrals.referrerId, id as string))
      .orderBy(desc(referrals.createdAt))
      .limit(50);

    // 6. Open orders
    const openOrders = await db
      .select({
        id: orders.id,
        coinId: orders.coinId,
        symbol: orders.symbol,
        type: orders.type,
        side: orders.side,
        targetPrice: orders.targetPrice,
        amount: orders.amount,
        total: orders.total,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, id as string))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    res.json({
      profile: {
        ...profile,
        balance: Number(profile.balance ?? 0),
      },
      transactions: recentTxs.map((t) => ({
        ...t,
        amount: Number(t.amount),
        price: t.price ? Number(t.price) : null,
        total: Number(t.total),
        createdAt: new Date(t.createdAt).getTime(),
      })),
      holdings: userHoldings.map((h) => ({
        ...h,
        amount: Number(h.amount),
        avgPrice: Number(h.avgPrice),
      })),
      referrer: referrerInfo,
      referredUsers: referredUsers.map((r) => ({
        ...r,
        rewardAmount: Number(r.rewardAmount),
      })),
      orders: openOrders.map((o) => ({
        ...o,
        targetPrice: Number(o.targetPrice),
        amount: Number(o.amount),
        total: Number(o.total),
      })),
    });
  } catch (err) {
    console.error("User detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /admin/referrals/analytics — Referral Program Analytics ─────
router.get("/referrals/analytics", requireAuth, requireAdmin, async (req, res) => {
  try {
    // 1. Total referral count
    const [totalRef] = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals);

    // 2. Claimed vs unclaimed
    const [claimedStats] = await db
      .select({
        claimedCount: sql<number>`count(*) FILTER (WHERE ${referrals.claimed} = true)`,
        unclaimedCount: sql<number>`count(*) FILTER (WHERE ${referrals.claimed} = false)`,
        totalDistributed: sql<number>`coalesce(sum(${referrals.rewardAmount}::numeric) FILTER (WHERE ${referrals.claimed} = true), 0)`,
        totalPending: sql<number>`coalesce(sum(${referrals.rewardAmount}::numeric) FILTER (WHERE ${referrals.claimed} = false), 0)`,
      })
      .from(referrals);

    // 3. Welcome bonus transactions total
    const [welcomeBonusStats] = await db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${transactions.total}::numeric), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.reason, "referral_welcome_bonus"));

    // 4. Top referrers leaderboard (top 20)
    const topReferrers = await db
      .select({
        referrerId: referrals.referrerId,
        referrerName: users.name,
        referrerEmail: users.email,
        totalReferred: sql<number>`count(*)`,
        totalEarned: sql<number>`coalesce(sum(${referrals.rewardAmount}::numeric) FILTER (WHERE ${referrals.claimed} = true), 0)`,
        totalPending: sql<number>`coalesce(sum(${referrals.rewardAmount}::numeric) FILTER (WHERE ${referrals.claimed} = false), 0)`,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.referrerId, users.id))
      .groupBy(referrals.referrerId, users.name, users.email)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    // 5. Referrals over time (last 30 days, grouped by day)
    const referralsByDay = await db
      .select({
        day: sql<string>`to_char(${referrals.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)`,
      })
      .from(referrals)
      .where(sql`${referrals.createdAt} >= now() - interval '30 days'`)
      .groupBy(sql`to_char(${referrals.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${referrals.createdAt}, 'YYYY-MM-DD')`);

    // 6. Users who joined via referral vs organic
    const [referredCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.referredBy} IS NOT NULL`);

    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    res.json({
      summary: {
        totalReferrals: Number(totalRef.count),
        claimedRewards: Number(claimedStats.claimedCount),
        unclaimedRewards: Number(claimedStats.unclaimedCount),
        totalDistributed: Number(claimedStats.totalDistributed),
        totalPending: Number(claimedStats.totalPending),
        welcomeBonusCount: Number(welcomeBonusStats.count),
        welcomeBonusTotal: Number(welcomeBonusStats.total),
        referredUsers: Number(referredCount.count),
        totalUsers: Number(totalUsers.count),
        conversionRate:
          Number(totalUsers.count) > 0
            ? ((Number(referredCount.count) / Number(totalUsers.count)) * 100).toFixed(1)
            : "0",
      },
      topReferrers: topReferrers.map((r) => ({
        ...r,
        totalReferred: Number(r.totalReferred),
        totalEarned: Number(r.totalEarned),
        totalPending: Number(r.totalPending),
      })),
      referralsByDay: referralsByDay.map((d) => ({
        day: d.day,
        count: Number(d.count),
      })),
    });
  } catch (err) {
    console.error("Referral analytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
