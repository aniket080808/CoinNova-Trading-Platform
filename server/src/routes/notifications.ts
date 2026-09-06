import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Ensure table exists safeguard
let tableEnsured = false;
async function ensureNotificationsTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
          CREATE TYPE notification_type AS ENUM ('trade', 'alert', 'deposit', 'withdraw', 'security', 'system');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type notification_type DEFAULT 'system' NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT false NOT NULL,
        link TEXT,
        data JSONB,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    tableEnsured = true;
  } catch (err) {
    console.error("Failed to ensure notifications table:", err);
  }
}

// GET /notifications — list user notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = req.user!.userId;

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = list.filter((n) => !n.read).length;

    res.json({
      notifications: list.map((n) => ({
        ...n,
        createdAt: new Date(n.createdAt).getTime(),
      })),
      unreadCount,
    });
  } catch (err: any) {
    console.error("Notifications fetch error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /notifications/:id/read — mark as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const id = String(req.params.id);
    const userId = req.user!.userId;

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    res.json({ success: true });
  } catch (err: any) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// POST /notifications/read-all — mark all as read
router.post("/read-all", requireAuth, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = req.user!.userId;

    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    res.json({ success: true });
  } catch (err: any) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// DELETE /notifications/:id — delete single notification
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const id = String(req.params.id);
    const userId = req.user!.userId;

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));

    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete notification error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// DELETE /notifications — clear all notifications
router.delete("/", requireAuth, async (req, res) => {
  try {
    await ensureNotificationsTable();
    const userId = req.user!.userId;

    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));

    res.json({ success: true });
  } catch (err: any) {
    console.error("Clear notifications error:", err);
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
