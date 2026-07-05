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
    let parsedUser: any = null;

    if (encodedUser) {
      try {
        parsedUser = JSON.parse(decodeURIComponent(encodedUser));
      } catch {
        parsedUser = null;
      }
    }

    if (error) {
      toast.error(`Google sign-in failed: ${error}`);
      navigate("/login", { replace: true });
      return;
    }

    if (!token) {
      toast.error("Google sign-in did not return a session");
      navigate("/login", { replace: true });
      return;
    }

    const fallbackUser = parsedUser ?? {
      id: "google-user",
      name: "Google User",
      email: "google-user@example.com",
      role: "user" as const,
      emailVerified: true,
    };

    setToken(token);
    setMode("live");
    setUser(fallbackUser);

    const finishLogin = async () => {
      try {
        await fetchMe();
      } catch {
        // ignore and continue
      }

      try {
        await syncAll();
      } catch {
        // ignore and continue
      }

      toast.success("Signed in with Google");
      navigate("/dashboard", { replace: true });
    };

    void finishLogin();
  }, [fetchMe, navigate, params, setMode, setUser, syncAll]);

  return null;
}
