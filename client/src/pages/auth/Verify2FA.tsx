import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Logo } from "../../components/glass/Logo";
import { GlassCard } from "../../components/glass/GlassCard";
import { AuroraBg } from "../../components/glass/AuroraBg";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";

export default function Verify2FA() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthStore();

  const email = location.state?.email || "";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res: any = await authApi.verifyOtp(email, otp, "two_factor");
      
      // If 2FA verified successfully, the backend returns the final token and user.
      if (res && res.token && res.user) {
        localStorage.setItem("coinnova-token", res.token);
        auth.setUser(res.user);
        auth.setMode("live");
        await auth.syncAll();
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid 2FA code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
      <AuroraBg />
      <div className="absolute top-6 left-6"><Logo /></div>
      <GlassCard className="w-full max-w-md p-8 space-y-6 shadow-elevated animate-scale-in">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-display font-bold">Two-factor authentication</h1>
          <p className="text-sm text-muted-foreground">Enter the 2FA code sent to your email to continue.</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication code</Label>
            <Input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="text-center text-lg tracking-[0.35em]"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={loading || otp.length < 6} className="w-full bg-gradient-neon text-background shadow-glow-primary">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            {loading ? "Verifying..." : "Verify & login"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
