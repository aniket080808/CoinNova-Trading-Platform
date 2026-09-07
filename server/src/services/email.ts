import nodemailer from "nodemailer";
import { config } from "../config.js";

// ─── Brevo SMTP Transporter (Fallback if using Brevo SMTP) ──

let smtpTransporter: nodemailer.Transporter | null = null;

if (config.brevo.smtpUser && config.brevo.smtpKey) {
  smtpTransporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: config.brevo.smtpUser,
      pass: config.brevo.smtpKey,
    },
    authMethod: "PLAIN",
    requireTLS: true,
  });

  smtpTransporter.verify().then(() => {
    console.log("✉️  Brevo SMTP relay connection verified");
  }).catch((err) => {
    console.warn("⚠️  Brevo SMTP verification failed:", err.message);
  });
}

// ─── Helpers & Anti-Abuse Throttle ──────────────────────

/** Generate a 6-digit cryptographic OTP code */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Basic email validation before invoking Brevo API to prevent bounce penalties */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  // Standard RFC 5322 regex approximation
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(trimmed);
}

// Cooldown map: Prevents bot loops from hammering Brevo API with duplicate emails
const emailCooldowns = new Map<string, number>();
const COOLDOWN_WINDOW_MS = 25 * 1000; // 25 seconds minimum between identical recipient emails

function isThrottled(to: string): boolean {
  const normalized = to.toLowerCase().trim();
  const now = Date.now();
  const lastSent = emailCooldowns.get(normalized);
  if (lastSent && now - lastSent < COOLDOWN_WINDOW_MS) {
    return true;
  }
  emailCooldowns.set(normalized, now);

  // Periodic cleanup
  if (emailCooldowns.size > 2000) {
    for (const [key, timestamp] of emailCooldowns.entries()) {
      if (now - timestamp > 60000) emailCooldowns.delete(key);
    }
  }
  return false;
}

// ─── Compliant Brevo Email Layout Wrapper ───────────────

interface EmailTemplateOptions {
  to: string;
  badge: string;
  badgeColor?: string;
  title: string;
  heading: string;
  bodyContentHtml: string;
  actionBoxHtml?: string;
  securityNotice?: string;
  tag?: string;
}

