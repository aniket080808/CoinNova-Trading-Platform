import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  User,
  Globe,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { kycApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KycVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Japan", "Singapore", "Brazil",
  "South Korea", "United Arab Emirates", "Netherlands", "Switzerland", "Other",
];

const DOC_TYPES = [
  { value: "pan", label: "PAN Card", icon: "🪪" },
  { value: "passport", label: "Passport", icon: "🛂" },
  { value: "national_id", label: "National ID / Aadhaar", icon: "🆔" },
  { value: "driving_license", label: "Driving License", icon: "🚗" },
];

export function KycVerificationModal({ open, onOpenChange }: KycVerificationModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  // Load current KYC status
  useEffect(() => {
    if (open) {
      kycApi.status().then((data) => {
        setKycStatus(data.status);
        if (data.details.fullName) setFullName(data.details.fullName);
        if (data.details.dob) setDob(data.details.dob);
        if (data.details.country) setCountry(data.details.country);
        if (data.details.documentType) setDocumentType(data.details.documentType);
      }).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !dob || !country || !documentType || !documentNumber.trim()) {
      return toast.error("Please fill in all fields");
    }

    setLoading(true);
    try {
      await kycApi.submit({
        fullName: fullName.trim(),
        dob,
        country,
        documentType,
        documentNumber: documentNumber.trim(),
      });
      toast.success("KYC submitted! We'll notify you once verified.");
      setKycStatus("pending");
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit KYC");
    } finally {
      setLoading(false);
    }
  };

  // If already pending or verified, show status page
  const showStatusOnly = kycStatus === "pending" || kycStatus === "verified";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Identity Verification (KYC)
          </DialogTitle>
          <DialogDescription>
            Verify your identity to unlock unlimited trading and withdrawals.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {!showStatusOnly && (
          <div className="flex items-center gap-2 py-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    step >= s
                      ? "bg-primary text-background shadow-glow-primary/30"
                      : "glass text-muted-foreground"
                  )}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 rounded-full transition-all",
                      step > s ? "bg-primary" : "bg-border/40"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="py-2">
          {/* Already verified */}
          {kycStatus === "verified" && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">Identity Verified</div>
                <div className="text-sm text-muted-foreground mt-1">
                  You are Tier 2 with unlimited withdrawal access.
                </div>
              </div>
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily Withdrawal Limit</span>
                  <span className="font-semibold text-emerald-400">Unlimited</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trading Access</span>
                  <span className="font-semibold text-emerald-400">Full Access</span>
                </div>
              </div>
            </div>
          )}

          {/* Pending review */}
          {kycStatus === "pending" && step !== 3 && (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/15 flex items-center justify-center animate-pulse">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-amber-400">Under Review</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your identity verification is being reviewed. We'll notify you once processed.
                </div>
              </div>
            </div>
          )}

          {/* Rejected — allow resubmission */}
          {kycStatus === "rejected" && step === 1 && (
            <div className="glass rounded-xl p-3 border border-red-500/30 bg-red-500/5 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-300">
                Your previous submission was rejected. Please update your details and try again.
              </div>
            </div>
          )}

          {/* Step 1: Personal Info */}
          {(!showStatusOnly) && step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Personal Information</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Legal Name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="As shown on your ID"
                    className="glass"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="glass"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Country of Residence</Label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-border/40 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (!fullName.trim()) return toast.error("Please enter your full name");
                  if (!dob) return toast.error("Please enter your date of birth");
                  if (!country) return toast.error("Please select your country");
                  setStep(2);
                }}
                className="w-full bg-gradient-neon text-background shadow-glow-primary"
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Document Info */}
          {(!showStatusOnly) && step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Document Verification</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDocumentType(d.value)}
                    className={cn(
                      "glass rounded-xl p-3 text-left transition-all border",
                      documentType === d.value
                        ? "border-primary/60 bg-primary/10 shadow-glow-primary/10"
                        : "border-transparent hover:border-border/40"
                    )}
                  >
                    <div className="text-lg mb-1">{d.icon}</div>
                    <div className="text-xs font-medium">{d.label}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Document Number</Label>
                <Input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Enter your document number"
                  className="glass"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 glass" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !documentType || !documentNumber.trim()}
                  className="flex-1 bg-gradient-neon text-background shadow-glow-primary"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <FileCheck className="w-4 h-4 mr-1" />
                  )}
                  Submit for Verification
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold">Submitted Successfully!</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Your identity verification is now under review. We'll notify you once it's processed.
                </div>
              </div>
              <div className="glass rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What happens next?</h4>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Admin reviews your submission (usually within 24 hours)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>You'll receive a notification once approved</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Tier 2 unlocks unlimited withdrawals</span>
                </div>
              </div>
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-gradient-neon text-background shadow-glow-primary"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
