import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { wallets, transactions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { verifyTransactionPin } from "../middleware/pin.js";
import { razorpayAdapter, verifyRazorpaySignature } from "../services/payment.js";
import { config } from "../config.js";
import { sendDepositConfirmation } from "../services/email.js";

const router = Router();

const depositSchema = z.object({ amount: z.number().positive().max(1_000_000) });
const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  amountUsd: z.number().positive(),
});

// Step 1: Create Order
router.post("/order", requireAuth, verifyTransactionPin, async (req, res) => {
  try {
    const { amount, transactionPin, rate = 1 } = req.body;
    
    // We treat 'amount' as the amount in the user's selected currency (INR)
    // and 'rate' as the conversion rate to USD.
    const amountUsd = amount / rate;

    const result = await razorpayAdapter.createCheckoutSession({
      userId: req.user!.userId,
      email: req.user!.email,
      amountUsd: amount, // Pass the original amount (which payment service now treats as units * 100)
    });

    // Create a pending transaction with the USD amount
    await db.insert(transactions).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: String(amountUsd),
      total: String(amountUsd),
      status: "pending",
      toDest: "Razorpay",
      stripeSessionId: result.orderId,
    });

    res.json({
      orderId: result.orderId,
      key: config.razorpay.keyId,
      amount: Math.round(amount * 100), // paise
      currency: "INR",
    });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

// Step 2: Verify Payment
router.post("/verify", requireAuth, validate(verifySchema), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amountUsd } = req.body;
    const userId = req.user!.userId;

    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Success! Update wallet and transaction
    await db.transaction(async (tx) => {
      await tx.update(wallets)
        .set({ balanceUsd: sql`${wallets.balanceUsd}::numeric + ${amountUsd}` })
        .where(eq(wallets.userId, userId));

      await tx.update(transactions)
        .set({ status: "completed" })
        .where(eq(transactions.stripeSessionId, razorpay_order_id));
    });

    await sendDepositConfirmation(req.user!.email, amountUsd);

    res.json({ message: "Payment verified and wallet updated" });
  } catch (err) {
    console.error("Razorpay verification error:", err);
    res.status(500).json({ error: "Internal server error during verification" });
  }
});

export default router;
