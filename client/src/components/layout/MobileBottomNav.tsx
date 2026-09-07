import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, LineChart, Sparkles, Brain, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/portfolio", label: "Portfolio", icon: Sparkles },
  { to: "/trading-dna", label: "DNA", icon: Brain },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass-strong border-t border-border/40 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="flex items-center justify-around h-16">
          {mobileNav.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-0.5 py-1 px-3 relative group"
              >
                {/* Glow indicator */}
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary shadow-glow-primary/50" />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive
                      ? "text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
