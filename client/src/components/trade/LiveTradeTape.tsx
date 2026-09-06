import { type PublicMarketTrade } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import clsx from "clsx";

interface LiveTradeTapeProps {
  trades: PublicMarketTrade[];
  symbol: string;
  isLive: boolean;
  className?: string;
}

function formatTradePrice(price: number): string {
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

export function LiveTradeTape({
  trades,
  symbol,
  isLive,
  className,
}: LiveTradeTapeProps) {
  return (
    <GlassCard className={clsx("p-4 flex flex-col font-mono text-xs select-none", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40 font-sans">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm">Market Trades</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                isLive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" : "bg-amber-400"
              )}
            />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Tape
            </span>
          </div>
        </div>

        <span className="text-[10px] text-muted-foreground font-sans">
          Real-time executions
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-4 text-[10px] uppercase font-semibold text-muted-foreground pt-2.5 pb-1 px-1">
        <div>Price (USDT)</div>
        <div className="text-right">Size</div>
        <div className="text-right">Value ($)</div>
        <div className="text-right">Time</div>
      </div>

      {/* Trade Feed Stream */}
      <div className="flex-1 overflow-y-auto max-h-[380px] scrollbar-thin pr-0.5 space-y-0.5 py-1">
        {trades.map((trade) => {
          // isBuyerMaker true = trade was a market Sell; false = trade was a market Buy
          const isBuy = !trade.isBuyerMaker;
          const totalValue = trade.price * trade.amount;
          const isWhale = totalValue >= 10000;

          const timeLabel = new Date(trade.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });

          return (
            <div
              key={trade.id}
              className={clsx(
                "grid grid-cols-4 py-1 px-1 rounded transition-colors items-center",
                isWhale
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "hover:bg-white/[0.03]"
              )}
            >
              {/* Price */}
              <div
                className={clsx(
                  "font-semibold flex items-center gap-0.5 truncate",
                  isBuy ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {isBuy ? (
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 shrink-0" />
                )}
                <span>{formatTradePrice(trade.price)}</span>
              </div>

              {/* Amount */}
              <div className="text-right text-foreground/85">
                {formatAmount(trade.amount)}
              </div>

              {/* Total Value */}
              <div className="text-right font-medium text-foreground/70">
                ${totalValue >= 1000 ? (totalValue / 1000).toFixed(1) + "k" : totalValue.toFixed(0)}
              </div>

              {/* Timestamp */}
              <div className="text-right text-muted-foreground text-[10px]">
                {timeLabel}
              </div>
            </div>
          );
        })}

        {trades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs font-sans">
            Listening for trade executions...
          </div>
        )}
      </div>

      <div className="pt-2 mt-1 border-t border-border/30 text-[10px] text-muted-foreground font-sans flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Market Buy
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Market Sell
          </span>
        </div>
        <span className="text-amber-400 font-medium">Gold = Whale Trade (&gt;$10k)</span>
      </div>
    </GlassCard>
  );
}
