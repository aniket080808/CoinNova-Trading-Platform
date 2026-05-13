import { Router, raw } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { wallets, transactions, users } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { payment, stripe } from "../services/payment.js";
import { config } from "../config.js";
import { sendDepositConfirmation, sendWithdrawalAlert } from "../services/email.js";
import { verifyTransactionPin } from "../middleware/pin.js";

const router = Router();

const depositSchema = z.object({ amount: z.number().positive().max(1_000_000) });
const withdrawSchema = z.object({ amount: z.number().positive(), bank: z.string().min(1).max(255) });
const transferSchema = z.object({ amount: z.number().positive(), recipient: z.string().email() });

// GET /wallet
router.get("/", requireAuth, async (req, res) => {
  try {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, req.user!.userId)).limit(1);
    if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
    res.json({ balanceUsd: Number(wallet.balanceUsd) });
  } catch (err) { console.error("Get wallet error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /wallet/deposit — create Stripe Checkout session
router.post("/deposit", requireAuth, verifyTransactionPin, validate(depositSchema), async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await payment.createCheckoutSession({ userId: req.user!.userId, email: req.user!.email, amountUsd: amount });
    await db.insert(transactions).values({ userId: req.user!.userId, type: "deposit", amount: String(amount), total: String(amount), status: "pending", toDest: "Stripe", stripeSessionId: result.sessionId });
    res.json({ url: result.url, sessionId: result.sessionId });
  } catch (err) { console.error("Deposit error:", err); res.status(500).json({ error: "Failed to create checkout session" }); }
});

// POST /wallet/deposit/confirm — manual confirm for dev/test
router.post("/deposit/confirm", requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") { res.status(400).json({ error: "Payment not completed" }); return; }
    const userId = session.metadata?.userId;
    if (!userId || userId !== req.user!.userId) { res.status(403).json({ error: "Session does not belong to this user" }); return; }
    const [existingTx] = await db.select().from(transactions).where(eq(transactions.stripeSessionId, sessionId)).limit(1);
    if (existingTx && existingTx.status === "completed") { res.json({ message: "Already processed" }); return; }
    const amountUsd = (session.amount_total ?? 0) / 100;
    await db.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${amountUsd}` }).where(eq(wallets.userId, userId));
    if (existingTx) { await db.update(transactions).set({ status: "completed" }).where(eq(transactions.id, existingTx.id)); }
    else { await db.insert(transactions).values({ userId, type: "deposit", amount: String(amountUsd), total: String(amountUsd), status: "completed", toDest: "Stripe", stripeSessionId: sessionId }); }
    await sendDepositConfirmation(req.user!.email, amountUsd);
    const [wallet] = await db.select({ balanceUsd: wallets.balanceUsd }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
    res.json({ message: "Deposit confirmed", balanceUsd: Number(wallet.balanceUsd) });
  } catch (err) { console.error("Deposit confirm error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /wallet/webhook — Stripe webhook
router.post("/webhook", raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const event = payment.verifyWebhookEvent(req.body, sig);
  if (!event) { res.status(400).json({ error: "Webhook verification failed" }); return; }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const userId = session.metadata?.userId;
    const amountUsd = (session.amount_total ?? 0) / 100;

    if (userId && amountUsd > 0) {
      try {
        await db.transaction(async (tx) => {
          // Check if already processed
          const [existingTx] = await tx.select().from(transactions).where(eq(transactions.stripeSessionId, session.id)).limit(1);
          if (existingTx && existingTx.status === "completed") {
            return; // Already processed
          }

          await tx.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${amountUsd}` }).where(eq(wallets.userId, userId));
          
          if (existingTx) {
            await tx.update(transactions).set({ status: "completed" }).where(eq(transactions.id, existingTx.id));
          } else {
            await tx.insert(transactions).values({ userId, type: "deposit", amount: String(amountUsd), total: String(amountUsd), status: "completed", toDest: "Stripe", stripeSessionId: session.id });
          }

          const [user] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
          if (user) await sendDepositConfirmation(user.email, amountUsd);
        });
      } catch (err) {
        console.error("Webhook processing error:", err);
      }
    }
  }
  res.json({ received: true });
});

// POST /wallet/withdraw
router.post("/withdraw", requireAuth, verifyTransactionPin, validate(withdrawSchema), async (req, res) => {
  try {
    const { amount, bank } = req.body;
    const userId = req.user!.userId;
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (!wallet || Number(wallet.balanceUsd) < amount) { res.status(400).json({ error: "Insufficient balance" }); return; }
    await db.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric - ${amount}` }).where(eq(wallets.userId, userId));
    await db.insert(transactions).values({ userId, type: "withdraw", amount: String(amount), total: String(amount), status: "pending", toDest: bank });
    await sendWithdrawalAlert(req.user!.email, amount, bank);
    const [updated] = await db.select({ balanceUsd: wallets.balanceUsd }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
    res.json({ message: "Withdrawal initiated", balanceUsd: Number(updated.balanceUsd) });
  } catch (err) { console.error("Withdraw error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /wallet/transfer
router.post("/transfer", requireAuth, verifyTransactionPin, validate(transferSchema), async (req, res) => {
  try {
    const { amount, recipient } = req.body;
    const userId = req.user!.userId;

    const [recipientUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, recipient)).limit(1);
    if (!recipientUser) { res.status(404).json({ error: "Recipient not found" }); return; }
    if (recipientUser.id === userId) { res.status(400).json({ error: "Cannot transfer to yourself" }); return; }

    await db.transaction(async (tx) => {
      const [wallet] = await tx.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
      if (!wallet || Number(wallet.balanceUsd) < amount) {
        throw new Error("Insufficient balance");
      }

      await tx.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric - ${amount}` }).where(eq(wallets.userId, userId));
      await tx.update(wallets).set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${amount}` }).where(eq(wallets.userId, recipientUser.id));

      await tx.insert(transactions).values([
        { userId, type: "transfer", amount: String(amount), total: String(amount), status: "completed", toDest: recipient },
        { userId: recipientUser.id, type: "deposit", amount: String(amount), total: String(amount), status: "completed", toDest: `Transfer from ${req.user!.email}` },
      ]);
    });

    const [updated] = await db.select({ balanceUsd: wallets.balanceUsd }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
    res.json({ message: `Sent $${amount.toFixed(2)} to ${recipient}`, balanceUsd: Number(updated.balanceUsd) });
  } catch (err: any) {
    console.error("Transfer error:", err);
    if (err.message === "Insufficient balance") {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;
