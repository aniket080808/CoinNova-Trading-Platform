import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config.js";
// ─── Stripe Implementation ──────────────────────────────
const stripe = new Stripe(config.stripe.secretKey);
export const stripeAdapter = {
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
            url: session.url,
        };
    },
    verifyWebhookEvent(body, signature) {
        try {
            return stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
        }
        catch (err) {
            console.error("Stripe webhook verification failed:", err.message);
            return null;
        }
    },
};
// ─── Razorpay Implementation ────────────────────────────
const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});
export const razorpayAdapter = {
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
    verifyWebhookEvent(body, signature) {
        return null;
    },
};
/** Verify Razorpay Signature */
export function verifyRazorpaySignature(orderId, paymentId, signature) {
    const keySecret = config.razorpay.keySecret?.trim();
    if (!keySecret) {
        console.warn("Razorpay secret is not configured; accepting payment verification in local/demo mode.");
        return Boolean(orderId && paymentId && signature);
    }
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");
    return generatedSignature === signature;
}
// Export the active payment adapter (swap this to switch providers)
// By default, we still use stripe, but we export both.
export const payment = stripeAdapter;
export { stripe, razorpay };
