import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, wallets, otpCodes, transactions, holdings, watchlist, alerts, aiChats, referrals, notifications } from "../db/schema.js";
import { signToken, requireAuth, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { config } from "../config.js";
import {
  generateOTP,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.js";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many attempts, please try again later" },
});

async function upsertGoogleUser(email: string, name: string, picture?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedName = name.trim() || normalizedEmail;

  const raw = (normalizedName || normalizedEmail.split("@")[0] || "NOVA")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const prefix = raw.length >= 3 ? raw : "NOVA";
  const defaultReferralCode = `${prefix}-${crypto.randomInt(1000, 9999)}`;

  const [existing] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, emailVerified: users.emailVerified, referralCode: users.referralCode })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    const updates: any = { name: normalizedName };
    if (!existing.referralCode) {
      updates.referralCode = defaultReferralCode;
    }
    await db.update(users)
      .set(updates)
      .where(eq(users.id, existing.id));

    return { ...existing, isNew: false };
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
  const [user] = await db
    .insert(users)
    .values({ name: normalizedName, email: normalizedEmail, passwordHash, emailVerified: false, referralCode: defaultReferralCode })
    .returning({ id: users.id, email: users.email, role: users.role, name: users.name, emailVerified: users.emailVerified });

  await db.insert(wallets).values({ userId: user.id, balanceUsd: "0" }).onConflictDoNothing();

  return { ...user, isNew: true };
}

// ─── Schemas ─────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  referralCode: z.string().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  type: z.enum(["email_verification", "two_factor", "pin_setup", "pin_reset", "password_reset"]),
});

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  password: z.string().min(6).max(128),
});

router.get("/google", (_req, res) => {
  const clientId = config.google.clientId;
  const clientSecret = config.google.clientSecret;

  if (!clientId || !clientSecret) {
    return res.redirect(`${config.google.frontendUrl}/login?error=google_not_configured`);
  }

  const redirectUri = encodeURIComponent(config.google.redirectUri);
  const scope = encodeURIComponent("openid email profile");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", config.google.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  res.redirect(authUrl.toString());
});

router.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string" || !code) {
    return res.redirect(`${config.google.frontendUrl}/login?error=google_auth_failed`);
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json() as any;
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Google token exchange failed");
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json() as any;
    if (!profile.email) {
      throw new Error("Google account did not expose an email");
    }

    const user = await upsertGoogleUser(profile.email, profile.name || profile.given_name || profile.email, profile.picture);
    
    // If user is unverified, generate and dispatch verification OTP
    const needsVerification = !user.emailVerified;
    if (needsVerification) {
      try {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await db.insert(otpCodes).values({
          userId: user.id,
          code: otp,
          type: "email_verification",
          expiresAt,
        });
        await sendVerificationEmail(user.email, otp);
      } catch (mailErr) {
        console.error("Failed to send Google user verification OTP:", mailErr);
      }
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    const userPayload = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    }));
    return res.redirect(`${config.google.frontendUrl}/auth/google/success?token=${encodeURIComponent(token)}&user=${userPayload}&needsVerification=${needsVerification}`);
  } catch (err) {
    console.error("Google auth error:", err);
    return res.redirect(`${config.google.frontendUrl}/login?error=google_auth_failed`);
  }
});

// ─── POST /auth/register ────────────────────────────────

router.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, referralCode: incomingCode } = req.body;

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique referral code for this new user based on name or email
    const rawPrefix = (name || email.split("@")[0] || "NOVA")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    const codePrefix = rawPrefix.length >= 3 ? rawPrefix : "NOVA";
    const newReferralCode = `${codePrefix}-${crypto.randomInt(1000, 9999)}`;

    // Look up referrer if a referral code was provided
    let referrerId: string | null = null;
    if (incomingCode && typeof incomingCode === "string") {
      const cleanCode = incomingCode.trim().toUpperCase();
      const [referrer] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`UPPER(${users.referralCode}) = ${cleanCode}`)
        .limit(1);
      if (referrer) referrerId = referrer.id;
    }

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        referralCode: newReferralCode,
        referredBy: referrerId,
      })
      .returning({ id: users.id, email: users.email, role: users.role });

    // Create wallet with $0 starting balance
    await db.insert(wallets).values({ userId: user.id, balanceUsd: "0" });

    // If referred, create a referral tracking record
    if (referrerId) {
      await db.insert(referrals).values({
        referrerId,
        referredUserId: user.id,
        status: "completed",
        rewardAmount: "25",
        claimed: false,
      });

      try {
        await db.insert(notifications).values({
          userId: referrerId,
          type: "system",
          title: "New Referral Joined! 🎉",
          message: `${name || "A new trader"} just joined CoinNova using your referral code! You have a $25 reward waiting in your Referral Hub.`,
          link: "/settings",
        });
      } catch (notifErr) {
        console.error("Referral notification error:", notifErr);
      }
    }

    // Generate and save OTP for email verification
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.insert(otpCodes).values({
      userId: user.id,
      code: otp,
      type: "email_verification",
      expiresAt,
    });

    // Send verification email
    await sendVerificationEmail(email, otp);

    // Issue a temporary token for verification flow
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: { id: user.id, name, email, role: user.role, emailVerified: false },
      message: "Account created. Verification code sent to your email.",
      status: "VERIFICATION_REQUIRED"
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/login ───────────────────────────────────

