import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "@/lib/api";
import { useDemo } from "@/store/demo";
import { toast } from "sonner";

export default function GoogleAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setMode, fetchMe, syncAll } = useDemo();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");
    const encodedUser = params.get("user");
    const parsedUser = encodedUser ? JSON.parse(decodeURIComponent(encodedUser)) : null;

    if (error) {
      toast.error("Google sign-in failed");
      navigate("/login", { replace: true });
      return;
    }

    if (!token) {
      toast.error("Google sign-in did not return a session");
      navigate("/login", { replace: true });
      return;
    }

    const needsVerification = params.get("needsVerification") === "true";

    setToken(token);
    setMode("live");
    const userToSet = parsedUser ?? {
      id: "google-user",
      name: "Google User",
      email: "google-user@example.com",
      role: "user",
      emailVerified: false,
    };
    setUser(userToSet);

    fetchMe()
      .then(() => syncAll())
      .catch(() => {
        // Ignored if session is active
      });

    if (needsVerification || !userToSet.emailVerified) {
      toast.info("A verification code was sent to your email.");
      navigate("/verify-account", {
        replace: true,
        state: {
          email: userToSet.email,
          allowSkip: true,
        },
      });
    } else {
      toast.success("Signed in with Google");
      navigate("/dashboard", { replace: true });
    }
  }, [fetchMe, navigate, params, setMode, setUser, syncAll]);

  return null;
}
