import { useState } from "react";
import { useDemo, formatUSD } from "@/store/demo";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePrices } from "@/lib/binance";
import {
  Target,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  XCircle,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OpenOrdersTable() {
  const { orders = [], cancelOrder, mode, syncAll, format } = useDemo();
  const { prices: livePrices } = usePrices();
  const [filter, setFilter] = useState<"open" | "history">("open");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const openOrders = orders.filter((o) => o.status === "open");
  const pastOrders = orders.filter((o) => o.status !== "open");
  const displayedOrders = filter === "open" ? openOrders : pastOrders;

  const handleCancel = async (id: string, symbol: string) => {
    setCancellingId(id);
    try {
      await cancelOrder(id);
      toast.success(`Order for ${symbol.toUpperCase()} cancelled. Funds refunded.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (mode === "live") await syncAll();
      toast.success("Orders refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border/30">
          <button
            onClick={() => setFilter("open")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              filter === "open"
                ? "bg-primary text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Active Orders
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                filter === "open"
                  ? "bg-background text-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {openOrders.length}
            </span>
          </button>

          <button
            onClick={() => setFilter("history")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              filter === "history"
                ? "bg-primary text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Order History
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                filter === "history"
                  ? "bg-background text-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {pastOrders.length}
            </span>
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Orders List Container */}
      <GlassCard className="p-0 overflow-hidden border-border/40">
        {displayedOrders.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground/60">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {filter === "open" ? "No Active Orders" : "No Past Orders Yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto pt-1">
                {filter === "open"
                  ? "You don't have any pending limit or stop-loss orders. You can set target prices to auto-trade 24/7."
                  : "Completed or cancelled orders will appear here once executed."}
              </p>
            </div>
            {filter === "open" && (
              <Link to="/market" className="inline-block pt-1">
                <Button size="sm" className="bg-primary text-background text-xs">
                  Browse Markets & Place Orders
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {/* Table Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-secondary/20">
              <div className="col-span-3">Market / Pair</div>
              <div className="col-span-2">Type / Side</div>
              <div className="col-span-2 text-right">Target Price</div>
              <div className="col-span-2 text-right">Amount / Total</div>
              <div className="col-span-2 text-center">Trigger Distance</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            <AnimatePresence>
              {displayedOrders.map((order, idx) => {
                const livePrice = livePrices[order.symbol.toLowerCase()] || 0;
                const distPct = livePrice
                  ? ((order.targetPrice - livePrice) / livePrice) * 100
                  : 0;

                const isBuy = order.side === "buy";
                const isStop = order.type === "stop_loss";

                return (
                  <motion.div
                    key={order.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 md:px-4 md:py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:bg-primary/5 transition-colors group"
                  >
                    {/* Coin / Symbol */}
                    <div className="col-span-3 flex items-center justify-between md:justify-start gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary/70 flex items-center justify-center font-bold text-xs uppercase border border-border/40">
                          {order.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <Link
                            to={`/coin/${order.coinId}`}
                            className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <span>{order.symbol.toUpperCase()}</span>
                            <span className="text-muted-foreground text-xs font-normal">/ USD</span>
                          </Link>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(order.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Badge */}
                      <div className="md:hidden">
                        <OrderBadge order={order} />
                      </div>
                    </div>

                    {/* Order Type Badge (Desktop) */}
                    <div className="hidden md:block col-span-2">
                      <OrderBadge order={order} />
                    </div>

                    {/* Target Price */}
                    <div className="col-span-2 text-right">
                      <div className="text-sm font-mono font-semibold text-foreground">
                        {formatUSD(order.targetPrice)}
                      </div>
                      {livePrice > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                          Live: {formatUSD(livePrice)}
                        </div>
                      )}
                    </div>

                    {/* Amount & Total */}
                    <div className="col-span-2 text-right">
                      <div className="text-xs font-mono font-medium text-foreground">
                        {order.amount.toFixed(4)} {order.symbol.toUpperCase()}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Total: {formatUSD(order.total)}
                      </div>
                    </div>

                    {/* Trigger Distance Gauge / Fill Status */}
                    <div className="col-span-2 text-center">
                      {order.status === "open" ? (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                              Math.abs(distPct) < 2
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : distPct < 0
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-primary/10 text-primary border-primary/30"
                            }`}
                          >
                            {distPct > 0 ? `+${distPct.toFixed(1)}%` : `${distPct.toFixed(1)}%`}
                          </span>
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {isBuy
                              ? "awaiting drop"
                              : isStop
                              ? "safety threshold"
                              : "awaiting rise"}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              order.status === "filled"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-muted/40 text-muted-foreground border border-border/30"
                            }`}
                          >
                            {order.status === "filled" ? "Executed" : "Cancelled"}
                          </span>
                          {order.filledPrice && (
                            <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              @ {formatUSD(order.filledPrice)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="col-span-1 text-right">
                      {order.status === "open" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancel(order.id, order.symbol)}
                          className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="md:hidden">Cancel Order</span>
                            </span>
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function OrderBadge({ order }: { order: any }) {
  if (order.type === "stop_loss") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
        <ShieldAlert className="w-3 h-3" />
        STOP-LOSS
      </span>
    );
  }

  if (order.type === "take_profit") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
        <Target className="w-3 h-3" />
        TAKE-PROFIT
      </span>
    );
  }

  if (order.side === "buy") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <ArrowDown className="w-3 h-3" />
        LIMIT BUY
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
      <ArrowUp className="w-3 h-3" />
      LIMIT SELL
    </span>
  );
}
