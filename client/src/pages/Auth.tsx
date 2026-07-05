import { Logo } from "@/components/glass/Logo";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBg } from "@/components/glass/AuroraBg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ReactNode, useState, useEffect } from "react";
import { useDemo } from "@/store/demo";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Shield, ArrowRight, KeyRound, Loader2, BadgeCheck } from "lucide-react";
import { authApi, getGoogleAuthUrl, setToken } from "@/lib/api";

const Shell = ({ title, sub, children, foot }: { title: string; sub: string; children: ReactNode; foot?: ReactNode }) => (
  <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
    <AuroraBg />
    <div className="absolute top-6 left-6"><Logo /></div>
    <GlassCard className="w-full max-w-md p-8 space-y-6 shadow-elevated animate-scale-in">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
      {children}
      {foot && <div className="text-center text-sm text-muted-foreground">{foot}</div>}
    </GlassCard>
  </div>
);

export const Login = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useDemo();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if ((location.state as any)?.signedOut) {
      toast.success("Signed out successfully");
      // Clear the state so it doesn't show again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const submit = async () => {
    if (!email || !pw) return toast.error("Enter email and password");
    setBusy(true);
    try {
      const res = await login(email, pw);
      if (res?.status === "2FA_REQUIRED") {
        toast.info("2FA code sent to your email");
        navigate("/verify-2fa", { state: { email } });
        return;
      }
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Welcome back"
      sub="Login to your CoinNova account"
      foot={<>Don't have an account? <Link to="/register" className="text-primary hover:underline">Create one</Link></>}
    >
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = getGoogleAuthUrl();
          }}
          className="w-full min-h-11 border-primary/20 bg-background/80 text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/30"
        >
          <BadgeCheck className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@email.com" onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={pw} onChange={(e) => setPw(e.target.value)} className="pl-9 pr-9" type={show ? "text" : "password"} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && submit()} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Sign in <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Shell>
  );
};

export const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const { register: registerUser } = useDemo();
  const navigate = useNavigate();

  const submit = async () => {
    if (!name || !email || pw.length < 6) return toast.error("Fill all fields (password 6+ chars)");
    setBusy(true);
    try {
      await registerUser(name, email, pw);
      toast.success("Account created! Check your email for verification code.");
      navigate("/verify-account", { state: { email } });
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Create your account" sub="Start your crypto journey with CoinNova" foot={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}>
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            window.location.href = getGoogleAuthUrl();
          }}
          className="w-full min-h-11 border-primary/20 bg-background/80 text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/30"
        >
          <BadgeCheck className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <Label>Full name</Label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-9" placeholder="Jane Crypto" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@email.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={pw} onChange={(e) => setPw(e.target.value)} className="pl-9" type="password" placeholder="6+ characters" />
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Create account <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Shell>
  );
};

export const Forgot = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email) return toast.error("Email required");
    setBusy(true);
    try {
      await authApi.forgot(email);
      setSent(true);
    } catch (err: any) {
      toast.error(err.message || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Reset password" sub="We'll email you a recovery code" foot={<><Link to="/login" className="text-primary hover:underline">Back to login</Link></>}>
      {sent ? (
        <div className="text-center space-y-2 py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center"><Mail className="w-7 h-7 text-primary" /></div>
          <p className="text-sm">If <b>{email}</b> exists, a reset code is on the way.</p>
          <Link to="/reset-password" className="text-primary hover:underline text-sm">Enter reset code →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@email.com" />
            </div>
          </div>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Send reset code
          </Button>
        </div>
      )}
    </Shell>
  );
};

export const Reset = () => {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!email || code.length !== 6) return toast.error("Enter email and 6-digit code");
    if (pw.length < 6) return toast.error("Password must be 6+ characters");
    setBusy(true);
    try {
      await authApi.reset(email, code, pw);
      toast.success("Password updated!");
      navigate("/login");
    } catch (err: any) {
      toast.error(err.message || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="New password" sub="Enter the code from your email">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@email.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>6-digit code</Label>
          <div className="relative">
            <Shield className="w-4 h-4 absolute left-3 top-3 text-primary" />
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="pl-9 tracking-[0.5em] text-center font-mono" maxLength={6} placeholder="000000" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>New password</Label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={pw} onChange={(e) => setPw(e.target.value)} className="pl-9" type="password" placeholder="6+ characters" />
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Update password
        </Button>
      </div>
    </Shell>
  );
};
