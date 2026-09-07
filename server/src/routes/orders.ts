import { Router } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { orders, wallets, holdings, notifications } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { verifyTransactionPin } from "../middleware/pin.js";
import { validate } from "../middleware/validate.js";

import {
  ensureOrdersTable,
  checkAndExecuteOrders,
  fetchLivePrice,
} from "../services/orderEngine.js";

const router = Router();

const createOrderSchema = z.object({
  coinId: z.string().min(1),
  symbol: z.string().min(1),
  type: z.enum(["limit", "stop_loss", "take_profit"]),
  side: z.enum(["buy", "sell"]),
  targetPrice: z.number().positive(),
  amount: z.number().positive(),
  pin: z.string().optional(),
  transactionPin: z.string().optional(),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

// GET /orders — list user's orders
router.get("/", requireAuth, async (req, res) => {
  try {
    await ensureOrdersTable();
    const userId = req.user!.userId;
    const { status = "open" } = req.query;

    let query = db
      .select()
      .from(orders)
      .where(
        status === "all"
          ? eq(orders.userId, userId)
          : status === "history"
          ? and(eq(orders.userId, userId), inArray(orders.status, ["filled", "cancelled", "expired"]))
          : and(eq(orders.userId, userId), eq(orders.status, "open"))
      )
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const list = await query;

    res.json({
      orders: list.map((o) => ({
        ...o,
        targetPrice: Number(o.targetPrice),
        amount: Number(o.amount),
        total: Number(o.total),
        filledPrice: o.filledPrice ? Number(o.filledPrice) : null,
        createdAt: new Date(o.createdAt).getTime(),
        filledAt: o.filledAt ? new Date(o.filledAt).getTime() : null,
        cancelledAt: o.cancelledAt ? new Date(o.cancelledAt).getTime() : null,
      })),
      openCount: list.filter((o) => o.status === "open").length,
    });
  } catch (err: any) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /orders — place new limit / stop-loss order
router.post(
  "/",
  requireAuth,
  verifyTransactionPin,
  validate(createOrderSchema),
  async (req, res) => {
    try {
      await ensureOrdersTable();
      const userId = req.user!.userId;
      const { coinId, symbol, type, side, targetPrice, amount, reason, confidence } = req.body;
      const total = amount * targetPrice;

      let createdOrderId = "";

      await db.transaction(async (tx) => {
        if (side === "buy") {
          // Escrow USD from wallet
          const [wallet] = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, userId))
            .limit(1);

          if (!wallet || Number(wallet.balanceUsd) < total) {
            throw new Error(`Insufficient wallet balance. Required: $${total.toFixed(2)}, Available: $${Number(wallet?.balanceUsd || 0).toFixed(2)}`);
          }

          // Deduct from wallet
          await tx
            .update(wallets)
            .set({
              balanceUsd: sql`CAST(${wallets.balanceUsd} AS NUMERIC) - CAST(${total} AS NUMERIC)`,
            })
            .where(eq(wallets.userId, userId));
        } else {
          // Escrow crypto from holdings
          const [holding] = await tx
            .select()
            .from(holdings)
            .where(and(eq(holdings.userId, userId), eq(holdings.coinId, coinId)))
            .limit(1);

          if (!holding || Number(holding.amount) < amount) {
            throw new Error(`Insufficient ${symbol.toUpperCase()} holdings to place sell order.`);
          }

          const remaining = Number(holding.amount) - amount;
          if (remaining < 1e-10) {
            await tx.delete(holdings).where(eq(holdings.id, holding.id));
          } else {
            await tx
              .update(holdings)
              .set({ amount: String(remaining) })
              .where(eq(holdings.id, holding.id));
          }
        }

        // Insert order record
        const [inserted] = await tx
          .insert(orders)
          .values({
            userId,
            coinId,
            symbol: symbol.toLowerCase(),
            type,
            side,
            targetPrice: String(targetPrice),
            amount: String(amount),
            total: String(total),
            status: "open",
            reason: reason ?? null,
            confidence: confidence ?? null,
          })
          .returning({ id: orders.id });

        createdOrderId = inserted.id;

        // Notification
        const orderTypeName =
          type === "stop_loss"
            ? "Stop-Loss"
            : type === "take_profit"
            ? "Take-Profit"
            : `Limit ${side.toUpperCase()}`;

        try {
          await tx.insert(notifications).values({
            userId,
            type: "trade",
            title: `${orderTypeName} Order Placed`,
            message: `${side.toUpperCase()} ${amount} ${symbol.toUpperCase()} @ $${targetPrice.toFixed(2)} ($${total.toFixed(2)} locked in escrow)`,
            link: `/portfolio`,
          });
        } catch (_) {}
      });

      // Asynchronously trigger check in case it is immediately fillable
      checkAndExecuteOrders().catch(() => {});

      res.json({
        message: `${type.toUpperCase()} ${side.toUpperCase()} order placed successfully`,
        orderId: createdOrderId,
      });
    } catch (err: any) {
      console.error("Create order error:", err.message);
      res.status(400).json({ error: err.message || "Failed to place order" });
    }
  }
);

// DELETE /orders/:id — cancel open order & refund escrowed funds
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await ensureOrdersTable();
    const userId = req.user!.userId;
    const orderId = String(req.params.id);

    await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status !== "open") {
        throw new Error(`Cannot cancel order with status: ${order.status}`);
      }

      // 1. Mark as cancelled
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
        })
        .where(eq(orders.id, orderId));


      // 2. Refund escrowed funds
      const amount = Number(order.amount);
      const total = Number(order.total);

      if (order.side === "buy") {
        // Refund USD to wallet
        await tx
          .update(wallets)
          .set({
            balanceUsd: sql`CAST(${wallets.balanceUsd} AS NUMERIC) + CAST(${total} AS NUMERIC)`,
          })
          .where(eq(wallets.userId, userId));

        try {
          await tx.insert(notifications).values({
            userId,
            type: "trade",
            title: "Order Cancelled",
            message: `Cancelled Limit Buy for ${order.symbol.toUpperCase()}. Refunded $${total.toFixed(2)} to your wallet.`,
            link: `/portfolio`,
          });
        } catch (_) {}
      } else {
        // Refund crypto to holdings
        const [existing] = await tx
          .select()
          .from(holdings)
          .where(and(eq(holdings.userId, userId), eq(holdings.coinId, order.coinId)))
          .limit(1);

        if (existing) {
          const newAmt = Number(existing.amount) + amount;
          await tx
            .update(holdings)
            .set({ amount: String(newAmt) })
            .where(eq(holdings.id, existing.id));
        } else {
          await tx.insert(holdings).values({
            userId,
            coinId: order.coinId,
            symbol: order.symbol,
            name: order.symbol.toUpperCase(),
            amount: String(amount),
            avgPrice: String(order.targetPrice),
          });
        }

        try {
          await tx.insert(notifications).values({
            userId,
            type: "trade",
            title: "Order Cancelled",
            message: `Cancelled Sell Order. Refunded ${amount} ${order.symbol.toUpperCase()} to your holdings.`,
            link: `/portfolio`,
          });
        } catch (_) {}
      }
    });

    res.json({ message: "Order cancelled and funds returned successfully" });
  } catch (err: any) {
    console.error("Cancel order error:", err.message);
    res.status(400).json({ error: err.message || "Failed to cancel order" });
  }
});

// POST /orders/check — manual trigger to check and fill orders
router.post("/check", requireAuth, async (_req, res) => {
  try {
    const filledCount = await checkAndExecuteOrders();
    res.json({ filledCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