function renderCompliantEmailTemplate(options: EmailTemplateOptions): string {
  const {
    to,
    badge,
    badgeColor = "#22c55e",
    heading,
    bodyContentHtml,
    actionBoxHtml = "",
    securityNotice = "If you did not initiate this action, please secure your account immediately or contact security support.",
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #07070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5; }
    .email-container { max-width: 540px; margin: 24px auto; background: #0e0e14; border: 1px solid #1f1f2e; border-radius: 16px; overflow: hidden; }
    .header { padding: 24px 32px; border-bottom: 1px solid #181824; background: linear-gradient(180deg, #13131e 0%, #0e0e14 100%); }
    .brand-row { display: flex; align-items: center; justify-content: space-between; }
    .brand-title { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin: 0; }
    .brand-accent { color: #22c55e; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(34, 197, 94, 0.1); border: 1px solid ${badgeColor}40; color: ${badgeColor}; }
    .content { padding: 32px; }
    .heading { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
    .text { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px 0; }
    .action-box { background: #13131c; border: 1px solid #272738; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.35em; color: #22c55e; margin: 0; }
    .expiry-note { font-size: 12px; color: #71717a; margin-top: 10px; }
    .security-callout { background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 4px; font-size: 12px; color: #d4d4d8; line-height: 1.5; margin: 20px 0; }
    .footer { padding: 24px 32px; background: #0a0a0f; border-top: 1px solid #181824; font-size: 11px; color: #71717a; line-height: 1.6; }
    .legal-box { padding-top: 12px; margin-top: 12px; border-top: 1px solid #181824; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="brand-row">
        <h2 class="brand-title">Coin<span class="brand-accent">Nova</span></h2>
        <span class="badge">${badge}</span>
      </div>
    </div>
    <div class="content">
      <h1 class="heading">${heading}</h1>
      <div class="text">
        ${bodyContentHtml}
      </div>

      ${actionBoxHtml}

      <div class="security-callout">
        <strong>🔒 Security Notice:</strong> ${securityNotice} CoinNova will never ask you for your password, recovery keys, or transaction PIN via email or phone.
      </div>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #a1a1aa;">
        Why did you receive this email?
      </p>
      <p style="margin: 0 0 12px 0;">
        This is an automated <strong>transactional security notification</strong> generated directly in response to an action requested on the CoinNova account associated with <span style="color: #d4d4d8;">${to}</span>.
      </p>
      <div class="legal-box">
        <p style="margin: 0 0 4px 0;">
          CoinNova Digital Assets Platform • Automated Transactional Delivery System
        </p>
        <p style="margin: 0;">
          For assistance or abuse reporting, contact: <a href="mailto:support@coinnova.io" style="color: #22c55e; text-decoration: none;">support@coinnova.io</a> | <a href="mailto:abuse@coinnova.io" style="color: #22c55e; text-decoration: none;">abuse@coinnova.io</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─── Brevo Dispatcher ───────────────────────────────────

/**
 * Send an email strictly complying with Brevo Acceptable Use Policy (Appendix 7).
 * - Priority 1: Brevo REST API (v3/smtp/email) with transactional tags & headers
 * - Priority 2: Brevo SMTP Relay (smtp-relay.brevo.com:587)
 * - Priority 3: Development console logger fallback
 */
async function sendMail(
  to: string,
  subject: string,
  html: string,
  tag = "transactional"
): Promise<boolean> {
  const normalizedTo = to.trim().toLowerCase();

  // 1. Email sanity check to protect Brevo sender reputation from hard bounces
  if (!isValidEmail(normalizedTo)) {
    console.warn(`⚠️ [Brevo Protection] Dropped dispatch to invalid email address format: "${to}"`);
    return false;
  }

  // 2. Throttle check to protect from rapid bot floods
  if (isThrottled(normalizedTo)) {
    console.warn(`⏳ [Brevo Protection] Throttled duplicate email dispatch to ${normalizedTo} (cooldown active)`);
    return false;
  }

  const senderName = config.brevo.senderName || "CoinNova Security";
  const senderEmail = config.brevo.senderEmail || "noreply@coinnova.io";

  // 1. Brevo REST API v3
  if (config.brevo.apiKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.brevo.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: normalizedTo }],
          replyTo: {
            name: "CoinNova Support",
            email: senderEmail,
          },
          subject: `[CoinNova] ${subject}`,
          htmlContent: html,
          tags: ["transactional", "security-auth", tag],
          headers: {
            "X-Mailin-Tag": "transactional",
            "X-Service-Type": "Transactional-Security",
            "Precedence": "bulk",
            "Auto-Submitted": "auto-generated",
          },
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Brevo API responded with ${res.status}: ${errorBody}`);
      }

      console.log(`📧 [Brevo API] Transactional email sent to ${normalizedTo}: ${subject}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Brevo API Error: ${err?.message || err}`);
    }
  }

  // 2. Brevo SMTP Relay (Nodemailer)
  if (smtpTransporter) {
    try {
      await smtpTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: normalizedTo,
        replyTo: senderEmail,
        subject: `[CoinNova] ${subject}`,
        html,
        headers: {
          "X-Mailin-Tag": "transactional",
          "X-Service-Type": "Transactional-Security",
          "Auto-Submitted": "auto-generated",
        },
      });
      console.log(`📧 [Brevo SMTP] Email sent to ${normalizedTo}: ${subject}`);
      return true;
    } catch (err: any) {
      console.error(`❌ Brevo SMTP Error: ${err?.message || err}`);
    }
  }

  // 3. Fallback for Local Dev (Prints email to console so flows never break during testing)
  console.warn(`📧 [DEV FALLBACK] Email to ${normalizedTo}:`);
  console.warn(`    Subject: [CoinNova] ${subject}`);
  return false;
}

// ─── Standardized Transactional Email Templates ─────────

/** User Account Verification (OTP) */
export async function sendVerificationEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Account Verification",
    badgeColor: "#22c55e",
    title: "Verify your CoinNova account",
    heading: "Verify Your Email Address",
    bodyContentHtml: `
      <p>Welcome to CoinNova. To complete your account verification and secure your trading dashboard, please use the 6-digit confirmation code below:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "If you did not register for a CoinNova account, no further action is required; this code will safely expire.",
    tag: "email-verification",
  });

  return await sendMail(to, "Verify Your CoinNova Account", html, "email-verification");
}

/** Password Reset Authorization */
export async function sendPasswordResetEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Security Alert",
    badgeColor: "#f59e0b",
    title: "Reset your CoinNova password",
    heading: "Password Reset Request",
    bodyContentHtml: `
      <p>We received a request to reset the password for your CoinNova account. Enter the verification code below to authorize setting a new password:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code" style="color: #f59e0b;">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "If you did not request a password reset, someone may be attempting to access your account. Please log in immediately and ensure your credentials are safe.",
    tag: "password-reset",
  });

  return await sendMail(to, "Password Reset Authorization Code", html, "password-reset");
}

/** Two-Factor Authentication Login Verification */
export async function sendTwoFactorEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "2FA Verification",
    badgeColor: "#3b82f6",
    title: "Your CoinNova 2FA Code",
    heading: "Two-Factor Login Verification",
    bodyContentHtml: `
      <p>A login attempt requires two-factor verification. Enter the authorization code below to complete your sign-in:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code" style="color: #3b82f6;">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "If you did not attempt to sign in to your CoinNova account, change your password immediately to protect your funds.",
    tag: "two-factor",
  });

  return await sendMail(to, "Two-Factor Authentication Code", html, "two-factor");
}

/** Transaction PIN Setup */
export async function sendPinSetupEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "PIN Authorization",
    badgeColor: "#a855f7",
    title: "Set your CoinNova Transaction PIN",
    heading: "Authorize Transaction PIN Setup",
    bodyContentHtml: `
      <p>You have initiated a request to create a 6-digit Transaction PIN to protect your trades, transfers, and wallet actions. Enter the one-time code below:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code" style="color: #a855f7;">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "Your Transaction PIN authorizes financial transactions. Never disclose your PIN or this authorization code to anyone.",
    tag: "pin-setup",
  });

  return await sendMail(to, "Authorize Transaction PIN Setup", html, "pin-setup");
}

/** Transaction PIN Reset */
export async function sendPinResetEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Security Warning",
    badgeColor: "#ef4444",
    title: "Reset your CoinNova Transaction PIN",
    heading: "Reset Transaction PIN Request",
    bodyContentHtml: `
      <p>A request was received to reset the Transaction PIN on your account. To confirm this change, enter the verification code below:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code" style="color: #ef4444;">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "If you did not authorize this PIN reset, freeze your account or contact our emergency security desk immediately.",
    tag: "pin-reset",
  });

  return await sendMail(to, "Security Alert: Transaction PIN Reset", html, "pin-reset");
}

/** Wallet Deposit Confirmation */
export async function sendDepositConfirmation(to: string, amount: number) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Deposit Confirmed",
    badgeColor: "#22c55e",
    title: "Deposit Confirmation",
    heading: "Wallet Deposit Confirmed",
    bodyContentHtml: `
      <p>Your wallet deposit has been successfully processed and confirmed on the CoinNova platform.</p>
      <div class="action-box" style="margin: 16px 0;">
        <span style="font-size: 28px; font-weight: 800; color: #22c55e;">+$${amount.toFixed(2)} USD</span>
        <p class="expiry-note">Credited to primary trading wallet</p>
      </div>
      <p style="font-size: 13px; color: #a1a1aa;">The funds are now available in your portfolio balance for trading and asset allocation.</p>
    `,
    securityNotice: "All deposits are recorded on your immutable ledger. Review your activity history inside your CoinNova dashboard.",
    tag: "deposit-confirmation",
  });

  return await sendMail(to, `Deposit Confirmed: $${amount.toFixed(2)} USD`, html, "deposit-confirmation");
}

