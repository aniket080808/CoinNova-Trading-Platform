import { useState } from "react";
import { type OrderBookData } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { ArrowUp, ArrowDown, Activity } from "lucide-react";
import clsx from "clsx";

interface OrderBookProps {
  orderBook: OrderBookData;
  isLive: boolean;
  symbol: string;
  onSelectPrice?: (price: number) => void;
  className?: string;
}

type ViewMode = "both" | "bids" | "asks";

function formatOrderPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (price >= 0.001) return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 6, maximumFractionDigits: 8 });
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (amount >= 1) return amount.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return amount.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function OrderBook({
  orderBook,
  isLive,
  symbol,
  onSelectPrice,
  className,
}: OrderBookProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  const { asks, bids, spread, spreadPercent, midPrice } = orderBook;

  // For "both" mode, show up to 7 asks and 7 bids. For single mode, show up to 14.
  const displayLimit = viewMode === "both" ? 7 : 14;

  // Asks are displayed with highest ask on top and lowest ask right above the spread
  const visibleAsks = asks.slice(0, displayLimit).reverse();
  const visibleBids = bids.slice(0, displayLimit);

  return (
    <GlassCard className={clsx("p-4 flex flex-col font-mono text-xs select-none", className)}>
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 font-sans">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm">Order Book</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                isLive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "bg-amber-400"
              )}
            />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              {isLive ? "Live" : "Polling"}
            </span>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-0.5 glass p-0.5 rounded-lg text-[10px]">
          <button
            onClick={() => setViewMode("both")}
            className={clsx(
              "px-2 py-0.5 rounded transition",
              viewMode === "both" ? "bg-primary text-background font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Both
          </button>
          <button
            onClick={() => setViewMode("bids")}
            className={clsx(
              "px-2 py-0.5 rounded transition text-emerald-400",
              viewMode === "bids" ? "bg-emerald-500/20 font-bold shadow-sm" : "hover:text-foreground"
            )}
          >
            Bids
          </button>
          <button
            onClick={() => setViewMode("asks")}
            className={clsx(
              "px-2 py-0.5 rounded transition text-rose-400",
              viewMode === "asks" ? "bg-rose-500/20 font-bold shadow-sm" : "hover:text-foreground"
            )}
          >
            Asks
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-[10px] uppercase font-semibold text-muted-foreground pt-2.5 pb-1 px-1">
        <div>Price (USDT)</div>
        <div className="text-right">Size ({symbol.toUpperCase()})</div>
        <div className="text-right">Total</div>
      </div>

      {/* Book Container */}
      <div className="flex-1 flex flex-col justify-between py-1">
        {/* Asks (Sell Orders) */}
        {(viewMode === "both" || viewMode === "asks") && (
          <div className="space-y-0.5 flex-1 flex flex-col justify-end">
            {visibleAsks.map((ask, idx) => (
              <div
                key={`ask-${ask.price}-${idx}`}
                onClick={() => onSelectPrice?.(ask.price)}
                className="grid grid-cols-3 py-1 px-1 relative cursor-pointer group hover:bg-rose-500/10 rounded transition-colors"
                title="Click to place Limit Buy/Sell at this price"
              >
                {/* Visual Depth Bar Fill */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-rose-500/15 pointer-events-none transition-all duration-150 rounded-l"
                  style={{ width: `${ask.percent}%` }}
                />
                <div className="text-rose-400 font-semibold relative z-10 group-hover:underline">
                  {formatOrderPrice(ask.price)}
                </div>
                <div className="text-right text-foreground/80 relative z-10">
                  {formatAmount(ask.amount)}
                </div>
                <div className="text-right text-muted-foreground text-[11px] relative z-10">
                  {formatAmount(ask.total)}
                </div>
              </div>
            ))}
            {visibleAsks.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs font-sans">
                Loading asks...
              </div>
            )}
          </div>
        )}

        {/* Middle Spread & Mid Price Bar */}
        <div className="my-1.5 py-1.5 px-2 glass rounded-lg flex items-center justify-between border border-border/30 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold font-mono tracking-tight text-foreground">
              {formatOrderPrice(midPrice)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Mid</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            <span>Spread:</span>
            <span className="text-foreground font-semibold">${formatOrderPrice(spread)}</span>
            <span className="text-[10px] text-primary/80">({spreadPercent.toFixed(3)}%)</span>
          </div>
        </div>

        {/* Bids (Buy Orders) */}
        {(viewMode === "both" || viewMode === "bids") && (
          <div className="space-y-0.5 flex-1">
            {visibleBids.map((bid, idx) => (
              <div
                key={`bid-${bid.price}-${idx}`}
                onClick={() => onSelectPrice?.(bid.price)}
                className="grid grid-cols-3 py-1 px-1 relative cursor-pointer group hover:bg-emerald-500/10 rounded transition-colors"
                title="Click to place Limit Buy/Sell at this price"
              >
                {/* Visual Depth Bar Fill */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-emerald-500/15 pointer-events-none transition-all duration-150 rounded-l"
                  style={{ width: `${bid.percent}%` }}
                />
                <div className="text-emerald-400 font-semibold relative z-10 group-hover:underline">
                  {formatOrderPrice(bid.price)}
                </div>
                <div className="text-right text-foreground/80 relative z-10">
                  {formatAmount(bid.amount)}
                </div>
                <div className="text-right text-muted-foreground text-[11px] relative z-10">
                  {formatAmount(bid.total)}
                </div>
              </div>
            ))}
            {visibleBids.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs font-sans">
                Loading bids...
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 mt-1 border-t border-border/30 text-[10px] text-muted-foreground font-sans flex items-center justify-between">
        <span>Click any price to pre-fill order</span>
        <span className="text-primary font-medium">Level 2 Depth</span>
      </div>
    </GlassCard>
  );
}
