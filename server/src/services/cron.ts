import cron from "node-cron";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { alerts, users } from "../db/schema.js";
import { sendPriceAlert } from "./email.js";

// Fetch current prices from Binance REST API for alerts evaluation
async function getBinancePrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    if (!res.ok) throw new Error("Failed to fetch Binance prices");
    const data: { symbol: string; price: string }[] = await res.json();
    
    const prices: Record<string, number> = {};
    for (const item of data) {
      if (item.symbol.endsWith("USDT")) {
        // e.g. BTCUSDT -> BTC
        const symbol = item.symbol.replace("USDT", "").toLowerCase();
        prices[symbol] = parseFloat(item.price);
      }
    }
    return prices;
  } catch (err) {
    console.error("Binance price fetch error:", err);
    return {};
  }
}

export function startCronJobs() {
  console.log("🕒 Starting background cron jobs...");

  // Run every 1 minute
  cron.schedule("* * * * *", async () => {
    try {
      const activeAlerts = await db.select({
        id: alerts.id,
        userId: alerts.userId,
        coinId: alerts.coinId,
        symbol: alerts.symbol,
        direction: alerts.direction,
        price: alerts.price,
      }).from(alerts).where(eq(alerts.active, true));

      if (activeAlerts.length === 0) return;

      const livePrices = await getBinancePrices();
      if (Object.keys(livePrices).length === 0) return;

      for (const alert of activeAlerts) {
        const symbol = alert.symbol.toLowerCase();
        const livePrice = livePrices[symbol];

        if (!livePrice) continue;

        const targetPrice = parseFloat(alert.price);
        let triggered = false;

        if (alert.direction === "above" && livePrice >= targetPrice) {
          triggered = true;
        } else if (alert.direction === "below" && livePrice <= targetPrice) {
          triggered = true;
        }

        if (triggered) {
          // Get user email
          const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, alert.userId)).limit(1);
          if (user) {
            await sendPriceAlert(user.email, alert.symbol, alert.direction, livePrice);
          }

          // Mark as inactive using a Drizzle transaction to be safe
          await db.update(alerts).set({ active: false }).where(eq(alerts.id, alert.id));
          console.log(`🔔 Alert triggered for ${alert.symbol} (User: ${user?.email})`);
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
}