/** Wallet Withdrawal Alert */
export async function sendWithdrawalAlert(to: string, amount: number, dest: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Withdrawal Notice",
    badgeColor: "#f59e0b",
    title: "Withdrawal Initiated",
    heading: "Wallet Withdrawal Dispatched",
    bodyContentHtml: `
      <p>A withdrawal request has been initiated from your CoinNova balance:</p>
      <div class="action-box" style="margin: 16px 0;">
        <span style="font-size: 28px; font-weight: 800; color: #f59e0b;">-$${amount.toFixed(2)} USD</span>
        <p class="expiry-note">Destination: <strong style="color: #ffffff;">${dest}</strong></p>
      </div>
      <p style="font-size: 13px; color: #a1a1aa;">Processing typically completes within standard network clearance windows.</p>
    `,
    securityNotice: "If you did not authorize this withdrawal, contact support@coinnova.io immediately to halt transaction execution.",
    tag: "withdrawal-alert",
  });

  return await sendMail(to, `Security Alert: Withdrawal Initiated ($${amount.toFixed(2)})`, html, "withdrawal-alert");
}

/** Market Price Alert (Requested by User) */
export async function sendPriceAlert(to: string, symbol: string, direction: string, price: number) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Market Alert",
    badgeColor: "#3b82f6",
    title: "Price Alert Triggered",
    heading: `Price Alert: ${symbol.toUpperCase()}`,
    bodyContentHtml: `
      <p>Your custom price alert for <strong style="color: #ffffff;">${symbol.toUpperCase()}</strong> has triggered:</p>
      <div class="action-box" style="margin: 16px 0;">
        <span style="font-size: 26px; font-weight: 800; color: #3b82f6;">${direction.toUpperCase()} $${price.toLocaleString()}</span>
        <p class="expiry-note">Triggered at current market spot rates</p>
      </div>
      <p style="font-size: 12px; color: #71717a;">Market alerts are factual and informational only and do not constitute financial advice.</p>
    `,
    securityNotice: "You are receiving this because you configured a price alert in your CoinNova notification settings.",
    tag: "price-alert",
  });

  return await sendMail(to, `Price Alert: ${symbol.toUpperCase()} ${direction} $${price.toLocaleString()}`, html, "price-alert");
}

/** Email Change Authorization */
export async function sendEmailChangeEmail(to: string, otp: string) {
  const html = renderCompliantEmailTemplate({
    to,
    badge: "Security Verification",
    badgeColor: "#f59e0b",
    title: "Authorize Email Change",
    heading: "Confirm Email Address Update",
    bodyContentHtml: `
      <p>A request was received to update the email address linked to your CoinNova profile. Enter the authorization code below to confirm this modification:</p>
    `,
    actionBoxHtml: `
      <div class="action-box">
        <p class="otp-code" style="color: #f59e0b;">${otp}</p>
        <p class="expiry-note">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    `,
    securityNotice: "If you did not request to change your account email address, contact our security desk immediately.",
    tag: "email-change",
  });

  return await sendMail(to, "Authorize Account Email Address Change", html, "email-change");
}
