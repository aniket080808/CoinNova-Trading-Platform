import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, holdings, wallets, transactions, notifications } from "../db/schema.js";

let tableEnsured = false;

export async function ensureOrdersTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
          CREATE TYPE order_type AS ENUM ('limit', 'stop_loss', 'take_profit');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_side') THEN
          CREATE TYPE order_side AS ENUM ('buy', 'sell');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
          CREATE TYPE order_status AS ENUM ('open', 'filled', 'cancelled', 'expired');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        coin_id VARCHAR(100) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        type order_type NOT NULL,
        side order_side NOT NULL,
        target_price NUMERIC(18, 8) NOT NULL,
        amount NUMERIC(18, 8) NOT NULL,
        total NUMERIC(18, 8) NOT NULL,
        status order_status DEFAULT 'open' NOT NULL,
        filled_price NUMERIC(18, 8),
        reason VARCHAR(50),
        confidence INTEGER,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        filled_at TIMESTAMP,
        cancelled_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
      CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
      CREATE INDEX IF NOT EXISTS orders_coin_idx ON orders(coin_id);
    `);
    tableEnsured = true;
  } catch (err) {
    console.error("Failed to ensure orders table:", err);
  }
}

// In-memory price cache for order matching
const priceCache = new Map<string, { price: number; timestamp: number }>();

export async function fetchLivePrice(symbol: string, coinId: string): Promise<number | null> {
  const cacheKey = symbol.toUpperCase();
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10_000) {
    return cached.price;
  }

  // 1. Try Binance REST API (Fastest & most reliable)
  try {
    const pair = `${cacheKey}USDT`;
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const p = parseFloat(data.price);
      if (p > 0) {
        priceCache.set(cacheKey, { price: p, timestamp: Date.now() });
        return p;
      }
    }
  } catch (_) {}

  // 2. Try CoinGecko simple price fallback
  try {
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (cgRes.ok) {
      const cgData = await cgRes.json();
      const p = cgData[coinId]?.usd;
      if (p > 0) {
        priceCache.set(cacheKey, { price: p, timestamp: Date.now() });
        return p;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Check and execute all pending open limit and stop-loss orders
 */
export async function checkAndExecuteOrders(): Promise<number> {
  await ensureOrdersTable();

  try {
    const openOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "open"));

    if (!openOrders.length) return 0;

    let filledCount = 0;

    for (const order of openOrders) {
      const currentPrice = await fetchLivePrice(order.symbol, order.coinId);
      if (!currentPrice) continue;

      const target = Number(order.targetPrice);
      const amount = Number(order.amount);
      const total = Number(order.total);

      let shouldFill = false;

      if (order.side === "buy" && order.type === "limit") {
        // Buy limit: price dropped to or below target
        shouldFill = currentPrice <= target;
      } else if (order.side === "sell" && order.type === "limit") {
        // Sell limit: price rose to or above target
        shouldFill = currentPrice >= target;
      } else if (order.side === "sell" && order.type === "stop_loss") {
        // Stop-loss: price dropped to or below stop price
        shouldFill = currentPrice <= target;
      } else if (order.side === "sell" && order.type === "take_profit") {
        // Take-profit: price rose to or above target
        shouldFill = currentPrice >= target;
      }

      if (!shouldFill) continue;

      // Execute order atomically
      await db.transaction(async (tx) => {
        // Verify order is still open
        const [fresh] = await tx
          .select()
          .from(orders)
          .where(and(eq(orders.id, order.id), eq(orders.status, "open")))
          .limit(1);

        if (!fresh) return; // already processed

        const executionPrice = currentPrice;
        const actualCost = amount * executionPrice;
        const leftoverEscrow = order.side === "buy" ? Math.max(0, total - actualCost) : 0;
        const finalTotal = actualCost;

        // 1. Mark order as filled
        await tx
          .update(orders)
          .set({
            status: "filled",
            filledPrice: String(executionPrice),
            filledAt: new Date(),
          })
          .where(eq(orders.id, order.id));

        if (order.side === "buy") {
          // BUY: USD was already escrowed on creation.
          // Refund any price improvement surplus to the user's wallet.
          if (leftoverEscrow > 0.0001) {
            await tx
              .update(wallets)
              .set({
                balanceUsd: sql`CAST(${wallets.balanceUsd} AS NUMERIC) + CAST(${leftoverEscrow} AS NUMERIC)`,
              })
              .where(eq(wallets.userId, order.userId));
          }

          // Credit holdings with actualCost
          const [existingHolding] = await tx
            .select()
            .from(holdings)
            .where(
              and(eq(holdings.userId, order.userId), eq(holdings.coinId, order.coinId))
            )
            .limit(1);

          if (existingHolding) {
            const oldAmt = Number(existingHolding.amount);
            const oldAvg = Number(existingHolding.avgPrice);
            const newAmt = oldAmt + amount;
            const newAvg = (oldAvg * oldAmt + actualCost) / newAmt;
            await tx
              .update(holdings)
              .set({
                amount: String(newAmt),
                avgPrice: String(newAvg),
              })
              .where(eq(holdings.id, existingHolding.id));
          } else {
            await tx.insert(holdings).values({
              userId: order.userId,
              coinId: order.coinId,
              symbol: order.symbol,
              name: order.symbol.toUpperCase(),
              amount: String(amount),
              avgPrice: String(executionPrice),
            });
          }

          // Insert completed transaction
          await tx.insert(transactions).values({
            userId: order.userId,
            type: "buy",
            coinId: order.coinId,
            symbol: order.symbol,
            amount: String(amount),
            price: String(executionPrice),
            total: String(finalTotal),
            status: "completed",
            reason: order.reason ?? null,
            confidence: order.confidence ?? null,
          });

          // Send trade notification
          try {
            const refundMsg = leftoverEscrow > 0.01 ? ` Refunded $${leftoverEscrow.toFixed(2)} price improvement to your wallet.` : "";
            await tx.insert(notifications).values({
              userId: order.userId,
              type: "trade",
              title: `Limit Order Filled: Bought ${amount.toFixed(4)} ${order.symbol.toUpperCase()}`,
              message: `Target reached! Executed at $${executionPrice.toFixed(2)} for total $${finalTotal.toFixed(2)}.${refundMsg}`,
              link: `/coin/${order.coinId}`,
            });
          } catch (_) {}
        } else {
          // SELL: Holding was already escrowed on creation. Credit USD to wallet.
          await tx
            .update(wallets)
            .set({
              balanceUsd: sql`CAST(${wallets.balanceUsd} AS NUMERIC) + CAST(${finalTotal} AS NUMERIC)`,
            })
            .where(eq(wallets.userId, order.userId));

          // Insert completed transaction
          await tx.insert(transactions).values({
            userId: order.userId,
            type: "sell",
            coinId: order.coinId,
            symbol: order.symbol,
            amount: String(amount),
            price: String(executionPrice),
            total: String(finalTotal),
            status: "completed",
            reason: order.reason ?? null,
            confidence: order.confidence ?? null,
          });

          // Send trade notification
          const orderName = order.type === "stop_loss" ? "Stop-Loss" : order.type === "take_profit" ? "Take-Profit" : "Limit Sell";
          try {
            await tx.insert(notifications).values({
              userId: order.userId,
              type: "trade",
              title: `${orderName} Executed: Sold ${amount.toFixed(4)} ${order.symbol.toUpperCase()}`,
              message: `Trigger hit at $${executionPrice.toFixed(2)}. Credited $${finalTotal.toFixed(2)} to your wallet.`,
              link: `/coin/${order.coinId}`,
            });
          } catch (_) {}
        }

        filledCount++;
      });
    }

    return filledCount;
  } catch (err: any) {
    console.error("Order engine execution error:", err.message);
    return 0;
  }
}

// Start background order matcher loop (every 10s)
let engineInterval: NodeJS.Timeout | null = null;

export function startOrderEngine() {
  if (engineInterval) return;
  console.log("🚀 Starting Order Matching Engine...");
  engineInterval = setInterval(async () => {
    try {
      await checkAndExecuteOrders();
    } catch (_) {}
  }, 10_000);
}
