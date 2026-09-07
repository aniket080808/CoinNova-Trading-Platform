import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDown, Printer, Calendar, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useDemo, formatUSD } from "@/store/demo";
import { exportTransactionsToCSV, printStatement, ExportTransaction } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

interface ExportStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATE_RANGES = [
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Year 2025", year: 2025 },
  { label: "Year 2026", year: 2026 },
  { label: "All Time", days: Infinity },
];

export function ExportStatementModal({ open, onOpenChange }: ExportStatementModalProps) {
  const { transactions, user } = useDemo();
  const [selectedRange, setSelectedRange] = useState(4); // Default: All Time

  const filteredTxs = useMemo(() => {
    const range = DATE_RANGES[selectedRange];
    const now = Date.now();

    return transactions.filter((t) => {
      const txDate = new Date(t.createdAt).getTime();
      if ("year" in range && range.year) {
        const year = new Date(t.createdAt).getFullYear();
        return year === range.year;
      }
      if (range.days === Infinity) return true;
      return now - txDate <= range.days * 24 * 60 * 60 * 1000;
    });
  }, [transactions, selectedRange]);

  const exportData: ExportTransaction[] = useMemo(
    () =>
      filteredTxs.map((t) => ({
        date: new Date(t.createdAt).toLocaleString(),
        type: t.type,
        coin: t.coinId ?? undefined,
        symbol: t.symbol ?? undefined,
        amount: t.amount ?? 0,
        priceUsd: t.price ?? null,
        totalUsd: t.total ?? 0,
        status: t.status ?? "completed",
        realizedPnl: undefined,
      })),
    [filteredTxs]
  );

  // Summary stats
  const stats = useMemo(() => {
    const buys = filteredTxs.filter((t) => t.type === "buy");
    const sells = filteredTxs.filter((t) => t.type === "sell");
    const deposits = filteredTxs.filter((t) => t.type === "deposit");
    const withdrawals = filteredTxs.filter((t) => t.type === "withdraw");

    return {
      totalVolume: filteredTxs.reduce((s, t) => s + (t.total ?? 0), 0),
      totalBuys: buys.reduce((s, t) => s + (t.total ?? 0), 0),
      totalSells: sells.reduce((s, t) => s + (t.total ?? 0), 0),
      totalDeposits: deposits.reduce((s, t) => s + (t.total ?? 0), 0),
      totalWithdrawals: withdrawals.reduce((s, t) => s + (t.total ?? 0), 0),
      tradeCount: buys.length + sells.length,
      txCount: filteredTxs.length,
    };
  }, [filteredTxs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Export Financial Statement
          </DialogTitle>
          <DialogDescription>
            Download your trading history as CSV or a print-ready PDF statement.
          </DialogDescription>
        </DialogHeader>

        {/* Date range selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" /> Select Period
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_RANGES.map((range, i) => (
              <button
                key={range.label}
                onClick={() => setSelectedRange(i)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full transition-all font-medium",
                  selectedRange === i
                    ? "bg-primary text-background shadow-glow-primary/20"
                    : "glass text-muted-foreground hover:text-foreground"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Stats */}
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</div>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Total Volume" value={formatUSD(stats.totalVolume)} />
            <StatBox label="Transactions" value={String(stats.txCount)} />
            <StatBox
              label="Total Buys"
              value={formatUSD(stats.totalBuys)}
              icon={<TrendingUp className="w-3 h-3 text-emerald-400" />}
            />
            <StatBox
              label="Total Sells"
              value={formatUSD(stats.totalSells)}
              icon={<TrendingDown className="w-3 h-3 text-red-400" />}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => {
              exportTransactionsToCSV(exportData, "coinnova_statement");
              onOpenChange(false);
            }}
            disabled={exportData.length === 0}
            className="flex-1 bg-gradient-neon text-background shadow-glow-primary"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download CSV (Excel)
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              printStatement(exportData, user?.name ?? "CoinNova User");
              onOpenChange(false);
            }}
            disabled={exportData.length === 0}
            className="flex-1 glass"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>

        {exportData.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-2">
            No transactions found for the selected period.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}
