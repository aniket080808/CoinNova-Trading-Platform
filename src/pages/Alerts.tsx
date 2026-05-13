import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemo, formatUSD } from "@/store/demo";
import { useMarkets } from "@/lib/coingecko";
import { Bell, Trash2, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Alerts() {
  const { alerts, addAlert, removeAlert } = useDemo();
  const { data: coins = [] } = useMarkets(1);
  const [coinId, setCoinId] = useState("bitcoin");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const v = parseFloat(price);
    if (!v) return toast.error("Enter price");
    const c = coins.find((x) => x.id === coinId);
    if (!c) return;

    setBusy(true);
    try {
      await addAlert({ coinId, symbol: c.symbol, direction, price: v });
      toast.success(`Alert set: ${c.symbol.toUpperCase()} ${direction} ${formatUSD(v)}`);
      setPrice("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create alert");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-display font-bold">Price alerts</h1>

      <GlassCard className="space-y-3">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Coin</Label>
            <Select value={coinId} onValueChange={setCoinId}>
              <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong max-h-72">
                {coins.slice(0, 30).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.symbol.toUpperCase()})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Direction</Label>
            <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
              <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="above">Goes above</SelectItem>
                <SelectItem value="below">Falls below</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target price (USD)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="50000" />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={busy} className="w-full bg-gradient-neon text-background">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
              Create
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <div className="divide-y divide-border/40">
          {alerts.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No alerts yet.</div>}
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                {a.direction === "above" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium uppercase">{a.symbol} {a.direction} {formatUSD(a.price)}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeAlert(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
