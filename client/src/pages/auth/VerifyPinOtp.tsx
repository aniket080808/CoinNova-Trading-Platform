import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { userApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { toast } from "sonner";
import { Logo } from "../../components/glass/Logo";
import { GlassCard } from "../../components/glass/GlassCard";
import { AuroraBg } from "../../components/glass/AuroraBg";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Loader2, ShieldCheck, Mail, LockKeyhole, ArrowRight } from "lucide-react";

export default function VerifyPinOtp() {
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthStore();
  const hasSentOtp = useRef(false);

  const action = location.state?.action || "setup"; // 'setup' or 'reset'
  const email = auth.user?.email || "";

  // Automatically send OTP when page loads
  useEffect(() => {
    if (hasSentOtp.current) return;
    hasSentOtp.current = true;

    const sendInitialOtp = async () => {
      setOtpSending(true);
      try {
        await userApi.requestPinOtp(action as any);
        toast.success("OTP sent to your email");
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to send OTP. Use 'Resend Code' to try again.");
      } finally {
        setOtpSending(false);
      }
    };

    sendInitialOtp();
  }, [action]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (action === "setup") {
        await userApi.setPin(pin, otp);
      } else {
        await userApi.forgotPin(pin, otp);
      }
      await auth.fetchMe();
      toast.success("Transaction PIN updated successfully");
      navigate("/settings");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP or PIN format.");
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await userApi.requestPinOtp(action as any);
      toast.success("OTP resent to your email");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to resend OTP");
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
          <h1 className="text-3xl font-display font-bold">Secure your transactions</h1>
          <p className="text-sm text-muted-foreground">
            {otpSending
              ? "Sending OTP to your email..."
              : `Enter the OTP sent to ${email} and your new 6-digit PIN.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email OTP</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="pl-9 text-center text-lg tracking-[0.35em]"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>New 6-Digit PIN</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="******"
                className="pl-9 text-center text-lg tracking-[0.35em]"
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={loading || otp.length < 6 || pin.length < 6} className="w-full bg-gradient-neon text-background shadow-glow-primary">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            {loading ? "Processing..." : "Set transaction PIN"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          <button onClick={handleResend} className="font-medium text-primary hover:underline">
            Resend Code
          </button>
        </div>

        <div className="text-center">
          <Link to="/settings" className="text-sm text-muted-foreground hover:text-primary">Back to settings</Link>
        </div>
      </GlassCard>
    </div>
  );
}
