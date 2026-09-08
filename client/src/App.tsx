import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useDemo } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { isAuthenticated } from "@/lib/api";
import Landing from "./pages/Landing";
import { Login, Register, Forgot, Reset } from "./pages/Auth";
import GoogleAuthCallback from "./pages/auth/GoogleAuthCallback";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Market from "./pages/Market";
import CoinDetail from "./pages/CoinDetail";
import Portfolio from "./pages/Portfolio";
import Wallet from "./pages/Wallet";
import Transactions from "./pages/Transactions";
import Transfer from "./pages/Transfer";
import Watchlist from "./pages/Watchlist";
import Alerts from "./pages/Alerts";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Replay from "./pages/Replay";
import Journal from "./pages/Journal";
import TradingDNA from "./pages/TradingDNA";
import VerifyAccount from "./pages/auth/VerifyAccount";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyPinOtp from "./pages/auth/VerifyPinOtp";
import Verify2FA from "./pages/auth/Verify2FA";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/layout/AppLayout";
import { AuroraBg } from "./components/glass/AuroraBg";
import { connectPrices } from "@/lib/binance";
import { SuspensionModal } from "./components/auth/SuspensionModal";

const queryClient = new QueryClient();

/** Restores auth state on app load if a JWT exists in localStorage */
function AuthInitializer() {
  const { fetchMe, syncAll, resetDemo, user } = useDemo();
  const { updateRate, setCurrency } = useCurrencyStore();

  useEffect(() => {
    // Reset client-side demo mode every time the website is opened/refreshed
    resetDemo();
    
    // Initial rate fetch
    updateRate();

    if (isAuthenticated()) {
      fetchMe().then(() => syncAll()).catch(() => {});
    }

    // Active session block monitoring heartbeat (every 8 seconds)
    const heartbeat = setInterval(() => {
      if (isAuthenticated()) {
        fetchMe().catch(() => {});
      }
    }, 8000);
    
    // Connect to real-time prices for top coins
    const stop = connectPrices(["btc", "eth", "sol", "bnb", "doge", "xrp", "ada", "matic", "dot", "trx"]);

    // Guard against BFCache restoring old authenticated DOM when navigating via forward/back
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !isAuthenticated() && sessionStorage.getItem("coinnova_demo_active") !== "true") {
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.replace("/login");
        }
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      stop();
      clearInterval(heartbeat);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync currency preference when user is loaded
  useEffect(() => {
    if (user?.currencyPreference) {
      setCurrency(user.currencyPreference as "USD" | "INR");
    }
  }, [user?.currencyPreference, setCurrency]);

  return null;
}

/** HomeRoute automatically redirects authenticated users directly to /dashboard */
function HomeRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}

/** GuestRoute prevents authenticated users from landing back on login/register */
function GuestRoute({ children }: { children: React.ReactNode }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/** ProtectedRoute prevents unauthenticated users from accessing trading terminal */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = isAuthenticated();
  const isDemo = sessionStorage.getItem("coinnova_demo_active") === "true";
  if (!isAuth && !isDemo) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" toastOptions={{ classNames: { toast: "glass-strong border-border/50" } }} />
      <SuspensionModal />
      <AuroraBg />
      <BrowserRouter>
        <AuthInitializer />
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/auth/google/success" element={<GoogleAuthCallback />} />
          <Route path="/verify-2fa" element={<Verify2FA />} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
          <Route path="/verify-pin-otp" element={<ProtectedRoute><AppLayout><VerifyPinOtp /></AppLayout></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/market" element={<ProtectedRoute><AppLayout><Market /></AppLayout></ProtectedRoute>} />
          <Route path="/coin/:id" element={<ProtectedRoute><AppLayout><CoinDetail /></AppLayout></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><AppLayout><Portfolio /></AppLayout></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><AppLayout><Wallet /></AppLayout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><AppLayout><Transactions /></AppLayout></ProtectedRoute>} />
          <Route path="/transfer" element={<ProtectedRoute><AppLayout><Transfer /></AppLayout></ProtectedRoute>} />
          <Route path="/watchlist" element={<ProtectedRoute><AppLayout><Watchlist /></AppLayout></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AppLayout><Alerts /></AppLayout></ProtectedRoute>} />
          <Route path="/replay" element={<ProtectedRoute><AppLayout><Replay /></AppLayout></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><AppLayout><Journal /></AppLayout></ProtectedRoute>} />
          <Route path="/trading-dna" element={<ProtectedRoute><AppLayout><TradingDNA /></AppLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
