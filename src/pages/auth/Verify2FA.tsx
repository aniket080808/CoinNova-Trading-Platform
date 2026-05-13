import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api, { authApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

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
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131316] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Two-Factor Authentication</h1>
          <p className="text-gray-400 mb-8">
            Enter the 2FA code sent to your email to continue.
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
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