router.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded static admin account
    if (email === config.adminEmail && password === config.adminPassword) {
      // Ensure admin exists in DB to avoid 500 errors on dashboard
      await db.insert(users).values({
        id: config.adminId,
        name: "System Admin",
        email: config.adminEmail,
        passwordHash: "STATIC_ADMIN", // Not used for verification here
        role: "admin",
        emailVerified: true,
      }).onConflictDoUpdate({
        target: users.id,
        set: { name: "System Admin", email: config.adminEmail, role: "admin" }
      });

      // Ensure admin has a wallet
      await db.insert(wallets).values({
        userId: config.adminId,
        balanceUsd: "0"
      }).onConflictDoNothing();

      const token = signToken({
        userId: config.adminId,
        email: config.adminEmail,
        role: "admin",
      });

      return res.json({
        token,
        user: {
          id: config.adminId,
          name: "System Admin",
          email: config.adminEmail,
          role: "admin",
          emailVerified: true,
          hasPin: true,
          twoFactorEnabled: false,
          currencyPreference: "USD",
        },
      });
    }

    // (Demo account logic removed as requested)

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.passwordHash === "STATIC_ADMIN") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (user.twoFactorEnabled) {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.insert(otpCodes).values({
        userId: user.id,
        code: otp,
        type: "two_factor",
        expiresAt,
      });
      // Import sendTwoFactorEmail at the top if needed (already exported in services)
      const { sendTwoFactorEmail } = await import("../services/email.js");
      await sendTwoFactorEmail(user.email, otp);

      // Issue temporary token for 2FA flow
      const tempToken = signToken({ userId: user.id, email: user.email, role: user.role, isTemp: true });
      
      return res.json({
        status: "2FA_REQUIRED",
        token: tempToken,
        message: "2FA code sent to your email.",
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      status: "SUCCESS",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/verify-otp ──────────────────────────────

router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, code, type } = req.body;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Find valid OTP
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, user.id),
          eq(otpCodes.code, code),
          eq(otpCodes.type, type as any),
          eq(otpCodes.used, false)
        )
      )
      .orderBy(otpCodes.createdAt)
      .limit(1);

    if (!otp || new Date() > otp.expiresAt) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    // Mark OTP as used
    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));

    // Handle specific actions based on type
    if (type === "email_verification") {
      await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
    }
    
    // For 2FA or email_verification, we might need to issue a full token if this was the login flow.
    // The frontend should ideally call /auth/me after this to get updated user state, 
    // but returning a fresh token is good practice.
    const [fullUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        hasPin: sql<boolean>`${users.transactionPin} IS NOT NULL`,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const token = signToken({
      userId: user.id,
      email: email,
      role: fullUser.role,
    });

    res.json({ status: "SUCCESS", token, user: fullUser, message: "Code verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/forgot ──────────────────────────────────

router.post("/forgot", authLimiter, validate(forgotSchema), async (req, res) => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await db.insert(otpCodes).values({
        userId: user.id,
        code: otp,
        type: "password_reset",
        expiresAt,
      });

      await sendPasswordResetEmail(email, otp);
    }

    res.json({ message: "If that email exists, a reset code has been sent." });
  } catch (err) {
    console.error("Forgot error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/reset ───────────────────────────────────

router.post("/reset", authLimiter, validate(resetSchema), async (req, res) => {
  try {
    const { email, code, password } = req.body;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      res.status(400).json({ error: "Invalid reset request" });
      return;
    }

    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, user.id),
          eq(otpCodes.code, code),
          eq(otpCodes.type, "password_reset"),
          eq(otpCodes.used, false)
        )
      )
      .limit(1);

    if (!otp || new Date() > otp.expiresAt) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /auth/me ───────────────────────────────────────

router.get("/me", requireAuth, async (req, res) => {
  try {
    if (req.user!.email === config.adminEmail) {
      return res.json({
        user: {
          id: config.adminId,
          name: "System Admin",
          email: config.adminEmail,
          role: "admin",
          emailVerified: true,
          twoFactorEnabled: false,
          hasPin: true,
          currencyPreference: "USD",
          createdAt: new Date(),
        }
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        twoFactorEnabled: users.twoFactorEnabled,
        hasPin: sql<boolean>`${users.transactionPin} IS NOT NULL`,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /auth/resend-otp ─────────────────────────────

router.post("/resend-otp", authLimiter, optionalAuth, async (req, res) => {
  try {
    const bodyEmail = req.body?.email ? String(req.body.email).toLowerCase().trim() : undefined;
    const userId = req.user?.userId;
    const authEmail = req.user?.email;

    const email = bodyEmail || authEmail;
    if (!email && !userId) {
      return res.status(400).json({ error: "Email or authentication required to resend code" });
    }

    let user;
    if (userId) {
      [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    } else if (email) {
      [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.emailVerified) {
      return res.json({ message: "Account is already verified", alreadyVerified: true });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.insert(otpCodes).values({
      userId: user.id,
      code: otp,
      type: "email_verification",
      expiresAt,
    });

    await sendVerificationEmail(user.email, otp);

    res.json({ message: "Verification code sent to your email" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
