import { Router } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, referrals, notifications } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── GET /referrals/stats ────────────────────────────────
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        referralCode: users.referralCode,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
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
      .filter((r) => r.status === "completed" && !r.claimed)
      .reduce((sum, r) => sum + Number(r.rewardAmount), 0);

    const totalReferred = refs.length;

    res.json({
      referralCode: user.referralCode,
      totalReferred,
      totalEarned,
      pendingRewards,
      friends: refs.map((r) => ({
        id: r.id,
        name: r.referredName,
        email: r.referredEmail ? `${r.referredEmail[0]}***@***` : "—",
        status: r.status,
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
