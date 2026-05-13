import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api, { authApi } from "../../lib/api";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131316] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-400 mb-8">
            We've sent a 6-digit verification code to <br/>
            <span className="text-white font-medium">{email}</span>
          </p>

          <form onSubmit={handleVerify} className="space-y-6">
            <div>
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

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition-all"
            >
              {loading ? "Verifying..." : "Verify Account"}
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
