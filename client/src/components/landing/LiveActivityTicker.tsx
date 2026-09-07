import { useState, useEffect } from "react";
import { Zap, Gift, ShieldCheck, Bot, UserCheck } from "lucide-react";

interface ActivityEvent {
  id: string;
  icon: any;
  color: string;
  bgColor: string;
  text: string;
  time: string;
}

const ACTIVITIES: ActivityEvent[] = [
  {
    id: "1",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15 border-emerald-500/30",
    text: "Trader in Mumbai executed Limit Buy for 1.45 BTC",
    time: "6s ago"
  },
  {
    id: "2",
    icon: Gift,
    color: "text-amber-400",
    bgColor: "bg-amber-500/15 border-amber-500/30",
    text: "User received $25.00 Referral Cash via NOVA-8921",
    time: "24s ago"
  },
  {
    id: "3",
    icon: Bot,
    color: "text-primary",
    bgColor: "bg-primary/15 border-primary/30",
    text: "Nova AI generated risk diagnostic for SOL portfolio",
    time: "48s ago"
  },
  {
    id: "4",
    icon: ShieldCheck,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15 border-cyan-500/30",
    text: "6-Digit Transaction PIN authorized $3,200 demo transfer",
    time: "1m ago"
  },
  {
    id: "5",
    icon: UserCheck,
    color: "text-purple-400",
    bgColor: "bg-purple-500/15 border-purple-500/30",
    text: "New trader registered & unlocked $100,000 demo wallet",
    time: "2m ago"
  }
];

export function LiveActivityTicker() {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ACTIVITIES.length);
        setIsVisible(true);
      }, 300);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const current = ACTIVITIES[index];
  const Icon = current.icon;

  return (
    <div className="fixed bottom-5 left-5 z-30 hidden sm:block pointer-events-none">
      <div 
        className={`glass-strong border border-border/60 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3 transition-all duration-300 pointer-events-auto ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
        }`}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${current.bgColor} ${current.color} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <div className="font-semibold text-foreground truncate max-w-[280px]">
            {current.text}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Velocity • {current.time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
