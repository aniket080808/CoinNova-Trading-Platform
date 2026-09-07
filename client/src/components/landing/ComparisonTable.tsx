import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Sparkles, Shield, Zap, Gift, Smartphone } from "lucide-react";

interface ComparisonRow {
  feature: string;
  coinNova: string;
  traditional: string;
  highlight?: boolean;
}

const COMPARISONS: ComparisonRow[] = [
  {
    feature: "Zero-Risk Demo Capital",
    coinNova: "$100,000 Instant Virtual Cash",
    traditional: "None / Real funds at risk immediately",
    highlight: true
  },
  {
    feature: "Nova AI Intelligence Copilot",
    coinNova: "Included Free (Risk score & sentiment)",
    traditional: "No AI / Paid 3rd party subscription bots",
    highlight: true
  },
  {
    feature: "Dual USD & INR Currency",
    coinNova: "Native 1-Click Real-time FX Toggle",
    traditional: "USD / USDT only with high conversion fees"
  },
  {
    feature: "Transaction PIN Security",
    coinNova: "Bank-Grade 6-Digit PIN + 2FA",
    traditional: "Single account password only"
  },
  {
    feature: "Referral Rewards",
    coinNova: "$25 Direct Cash Credit per Friend",
    traditional: "Tiny 5–10% trading fee discount rebate",
    highlight: true
  },
  {
    feature: "Order Matching Engine",
    coinNova: "Institutional Order Book & Slippage Simulation",
    traditional: "Simple basic swap forms"
  },
  {
    feature: "Mobile App Access",
    coinNova: "1-Tap Installable PWA (iOS & Android)",
    traditional: "Heavy 150MB store downloads & slow updates"
  }
];

export function ComparisonTable() {
  return (
    <section className="container py-20">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Direct Feature Matrix
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-display font-bold">
          Why traders choose <span className="text-gradient">CoinNova</span>
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          See how CoinNova’s institutional-grade simulator and AI copilot outshine traditional platforms.
        </p>
      </div>

      <GlassCard className="p-0 overflow-hidden border-primary/20 shadow-2xl rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 sm:p-5 font-bold">Core Feature</th>
                <th className="p-4 sm:p-5 font-bold bg-primary/10 text-primary border-x border-primary/25">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> CoinNova Platform
                  </div>
                </th>
                <th className="p-4 sm:p-5 font-bold">Traditional Exchanges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs sm:text-sm">
              {COMPARISONS.map((row, i) => (
                <tr 
                  key={row.feature} 
                  className={`hover:bg-white/[0.02] transition-colors ${
                    row.highlight ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  <td className="p-4 sm:p-5 font-semibold text-foreground">
                    {row.feature}
                  </td>
                  <td className="p-4 sm:p-5 bg-primary/5 border-x border-primary/20 font-bold text-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{row.coinNova}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                      <span>{row.traditional}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </section>
  );
}
