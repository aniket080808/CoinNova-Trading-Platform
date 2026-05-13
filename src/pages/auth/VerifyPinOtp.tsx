import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { userApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { toast } from "sonner";

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
        toast.success("OTP sent to your email!");
      } catch (err) {
        toast.error("Failed to send OTP. Use 'Resend Code' to try again.");
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
      toast.success("OTP Resent to your email!");
    } catch (err) {
      toast.error("Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131316] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Secure Your Transactions</h1>
          <p className="text-gray-400 mb-8">
            {otpSending
              ? "Sending OTP to your email..."
              : `Enter the OTP sent to ${email} and your new 6-digit PIN.`}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 text-left">Email OTP</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 text-left">New 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="******"
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6 || pin.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-all"
            >
              {loading ? "Processing..." : "Set Transaction PIN"}
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-400">
            Didn't receive the code?{" "}
            <button onClick={handleResend} className="text-blue-500 hover:text-blue-400 transition-colors font-medium">
              Resend Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
