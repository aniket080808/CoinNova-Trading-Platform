import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useDemo } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { isAuthenticated } from "@/lib/api";
import Landing from "./pages/Landing";
import { Login, Register, Forgot, Reset } from "./pages/Auth";
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
import VerifyAccount from "./pages/auth/VerifyAccount";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyPinOtp from "./pages/auth/VerifyPinOtp";
import Verify2FA from "./pages/auth/Verify2FA";
import NotFound from "./pages/NotFound.tsx";
import { AppLayout } from "./components/layout/AppLayout";
import { AuroraBg } from "./components/glass/AuroraBg";
import { connectPrices } from "@/lib/binance";

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
    
    // Connect to real-time prices for top coins
    const stop = connectPrices(["btc", "eth", "sol", "bnb", "doge", "xrp", "ada", "matic", "dot", "trx"]);
    return stop;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync currency preference when user is loaded
  useEffect(() => {
    if (user?.currencyPreference) {
      setCurrency(user.currencyPreference as "USD" | "INR");
    }
  }, [user?.currencyPreference, setCurrency]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner theme="dark" toastOptions={{ classNames: { toast: "glass-strong border-border/50" } }} />
      <AuroraBg />
      <BrowserRouter>
        <AuthInitializer />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/verify-2fa" element={<Verify2FA />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-pin-otp" element={<AppLayout><VerifyPinOtp /></AppLayout>} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/market" element={<AppLayout><Market /></AppLayout>} />
          <Route path="/coin/:id" element={<AppLayout><CoinDetail /></AppLayout>} />
          <Route path="/portfolio" element={<AppLayout><Portfolio /></AppLayout>} />
          <Route path="/wallet" element={<AppLayout><Wallet /></AppLayout>} />
          <Route path="/transactions" element={<AppLayout><Transactions /></AppLayout>} />
          <Route path="/transfer" element={<AppLayout><Transfer /></AppLayout>} />
          <Route path="/watchlist" element={<AppLayout><Watchlist /></AppLayout>} />
          <Route path="/alerts" element={<AppLayout><Alerts /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
