import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, notifications } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ─── GET /kyc/status ────────────────────────────────────
router.get("/status", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        kycStatus: users.kycStatus,
        kycLevel: users.kycLevel,
        kycDocumentType: users.kycDocumentType,
        kycFullName: users.kycFullName,
        kycDob: users.kycDob,
        kycCountry: users.kycCountry,
        kycSubmittedAt: users.kycSubmittedAt,
        kycReviewedAt: users.kycReviewedAt,
        kycRejectionReason: users.kycRejectionReason,
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Withdrawal limits based on KYC level
    const limits = {
      1: { dailyWithdraw: 500, label: "Basic — $500/day" },
      2: { dailyWithdraw: Infinity, label: "Verified — Unlimited" },
    };

    const tier = limits[user.kycLevel as 1 | 2] ?? limits[1];

    res.json({
      status: user.kycStatus,
      level: user.kycLevel,
      limits: tier,
      details: {
        documentType: user.kycDocumentType,
        fullName: user.kycFullName,
        dob: user.kycDob,
        country: user.kycCountry,
        submittedAt: user.kycSubmittedAt,
        reviewedAt: user.kycReviewedAt,
        rejectionReason: user.kycRejectionReason,
      },
    });
  } catch (err) {
    console.error("KYC status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /kyc/submit ───────────────────────────────────
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { fullName, dob, country, documentType, documentNumber } = req.body;

    // Basic validation
    if (!fullName || !dob || !country || !documentType || !documentNumber) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const validDocTypes = ["passport", "national_id", "driving_license", "pan"];
    if (!validDocTypes.includes(documentType)) {
      return res.status(400).json({ error: "Invalid document type" });
    }

    // Check if user already has a pending or verified KYC
    const [user] = await db
      .select({ kycStatus: users.kycStatus })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.kycStatus === "verified") {
      return res.status(400).json({ error: "Your identity is already verified" });
    }

    if (user.kycStatus === "pending") {
      return res.status(400).json({ error: "Your KYC is already under review" });
    }

    // Update user KYC fields
    await db
      .update(users)
      .set({
        kycStatus: "pending",
        kycDocumentType: documentType,
        kycDocumentNumber: documentNumber,
        kycFullName: fullName.trim(),
        kycDob: dob,
        kycCountry: country,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      })
      .where(eq(users.id, req.user!.userId));

    // Create notification
    await db.insert(notifications).values({
      userId: req.user!.userId,
      type: "security",
      title: "KYC Submitted",
      message: "Your identity verification is under review. We'll notify you once it's processed.",
      link: "/settings",
    });

    res.json({
      message: "KYC submitted successfully. Your application is now under review.",
      status: "pending",
    });
  } catch (err) {
    console.error("KYC submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
