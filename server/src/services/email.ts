import { config } from "../config.js";
import { sendEmail } from "../utils/sendEmail.js";

// ─── Helpers ─────────────────────────────────────────────

/** Generate a 6-digit OTP code */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  return await sendEmail(to, subject, html);
}

/** Send a generic email */
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!config.email.resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return await sendResendEmail(to, subject, html);
}

// ─── Email Templates ────────────────────────────────────

export async function sendVerificationEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Verify your CoinNova account",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #22c55e; margin-bottom: 8px;">🚀 Welcome to CoinNova</h1>
      <p>Your verification code is:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #22c55e;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. If you didn't create a CoinNova account, you can safely ignore this email.</p>
    </div>
    `
  );
}

export async function sendPasswordResetEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Reset your CoinNova password",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #22c55e; margin-bottom: 8px;">🔑 Password Reset</h1>
      <p>Use this code to reset your password:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #22c55e;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. If you didn't request a password reset, please ignore this email.</p>
    </div>
    `
  );
}

export async function sendTwoFactorEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Your CoinNova 2FA Code",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #3b82f6; margin-bottom: 8px;">🛡️ Two-Factor Authentication</h1>
      <p>Your login verification code is:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #3b82f6;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. If you didn't attempt to log in, please secure your account.</p>
    </div>
    `
  );
}

export async function sendPinSetupEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Set your CoinNova Transaction PIN",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #a855f7; margin-bottom: 8px;">🔒 Setup Transaction PIN</h1>
      <p>Use this code to authorize setting up your new Transaction PIN:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #a855f7;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. Do not share this code with anyone.</p>
    </div>
    `
  );
}

export async function sendPinResetEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Reset your CoinNova Transaction PIN",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #ef4444; margin-bottom: 8px;">⚠️ Reset Transaction PIN</h1>
      <p>Use this code to verify your request to change or reset your Transaction PIN:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #ef4444;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. If you did not request a PIN change, your account may be compromised. Please secure it immediately.</p>
    </div>
    `
  );
}

export async function sendDepositConfirmation(to: string, amount: number) {
  return await sendMail(
    to,
    `Deposit of $${amount.toFixed(2)} confirmed`,
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #22c55e; margin-bottom: 8px;">💰 Deposit Confirmed</h1>
      <p>Your deposit of <strong style="color: #22c55e;">$${amount.toFixed(2)}</strong> has been credited to your CoinNova wallet.</p>
      <p style="font-size: 13px; color: #71717a;">Log into your dashboard to start trading.</p>
    </div>
    `
  );
}

export async function sendWithdrawalAlert(to: string, amount: number, dest: string) {
  return await sendMail(
    to,
    `Withdrawal of $${amount.toFixed(2)} initiated`,
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #f59e0b; margin-bottom: 8px;">📤 Withdrawal Initiated</h1>
      <p>A withdrawal of <strong>$${amount.toFixed(2)}</strong> to <strong>${dest}</strong> has been initiated from your CoinNova wallet.</p>
      <p style="font-size: 13px; color: #71717a;">If you did not initiate this withdrawal, please contact support immediately.</p>
    </div>
    `
  );
}

export async function sendPriceAlert(to: string, symbol: string, direction: string, price: number) {
  return await sendMail(
    to,
    `Price Alert: ${symbol.toUpperCase()} is ${direction} $${price.toLocaleString()}`,
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #22c55e; margin-bottom: 8px;">🔔 Price Alert Triggered</h1>
      <p>Your alert for <strong style="color: #22c55e;">${symbol.toUpperCase()}</strong> was triggered.</p>
      <p>Current Price: <strong style="color: #22c55e;">$${price.toLocaleString()}</strong></p>
      <p style="font-size: 13px; color: #71717a;">The condition <strong>${direction} $${price}</strong> was met.</p>
    </div>
    `
  );
}
export async function sendEmailChangeEmail(to: string, otp: string) {
  return await sendMail(
    to,
    "Authorize Email Address Change",
    `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e4e4e7; border-radius: 16px;">
      <h1 style="color: #f59e0b; margin-bottom: 8px;">📧 Change Account Email</h1>
      <p>Use this code to authorize changing the email address associated with your CoinNova account:</p>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #f59e0b;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #71717a;">This code expires in <strong>5 minutes</strong>. If you did not request this change, your account may be at risk. Please contact our security team immediately.</p>
    </div>
    `
  );
}
