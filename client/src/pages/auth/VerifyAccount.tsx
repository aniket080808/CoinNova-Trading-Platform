import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api, { authApi } from "../../lib/api";
import { toast } from "sonner";
import { Logo } from "../../components/glass/Logo";
import { GlassCard } from "../../components/glass/GlassCard";
import { AuroraBg } from "../../components/glass/AuroraBg";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, Mail, ArrowRight } from "lucide-react";

export default function VerifyAccount() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthStore();

  const email = location.state?.email || auth.user?.email || "";

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.verifyOtp(email, otp, "email_verification");
      // Verification successful, update user state
      if (auth.user) {
        auth.setUser({ ...auth.user, isVerified: true });
      }
      toast.success("Account verified successfully!");
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/resend-otp");
      toast.success("Verification code resent to your email.");
    } catch (err: any) {
      toast.error("Failed to resend code.");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
      <AuroraBg />
      <div className="absolute top-6 left-6"><Logo /></div>
      <GlassCard className="w-full max-w-md p-8 space-y-6 shadow-elevated animate-scale-in">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-display font-bold">Verify your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit verification code to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label>Verification code</Label>
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
            {loading ? "Verifying..." : "Verify account"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          <button onClick={handleResend} className="font-medium text-primary hover:underline">
            Resend Code
          </button>
        </div>

        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">Back to login</Link>
        </div>
      </GlassCard>
    </div>
  );
}
