import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Flame } from "lucide-react";

export type RiskLevel = "low" | "medium" | "high";

export const riskFor = (volatility: number): RiskLevel => {
  if (volatility < 5) return "low";
  if (volatility < 12) return "medium";
  return "high";
};

export const RiskBadge = ({ level }: { level: RiskLevel }) => {
  const cfg = {
    low: { Icon: Shield, label: "Low Risk", cls: "border-primary/40 text-primary bg-primary/10" },
    medium: { Icon: AlertTriangle, label: "Medium Risk", cls: "border-warning/40 text-warning bg-warning/10" },
    high: { Icon: Flame, label: "High Risk", cls: "border-destructive/40 text-destructive bg-destructive/10" },
  }[level];
  return (
    <Badge variant="outline" className={`${cfg.cls} gap-1`}>
      <cfg.Icon className="w-3 h-3" /> {cfg.label}
    </Badge>
  );
};
