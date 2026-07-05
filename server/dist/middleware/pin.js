import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { config } from "../config.js";
export async function verifyTransactionPin(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const pin = req.body.transactionPin || req.headers["x-transaction-pin"];
        if (!pin) {
            res.status(400).json({ error: "Transaction PIN is required" });
            return;
        }
        // Admin has a static PIN: 123456
        if (userId === config.adminId) {
            if (String(pin) === "123456") {
                next();
                return;
            }
            res.status(403).json({ error: "Invalid Transaction PIN" });
            return;
        }
        const [user] = await db
            .select({
            id: users.id,
            transactionPin: users.transactionPin,
            transactionPinAttempts: users.transactionPinAttempts,
            pinLockedUntil: users.pinLockedUntil,
        })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        if (!user.transactionPin) {
            res.status(403).json({ error: "Transaction PIN not set. Please set it in settings." });
            return;
        }
        // Check if locked
        if (user.pinLockedUntil && new Date() < new Date(user.pinLockedUntil)) {
            res.status(423).json({
                error: "Too many failed attempts. Transaction PIN locked.",
                lockedUntil: user.pinLockedUntil
            });
            return;
        }
        const isValid = await bcrypt.compare(String(pin), user.transactionPin);
        if (!isValid) {
            const newAttempts = Number(user.transactionPinAttempts) + 1;
            const updateData = { transactionPinAttempts: newAttempts.toString() };
            // Lock for 15 minutes if 5 failed attempts
            if (newAttempts >= 5) {
                updateData.pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            }
            await db.update(users).set(updateData).where(eq(users.id, userId));
            res.status(403).json({
                error: newAttempts >= 5 ? "PIN locked for 15 minutes due to too many failed attempts." : "Invalid Transaction PIN",
                attemptsRemaining: Math.max(0, 5 - newAttempts)
            });
            return;
        }
        // Reset attempts on success
        if (Number(user.transactionPinAttempts) > 0 || user.pinLockedUntil) {
            await db.update(users).set({
                transactionPinAttempts: "0",
                pinLockedUntil: null
            }).where(eq(users.id, userId));
        }
        next();
    }
    catch (err) {
        console.error("PIN verification error:", err);
        res.status(500).json({ error: "Internal server error during PIN verification" });
    }
}
