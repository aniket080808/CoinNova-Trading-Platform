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
import { ChatWidget } from "@/components/ai/ChatWidget";
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
    navigate("/login", { replace: true, state: { signedOut: true } });
    setShowLogoutDialog(false);
  };

  const initiateLogout = (title: string, description: string) => {
    setLogoutConfig({ title, description });
    setShowLogoutDialog(true);
  };

  const handleLogoClick = () => {
    if (user) {
      initiateLogout("Return to Home", "You are currently logged in. Would you like to sign out before returning to the landing page?");
    } else {
      navigate("/");
    }
  };

  // Redirect if live and no user (Security Guard)
  useEffect(() => {
    const checkAuth = () => {
      if (mode === "live" && !user) {
        navigate("/login", { replace: true });
      }
    };

    checkAuth();

    // Listen for BFCache (back button) access
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && mode === "live" && !user) {
        window.location.reload();
      }
    };

    // Back button confirmation
    const handlePopState = (e: PopStateEvent) => {
      if (user && !window.location.pathname.includes("/dashboard") && !window.location.pathname.includes("/auth")) {
        initiateLogout("Leave Secure Area", "You are about to leave the secure trading area. Would you like to sign out?");
        // Push state back so the user stays on the page while the dialog is open
        window.history.pushState(null, "", location.pathname);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [mode, user, navigate, location.pathname]);

  if (mode === "live" && !user) return null;

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
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="w-5 h-5" /></button>
            <div className="text-sm text-muted-foreground hidden sm:block">
              {nav.find((n) => location.pathname.startsWith(n.to))?.label ?? "Dashboard"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(
              "border-primary/40 text-primary",
              mode === "demo" ? "border-amber-500/40 text-amber-500 shadow-glow-amber/20" : "border-emerald-500/40 text-emerald-500 shadow-glow-emerald/20"
            )}>
              {mode === "demo" ? "DEMO MODE (Practice)" : "LIVE TRADING"}
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

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOutIcon className="w-5 h-5 text-destructive" />
              {logoutConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {logoutConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-border/50 hover:bg-white/10 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-glow-destructive/20 transition-all"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
