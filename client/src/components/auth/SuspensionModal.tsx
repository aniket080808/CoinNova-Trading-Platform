import React, { useState, useEffect } from "react";
import { ShieldAlert, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function SuspensionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handleAccountBlocked = (event: CustomEvent<{ reason?: string; error?: string }>) => {
      const blockReason = event.detail?.reason || "Administrative policy enforcement";
      setReason(blockReason);
      setIsOpen(true);
      
      // Invalidate session immediately
      clearToken();
      logout();
    };

    window.addEventListener("coinnova:account_blocked" as any, handleAccountBlocked as EventListener);
    return () => {
      window.removeEventListener("coinnova:account_blocked" as any, handleAccountBlocked as EventListener);
    };
  }, [logout]);

  const handleAcknowledge = () => {
    setIsOpen(false);
    clearToken();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/40 bg-zinc-950/95 p-6 sm:p-8 shadow-2xl shadow-red-950/50 text-foreground overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-5">
          {/* Header icon and title */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
              <ShieldAlert className="w-8 h-8 animate-pulse text-red-500" />
            </div>
            <h2 className="text-2xl font-display font-bold tracking-tight text-white pt-1">
              Account Suspended
            </h2>
            <p className="text-xs text-zinc-400 max-w-xs">
              Your CoinNova account has been suspended by the platform administrator.
            </p>
          </div>

          {/* Reason card */}
          <div className="rounded-xl border border-red-500/25 bg-red-950/20 p-4 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Official Suspension Reason
            </div>
            <p className="text-sm font-medium text-zinc-200 italic leading-relaxed break-words">
              "{reason}"
            </p>
          </div>

          {/* Impact list */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Active session invalidated &amp; terminated
            </div>
            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Trading, open orders &amp; withdrawals frozen
            </div>
            <p className="text-[11px] text-zinc-500 pt-1">
              Your existing balances and transaction ledger remain safely preserved on our secure database.
            </p>
          </div>

          {/* Appeal info */}
          <div className="text-xs text-zinc-400 space-y-1 bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/40">
            <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Appeal or Compliance Support
            </div>
            <p className="text-[11px] leading-relaxed">
              If you believe this action was taken in error, contact our compliance team at{" "}
              <a
                href="mailto:support@coinnova.io?subject=Account%20Suspension%20Appeal"
                className="text-primary hover:underline font-semibold"
              >
                support@coinnova.io
              </a>
              .
            </p>
          </div>

          {/* Action button */}
          <Button
            onClick={handleAcknowledge}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Acknowledge &amp; Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
