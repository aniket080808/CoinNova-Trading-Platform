import Stripe from "stripe";
import Razorpay from "razorpay";
export interface CreateCheckoutParams {
    userId: string;
    email: string;
    amountUsd: number;
}
export interface CheckoutResult {
    sessionId: string;
    url?: string;
    orderId?: string;
}
export interface PaymentAdapter {
    createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutResult>;
    verifyWebhookEvent(body: any, signature: string): any;
}
declare const stripe: Stripe;
export declare const stripeAdapter: PaymentAdapter;
declare const razorpay: Razorpay;
export declare const razorpayAdapter: PaymentAdapter;
/** Verify Razorpay Signature */
export declare function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean;
export declare const payment: PaymentAdapter;
export { stripe, razorpay };
