import { Router } from "express";
import crypto from "crypto";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, referrals, notifications, transactions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── GET /referrals/stats ────────────────────────────────
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If user has no referral code, generate one from name or email
    let referralCode = user.referralCode;
    if (!referralCode) {
      const raw = (user.name || user.email.split("@")[0] || "NOVA")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      const prefix = raw.length >= 3 ? raw : "NOVA";
      let candidate = `${prefix}-${crypto.randomInt(1000, 9999)}`;
      let exists = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, candidate)).limit(1);
      while (exists.length > 0) {
        candidate = `${prefix}-${crypto.randomInt(1000, 9999)}`;
        exists = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, candidate)).limit(1);
      }
      await db.update(users).set({ referralCode: candidate }).where(eq(users.id, user.id));
      referralCode = candidate;
    }

    // Get all referrals
    const refs = await db
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
      .where(eq(referrals.referrerId, req.user!.userId));

    const totalEarned = refs
      .filter((r) => r.claimed)
      .reduce((sum, r) => sum + Number(r.rewardAmount), 0);

    const pendingRewards = refs
      .filter((r) => !r.claimed)
      .reduce((sum, r) => sum + Number(r.rewardAmount), 0);

    const totalReferred = refs.length;

    res.json({
      referralCode,
      totalReferred,
      totalEarned,
      pendingRewards,
      friends: refs.map((r) => ({
        id: r.id,
        name: r.referredName || "Trader",
        email: r.referredEmail ? `${r.referredEmail.slice(0, 2)}***@***` : "—",
        status: r.claimed ? "Claimed" : "Pending",
        reward: Number(r.rewardAmount),
        claimed: r.claimed,
        joinedAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("Referral stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /referrals/claim ──────────────────────────────
router.post("/claim", requireAuth, async (req, res) => {
  try {
    // Get all unclaimed, completed referrals
    const claimable = await db
      .select({
        id: referrals.id,
        rewardAmount: referrals.rewardAmount,
      })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerId, req.user!.userId),
          eq(referrals.status, "completed"),
          eq(referrals.claimed, false)
        )
      );

    if (claimable.length === 0) {
      return res.status(400).json({ error: "No rewards available to claim" });
    }

    const totalReward = claimable.reduce((s, r) => s + Number(r.rewardAmount), 0);

    await db.transaction(async (trx) => {
      // Credit wallet
      await trx
        .update(wallets)
        .set({
          balanceUsd: sql`${wallets.balanceUsd}::numeric + ${String(totalReward)}`,
        })
        .where(eq(wallets.userId, req.user!.userId));

      // Mark all as claimed
      for (const r of claimable) {
        await trx
          .update(referrals)
          .set({ claimed: true })
          .where(eq(referrals.id, r.id));
      }

      // Record deposit transaction
      await trx.insert(transactions).values({
        userId: req.user!.userId,
        type: "deposit",
        amount: String(totalReward),
        total: String(totalReward),
        status: "completed",
        reason: "referral_bonus",
        toDest: "Referral Rewards Claimed",
      });
    });

    // Notify user
    await db.insert(notifications).values({
      userId: req.user!.userId,
      type: "deposit",
      title: "Referral Reward Claimed! 🎉",
      message: `$${totalReward.toFixed(2)} referral bonus has been credited to your wallet.`,
      link: "/wallet",
    });

    res.json({
      message: `$${totalReward.toFixed(2)} referral rewards claimed successfully!`,
      amountClaimed: totalReward,
    });
  } catch (err) {
    console.error("Referral claim error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
