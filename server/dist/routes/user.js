import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users, otpCodes } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { generateOTP, sendPinSetupEmail, sendPinResetEmail, sendEmailChangeEmail } from "../services/email.js";
const router = Router();
const setPinSchema = z.object({
    pin: z.string().length(6).regex(/^\d+$/, "PIN must be numeric"),
    otp: z.string().length(6),
});
const changePinSchema = z.object({
    oldPin: z.string().length(6).regex(/^\d+$/, "PIN must be numeric"),
    newPin: z.string().length(6).regex(/^\d+$/, "PIN must be numeric"),
    otp: z.string().length(6),
});
const forgotPinSchema = z.object({
    newPin: z.string().length(6).regex(/^\d+$/, "PIN must be numeric"),
    otp: z.string().length(6),
});
// ─── PIN Management ──────────────────────────────────────
// Step 1: Request OTP for PIN Setup/Change
router.post("/pin/request-otp", requireAuth, async (req, res) => {
    try {
        const { action } = req.body; // 'setup' or 'reset'
        const userId = req.user.userId;
        const email = req.user.email;
        const type = action === "setup" ? "pin_setup" : "pin_reset";
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.insert(otpCodes).values({
            userId,
            code: otp,
            type,
            expiresAt,
        });
        let emailSent = false;
        if (action === "setup") {
            emailSent = await sendPinSetupEmail(email, otp);
        }
        else {
            emailSent = await sendPinResetEmail(email, otp);
        }
        res.json({
            message: emailSent ? "OTP sent to your email" : "OTP created successfully",
        });
    }
    catch (err) {
        console.error("PIN OTP request failed:", err);
        res.status(500).json({ error: err?.message || "Failed to send OTP" });
    }
});
// Step 2: Set PIN (Requires pin_setup OTP)
router.post("/pin/set", requireAuth, validate(setPinSchema), async (req, res) => {
    try {
        const { pin, otp: code } = req.body;
        const userId = req.user.userId;
        const [otp] = await db
            .select()
            .from(otpCodes)
            .where(and(eq(otpCodes.userId, userId), eq(otpCodes.code, code), eq(otpCodes.type, "pin_setup"), eq(otpCodes.used, false)))
            .limit(1);
        if (!otp || new Date() > otp.expiresAt) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }
        const passwordHash = await bcrypt.hash(pin, 12);
        await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
        await db.update(users).set({ transactionPin: passwordHash, transactionPinAttempts: "0", pinLockedUntil: null }).where(eq(users.id, userId));
        res.json({ message: "Transaction PIN set successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
// Step 3: Change PIN (Requires Old PIN + pin_reset OTP)
router.post("/pin/change", requireAuth, validate(changePinSchema), async (req, res) => {
    try {
        const { oldPin, newPin, otp: code } = req.body;
        const userId = req.user.userId;
        const [user] = await db.select({ transactionPin: users.transactionPin }).from(users).where(eq(users.id, userId)).limit(1);
        if (!user || !user.transactionPin)
            return res.status(400).json({ error: "PIN not set" });
        const isValid = await bcrypt.compare(oldPin, user.transactionPin);
        if (!isValid)
            return res.status(403).json({ error: "Invalid old PIN" });
        const [otp] = await db
            .select()
            .from(otpCodes)
            .where(and(eq(otpCodes.userId, userId), eq(otpCodes.code, code), eq(otpCodes.type, "pin_reset"), eq(otpCodes.used, false)))
            .limit(1);
        if (!otp || new Date() > otp.expiresAt)
            return res.status(400).json({ error: "Invalid or expired OTP" });
        const passwordHash = await bcrypt.hash(newPin, 12);
        await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
        await db.update(users).set({ transactionPin: passwordHash, transactionPinAttempts: "0", pinLockedUntil: null }).where(eq(users.id, userId));
        res.json({ message: "Transaction PIN changed successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
// Step 4: Forgot PIN (Requires pin_reset OTP only)
router.post("/pin/forgot", requireAuth, validate(forgotPinSchema), async (req, res) => {
    try {
        const { newPin, otp: code } = req.body;
        const userId = req.user.userId;
        const [otp] = await db
            .select()
            .from(otpCodes)
            .where(and(eq(otpCodes.userId, userId), eq(otpCodes.code, code), eq(otpCodes.type, "pin_reset"), eq(otpCodes.used, false)))
            .limit(1);
        if (!otp || new Date() > otp.expiresAt)
            return res.status(400).json({ error: "Invalid or expired OTP" });
        const passwordHash = await bcrypt.hash(newPin, 12);
        await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
        await db.update(users).set({ transactionPin: passwordHash, transactionPinAttempts: "0", pinLockedUntil: null }).where(eq(users.id, userId));
        res.json({ message: "Transaction PIN reset successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
const emailChangeSchema = z.object({
    newEmail: z.string().email(),
    otp: z.string().length(6),
});
// ─── Email Management ────────────────────────────────────
router.post("/email/request-otp", requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const email = req.user.email;
        const { role } = req.user;
        if (role === "admin")
            return res.status(403).json({ error: "Admin email is static" });
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.insert(otpCodes).values({
            userId,
            code: otp,
            type: "email_change",
            expiresAt,
        });
        // Use the dedicated email change template
        await sendEmailChangeEmail(email, otp);
        res.json({ message: "OTP sent to your current email" });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to send OTP" });
    }
});
router.post("/email/verify", requireAuth, validate(emailChangeSchema), async (req, res) => {
    try {
        const { newEmail, otp: code } = req.body;
        const userId = req.user.userId;
        const { role } = req.user;
        if (role === "admin")
            return res.status(403).json({ error: "Admin email is static" });
        // Check if email already exists
        const [existing] = await db.select().from(users).where(eq(users.email, newEmail.toLowerCase())).limit(1);
        if (existing)
            return res.status(400).json({ error: "Email already in use" });
        const [otp] = await db
            .select()
            .from(otpCodes)
            .where(and(eq(otpCodes.userId, userId), eq(otpCodes.code, code), eq(otpCodes.type, "email_change"), eq(otpCodes.used, false)))
            .limit(1);
        if (!otp || new Date() > otp.expiresAt)
            return res.status(400).json({ error: "Invalid or expired OTP" });
        await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
        await db.update(users).set({ email: newEmail.toLowerCase() }).where(eq(users.id, userId));
        res.json({ message: "Email updated successfully" });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});
// ─── General Settings ────────────────────────────────────
const settingsHandler = async (req, res) => {
    try {
        const { name, currencyPreference, twoFactorEnabled } = req.body;
        const userId = req.user.userId;
        const updates = {};
        if (name && typeof name === "string")
            updates.name = name.trim();
        if (currencyPreference)
            updates.currencyPreference = currencyPreference;
        if (typeof twoFactorEnabled === "boolean")
            updates.twoFactorEnabled = twoFactorEnabled;
        if (Object.keys(updates).length > 0) {
            await db.update(users).set(updates).where(eq(users.id, userId));
        }
        res.json({ message: "Settings updated" });
    }
    catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};
// Accept both POST and PUT for compatibility
router.post("/settings", requireAuth, settingsHandler);
router.put("/settings", requireAuth, settingsHandler);
export default router;
