import { GlassCard } from "@/components/glass/GlassCard";
import { useDemo, formatUSD } from "@/store/demo";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Banknote, CreditCard } from "lucide-react";
import { useState } from "react";

const ICONS: any = {
  buy: <ArrowDownRight className="w-4 h-4" />,
  sell: <ArrowUpRight className="w-4 h-4" />,
  deposit: <CreditCard className="w-4 h-4" />,
  withdraw: <Banknote className="w-4 h-4" />,
  transfer: <ArrowLeftRight className="w-4 h-4" />,
};

export default function Transactions() {
  const { transactions } = useDemo();
  const [filter, setFilter] = useState<string>("all");
  const filtered = transactions.filter((t) => filter === "all" || t.type === filter);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-display font-bold">Transactions</h1>

      <GlassCard className="p-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "buy", "sell", "deposit", "withdraw", "transfer"].map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 text-xs rounded-full capitalize transition ${filter === t ? "bg-primary text-background" : "glass text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="divide-y divide-border/40">
          {filtered.length === 0 && <div className="p-10 text-center text-muted-foreground text-sm">No transactions.</div>}
          {filtered.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-4 py-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === "buy" ? "bg-primary/15 text-primary" : t.type === "sell" ? "bg-destructive/15 text-destructive" : "bg-secondary/15 text-secondary"}`}>
                {ICONS[t.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium capitalize">
                  {t.type} {t.symbol && t.symbol.toUpperCase()} {t.to && <span className="text-muted-foreground"> → {t.to}</span>}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()} · {t.mode}</div>
              </div>
              <Badge variant="outline" className={
                t.status === "completed" ? "border-primary/40 text-primary" :
                t.status === "pending" ? "border-warning/40 text-warning" : "border-destructive/40 text-destructive"
              }>{t.status}</Badge>
              <div className="text-right">
                <div className="font-semibold">{formatUSD(t.total)}</div>
                {t.amount && t.symbol && <div className="text-[10px] text-muted-foreground">{t.amount.toFixed(6)} {t.symbol.toUpperCase()}</div>}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
