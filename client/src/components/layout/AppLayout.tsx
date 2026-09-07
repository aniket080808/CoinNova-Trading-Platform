import { Logo } from "@/components/glass/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/store/demo";
import {
  LayoutDashboard, LineChart, Wallet, Star, Bell, GraduationCap,
  Settings as SettingsIcon, ShieldCheck, Sparkles, ArrowLeftRight, History, LogOut, Menu, X,
  LogOut as LogOutIcon, BookOpen, PlaySquare, Brain,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isAuthenticated } from "@/lib/api";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { NotificationCenter } from "./NotificationCenter";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/market", label: "Market", icon: LineChart },
  { to: "/portfolio", label: "Portfolio", icon: Sparkles },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: History },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/replay", label: "Replay Mode", icon: PlaySquare },
  { to: "/journal", label: "Trade Journal", icon: BookOpen },
  { to: "/trading-dna", label: "Trading DNA", icon: Brain },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { mode, setMode, user, logout: storeLogout } = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [logoutConfig, setLogoutConfig] = useState({ title: "Sign Out", description: "Are you sure you want to sign out?" });
  const location = useLocation();

  const handleLogout = () => {
    storeLogout();
    localStorage.removeItem("coinnova-token");
    sessionStorage.clear();
    setShowLogoutDialog(false);
    window.location.replace("/login");
  };

  const initiateLogout = (title: string, description: string) => {
    setLogoutConfig({ title, description });
    setShowLogoutDialog(true);
  };

  const handleLogoClick = () => {
    if (user || isAuthenticated()) {
      initiateLogout("Sign Out Confirmation", "You are currently logged in. Would you like to sign out of your CoinNova session?");
    } else {
      navigate("/login");
    }
  };

  // Session guard: user must be authenticated or in explicit active demo
  const isAuth = isAuthenticated() || !!user;
  const isDemoActive = sessionStorage.getItem("coinnova_demo_active") === "true";

  useEffect(() => {
    if (!isAuth && !isDemoActive) {
      navigate("/login", { replace: true });
    }
  }, [isAuth, isDemoActive, navigate]);

  // Intercept the browser back button on /dashboard to prompt sign out
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      window.history.pushState({ coinnovaDashboardTrap: true }, "", window.location.href);

      const handlePopState = () => {
        // Re-push immediately to keep user on /dashboard and prevent unconfirmed navigation
        window.history.pushState({ coinnovaDashboardTrap: true }, "", window.location.href);

        initiateLogout(
          "Sign Out Confirmation",
          "You pressed the browser's back button. Would you like to securely sign out of your CoinNova session?"
        );
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [location.pathname]);

  if (!isAuth && !isDemoActive) return null;

  const isDemoUser = !user || user.email === "demo@coinnova.io";

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 z-40 glass-strong border-r border-border/50 flex-col transition-transform",
        open ? "flex translate-x-0" : "hidden lg:flex"
      )}>
        <div className="p-5 border-b border-border/40 flex items-center justify-between">
          <Logo onClick={handleLogoClick} />
          <button className="lg:hidden text-muted-foreground" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {nav.map((n) => {
            if (n.to === "/admin" && user?.role !== "admin") return null;

            const isRestricted = isDemoUser && ["/transfer", "/settings", "/alerts"].includes(n.to);

            if (isRestricted) {
              return (
                <button
                  key={n.to}
                  onClick={() => {
                    setOpen(false);
                    toast.error("Please create a personal account to use this feature");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-white/5 opacity-50 cursor-not-allowed"
                >
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </button>
              );
            }

            return (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/15 text-primary shadow-glow-primary/20 neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/40 space-y-3">
          <div className="glass rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-neon flex items-center justify-center text-background font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() ?? "G"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name ?? "Guest User"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email ?? "demo@coinnova.io"}</div>
            </div>
            <button onClick={() => initiateLogout("Sign Out", "Are you sure you want to sign out from your account?")} className="text-muted-foreground hover:text-destructive transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 glass-strong border-b border-border/40 px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-xl glass hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
              onClick={() => setOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              {(() => {
                const currentNav = nav.find((n) => location.pathname === n.to || (n.to !== "/dashboard" && location.pathname.startsWith(n.to)));
                const CurrentIcon = currentNav?.icon || LayoutDashboard;
                const currentLabel = currentNav?.label || (location.pathname.startsWith("/coin/") ? "Coin Details" : "Dashboard");
                return (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass border border-white/5 bg-background/30 shadow-sm">
                    <div className="w-5 h-5 rounded-md bg-primary/15 border border-primary/25 flex items-center justify-center text-primary">
                      <CurrentIcon className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider hidden sm:inline">
                      Platform
                    </span>
                    <span className="text-xs text-muted-foreground/30 hidden sm:inline">/</span>
                    <span className="text-xs font-bold text-foreground tracking-tight">
                      {currentLabel}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Badge variant="outline" className={cn(
              "border-primary/40 text-primary font-bold text-xs tracking-wider",
              mode === "demo" ? "border-amber-500/40 text-amber-400 shadow-glow-amber/20 bg-amber-500/10" : "border-emerald-500/40 text-emerald-400 shadow-glow-emerald/20 bg-emerald-500/10"
            )}>
              <span className={cn("w-2 h-2 rounded-full mr-1.5 animate-pulse", mode === "demo" ? "bg-amber-400" : "bg-emerald-400")} />
              {mode === "demo" ? "DEMO (PRACTICE)" : "LIVE TRADING"}
            </Badge>
          </div>
        </header>

        {mode === "live" && user && user.role !== "admin" && user.hasPin === false && location.pathname !== "/verify-pin-otp" && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 p-3 flex flex-col sm:flex-row items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Security Alert: You have not set up a Transaction PIN. Financial operations are disabled.</span>
            </div>
            <Link 
              to="/verify-pin-otp" 
              state={{ action: "setup" }}
              className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Set PIN Now
            </Link>
          </div>
        )}

        <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>

      {!isDemoUser && <ChatWidget />}

      <MobileBottomNav />
      <InstallPromptBanner />

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="glass-strong border border-white/10 p-6 rounded-2xl shadow-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center text-destructive shadow-glow-destructive/20">
              <LogOutIcon className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold font-display tracking-tight text-foreground">
              {logoutConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {logoutConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-4">
            <AlertDialogCancel className="rounded-xl font-semibold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-glow-destructive/30 font-semibold rounded-xl px-5 transition-all"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
