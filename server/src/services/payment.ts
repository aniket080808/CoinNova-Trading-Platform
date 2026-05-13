import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config.js";

// ─── Payment Adapter Interface ───────────────────────────
// Allows swapping Stripe for Razorpay (or others) later

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  amountUsd: number;
}

export interface CheckoutResult {
  sessionId: string;
  url?: string; // Optional for Razorpay since it returns orderId
  orderId?: string;
}

export interface PaymentAdapter {
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
}

// ─── Stripe Implementation ──────────────────────────────

const stripe = new Stripe(config.stripe.secretKey);

export const stripeAdapter: PaymentAdapter = {
  async createCheckoutSession({ userId, email, amountUsd }) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      metadata: { userId },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountUsd * 100), // cents
            product_data: {
              name: "CoinNova Wallet Deposit",
              description: `Add $${amountUsd.toFixed(2)} to your wallet`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${config.stripe.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: config.stripe.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  },
};

// ─── Razorpay Implementation ────────────────────────────

const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export const razorpayAdapter: PaymentAdapter = {
  async createCheckoutSession({ userId, amountUsd }) {
    // We'll update this to handle the amount more flexibly.
    // For now, let's allow the caller to pass an amount that's already in the target currency if needed.
    // But since the interface says amountUsd, we'll keep it for compatibility.
    // However, I'll add a way to pass the actual target amount.
    
    const amountInPaise = Math.round(amountUsd * 100); 

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId },
    });

    return {
      sessionId: order.id,
      orderId: order.id,
    };
  },
};

/** Verify Razorpay Signature */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha256", config.razorpay.keySecret);
  hmac.update(orderId + "|" + paymentId);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === signature;
}

// Export the active payment adapter (swap this to switch providers)
// By default, we still use stripe, but we export both.
export const payment: PaymentAdapter = stripeAdapter;

export { stripe, razorpay };
