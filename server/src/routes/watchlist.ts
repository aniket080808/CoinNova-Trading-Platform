import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { watchlist } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /watchlist
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const items = await db.select().from(watchlist).where(eq(watchlist.userId, req.user!.userId));
    res.json(items.map(w => w.coinId));
  } catch (err) { console.error("Watchlist get error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// POST /watchlist/:coinId
router.post("/:coinId", requireAuth, async (req: Request, res: Response) => {
  try {
    const coinId = req.params.coinId as string;
    const userId = req.user!.userId;
    const [existing] = await db.select().from(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.coinId, coinId))).limit(1);
    if (existing) { res.json({ message: "Already in watchlist" }); return; }
    await db.insert(watchlist).values({ userId, coinId });
    res.status(201).json({ message: "Added to watchlist" });
  } catch (err) { console.error("Watchlist add error:", err); res.status(500).json({ error: "Internal server error" }); }
});

// DELETE /watchlist/:coinId
router.delete("/:coinId", requireAuth, async (req: Request, res: Response) => {
  try {
    const coinId = req.params.coinId as string;
    await db.delete(watchlist).where(and(eq(watchlist.userId, req.user!.userId), eq(watchlist.coinId, coinId)));
    res.json({ message: "Removed from watchlist" });
  } catch (err) { console.error("Watchlist remove error:", err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
