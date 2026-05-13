import { GlassCard } from "@/components/glass/GlassCard";
import { useDemo, formatUSD, formatPct } from "@/store/demo";
import { useCoinsByIds } from "@/lib/coingecko";
import { TradeDialog } from "@/components/trade/TradeDialog";
import { Button } from "@/components/ui/button";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import { usePrices } from "@/lib/binance";

const COLORS = ["hsl(142 76% 56%)", "hsl(258 90% 76%)", "hsl(190 95% 60%)", "hsl(38 92% 60%)", "hsl(0 84% 65%)", "hsl(220 80% 60%)"];

export default function Portfolio() {
  const { holdings } = useDemo();
  const { prices: livePrices } = usePrices();
  const { data: coins = [] } = useCoinsByIds(holdings.map((h) => h.coinId));

  const enriched = holdings.map((h) => {
    const c = coins.find((x) => x.id === h.coinId);
    const livePrice = livePrices[h.symbol.toLowerCase()];
    const price = livePrice ?? c?.current_price ?? h.avgPrice;
    
    const value = price * h.amount;
    const cost = h.avgPrice * h.amount;
    const pl = value - cost;
    const plPct = cost ? (pl / cost) * 100 : 0;
    return { ...h, price, value, cost, pl, plPct, image: c?.image ?? h.image };
  });

  const totalValue = enriched.reduce((s, h) => s + h.value, 0);
  const totalCost = enriched.reduce((s, h) => s + h.cost, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost ? (totalPL / totalCost) * 100 : 0;

  const pieData = enriched.map((h) => ({ name: h.symbol.toUpperCase(), value: h.value }));

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-display font-bold">Portfolio</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <GlassCard><div className="text-xs text-muted-foreground">Total value</div><div className="text-2xl font-display font-bold">{formatUSD(totalValue)}</div></GlassCard>
        <GlassCard><div className="text-xs text-muted-foreground">Cost basis</div><div className="text-2xl font-display font-bold">{formatUSD(totalCost)}</div></GlassCard>
        <GlassCard className={totalPL >= 0 ? "neon-border" : ""}>
          <div className="text-xs text-muted-foreground">Total P/L</div>
          <div className={`text-2xl font-display font-bold ${totalPL >= 0 ? "text-primary" : "text-destructive"}`}>{formatUSD(totalPL)}</div>
          <div className={`text-xs ${totalPL >= 0 ? "text-primary" : "text-destructive"} flex items-center gap-1`}>
            {totalPL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {formatPct(totalPLPct)}
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2">
          <h3 className="font-semibold mb-3">Holdings</h3>
          {enriched.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-muted-foreground text-sm">No holdings yet.</p>
              <Button asChild className="bg-gradient-neon text-background"><Link to="/market">Browse market</Link></Button>
            </div>
          ) : (
            <div className="space-y-2">
              {enriched.map((h) => (
                <div key={h.coinId} className="glass rounded-xl p-3 flex items-center gap-3">
                  <img src={h.image} alt="" className="w-9 h-9 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{h.name}</div>
                    <div className="text-xs text-muted-foreground">{h.amount.toFixed(6)} {h.symbol.toUpperCase()} @ {formatUSD(h.avgPrice)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUSD(h.value)}</div>
                    <div className={`text-xs ${h.pl >= 0 ? "text-primary" : "text-destructive"}`}>{formatPct(h.plPct)}</div>
                  </div>
                  {coins.find((c) => c.id === h.coinId) && (
                    <TradeDialog
                      defaultTab="sell"
                      coin={coins.find((c) => c.id === h.coinId)!}
                      trigger={<Button size="sm" variant="outline" className="glass">Trade</Button>}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="font-semibold mb-3">Allocation</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Buy coins to see your allocation.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                    formatter={(v: any) => formatUSD(v as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1 mt-3 text-xs">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex justify-between items-center">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {p.name}</span>
                <span className="text-muted-foreground">{((p.value / totalValue) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
