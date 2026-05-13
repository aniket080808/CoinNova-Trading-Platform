import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { ShieldCheck, User as UserIcon, LogOut, Globe, Lock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { useNavigate, Link } from "react-router-dom";
import api, { userApi } from "@/lib/api";
import { Mail } from "lucide-react";

export default function Settings() {
  const { user, logout, fetchMe } = useAuthStore();
  const { currency: currentCurrency, setCurrency, updateRate } = useCurrencyStore();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  
  // Load from authStore user (synced from /auth/me)
  const [twofa, setTwofa] = useState(user?.twoFactorEnabled ?? false);
  const [updating, setUpdating] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return toast.error("Name cannot be empty");
    setUpdating(true);
    try {
      // Endpoint to update profile
      await userApi.updateSettings({ name: name.trim() });
      await fetchMe(); // Sync global auth state
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const toggle2FA = async (checked: boolean) => {
    try {
      await userApi.updateSettings({ twoFactorEnabled: checked });
      setTwofa(checked);
      toast.success(`2FA has been ${checked ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle 2FA");
    }
  };

  const updateCurrency = async (curr: "USD" | "INR") => {
    try {
      await userApi.updateSettings({ currencyPreference: curr });
      setCurrency(curr);
      await updateRate();
      toast.success(`Currency preference updated to ${curr}`);
    } catch (err: any) {
      toast.error("Failed to update currency");
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-1" /> Logout
        </Button>
      </div>

      {/* Account Settings */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" /> 
            <h3 className="font-semibold text-lg">Account</h3>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="glass" 
            onClick={() => {
              if (isEditing) setName(user?.name ?? ""); // Reset if cancelling
              setIsEditing(!isEditing);
            }}
          >
            {isEditing ? "Cancel" : "Edit Details"}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your full name"
              disabled={!isEditing}
              className={`glass transition-all ${isEditing ? "focus:ring-primary/50 border-primary/40" : "opacity-70"}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input 
              value={email} 
              disabled 
              className="opacity-50 cursor-not-allowed glass" 
            />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email cannot be changed directly for security reasons.</p>
        
        {isEditing && (
          <Button 
            onClick={handleSaveProfile} 
            disabled={updating} 
            className="w-full sm:w-auto bg-gradient-neon text-background shadow-glow-primary px-8 animate-in fade-in slide-in-from-top-2"
          >
            {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Profile
          </Button>
        )}
      </GlassCard>

      {/* Security */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> 
          <h3 className="font-semibold text-lg">Security</h3>
        </div>
        
        <Row 
          label="Two-factor authentication" 
          sub={user?.role === "admin" ? "Managed by system policy" : "Add an extra layer of security to your account"}
          v={user?.role === "admin" ? false : twofa} 
          onChange={user?.role === "admin" ? () => {} : toggle2FA}
          disabled={user?.role === "admin"}
        />
        
        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Account Email</div>
              <div className="text-xs text-muted-foreground">
                {user?.role === "admin" ? "Admin email is managed by system config" : "Verified email for notifications and security"}
              </div>
            </div>
            {user?.role !== "admin" && (
              <EmailChangeDialog />
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Account Password</div>
              <div className="text-xs text-muted-foreground">
                {user?.role === "admin" ? "Admin password is fixed in system config" : "Change your login password"}
              </div>
            </div>
            {user?.role !== "admin" && (
              <Button variant="outline" size="sm" onClick={() => navigate("/forgot-password")}>
                Change Password
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Financial Security */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-primary" /> 
          <h3 className="font-semibold text-lg">Financial Security</h3>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-medium ${user?.hasPin ? "text-green-400" : "text-red-400"}`}>
              Transaction PIN
            </div>
            <div className="text-xs text-muted-foreground">
              {user?.role === "admin" ? "Static PIN configured for admin account" : "Required for all withdrawals and transfers"}
            </div>
          </div>
          {user?.role !== "admin" && (
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/verify-pin-otp", { state: { action: "setup" } })}>
                Set PIN
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/verify-pin-otp", { state: { action: "reset" } })}>
                Reset PIN
              </Button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Preferences */}
      <GlassCard className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" /> 
          <h3 className="font-semibold text-lg">Preferences</h3>
        </div>
        
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Display Currency</div>
            <div className="text-xs text-muted-foreground">Choose your preferred fiat currency</div>
          </div>
          <div className="flex gap-1 glass rounded-full p-1 text-xs">
            {["USD", "INR"].map((c) => (
              <button 
                key={c} 
                onClick={() => updateCurrency(c as "USD" | "INR")} 
                className={`px-3 py-1 rounded-full ${currentCurrency === c ? "bg-primary text-background" : "text-muted-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

    </div>
  );
}

const Row = ({ label, sub, v, onChange, icon, disabled }: any) => (
  <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
    <Switch checked={v} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const EmailChangeDialog = () => {
  const { fetchMe } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: New Email, 2: OTP
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    if (!newEmail || !newEmail.includes("@")) return toast.error("Enter a valid new email");
    setBusy(true);
    try {
      await userApi.requestEmailChangeOtp();
      setStep(2);
      toast.success("OTP sent to your current email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verifyAndChange = async () => {
    if (otp.length !== 6) return toast.error("Enter 6-digit OTP");
    setBusy(true);
    try {
      await userApi.verifyEmailChange(newEmail, otp);
      await fetchMe();
      toast.success("Email changed successfully");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep(1); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Change Email</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Enter your new email address. We will send an OTP to your current email to authorize this change."
              : `Enter the 6-digit code sent to your current email to verify the change to ${newEmail}.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step === 1 ? (
            <div className="space-y-2">
              <Label>New Email Address</Label>
              <Input 
                placeholder="new.email@example.com" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                className="glass"
              />
              <Button onClick={requestOtp} disabled={busy} className="w-full bg-primary text-background">
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send OTP
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <Input 
                placeholder="123456" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                maxLength={6}
                className="glass text-center text-xl tracking-widest"
              />
              <Button onClick={verifyAndChange} disabled={busy} className="w-full bg-gradient-neon text-background">
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Change
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
