import { Router } from "express";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { alerts } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
const router = Router();
const createSchema = z.object({
    coinId: z.string().min(1),
    symbol: z.string().min(1),
    direction: z.enum(["above", "below"]),
    price: z.number().positive(),
});
// GET /alerts
router.get("/", requireAuth, async (req, res) => {
    try {
        const items = await db.select().from(alerts).where(eq(alerts.userId, req.user.userId)).orderBy(desc(alerts.createdAt));
        res.json(items.map(a => ({ ...a, price: Number(a.price), createdAt: new Date(a.createdAt).getTime() })));
    }
    catch (err) {
        console.error("Alerts list error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// POST /alerts
router.post("/", requireAuth, validate(createSchema), async (req, res) => {
    try {
        const { coinId, symbol, direction, price } = req.body;
        const [alert] = await db.insert(alerts).values({ userId: req.user.userId, coinId, symbol, direction, price: String(price) }).returning();
        res.status(201).json({ ...alert, price: Number(alert.price), createdAt: new Date(alert.createdAt).getTime() });
    }
    catch (err) {
        console.error("Alert create error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// DELETE /alerts/:id
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        await db.delete(alerts).where(eq(alerts.id, id));
        res.json({ message: "Alert deleted" });
    }
    catch (err) {
        console.error("Alert delete error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
