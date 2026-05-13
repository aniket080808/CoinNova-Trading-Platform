import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemo, formatUSD } from "@/store/demo";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePinDialog, PinDialog } from "@/components/PinDialog";

export default function Transfer() {
  const { walletUSD, transferOut, mode } = useDemo();
  const { open, requestPin, handleConfirm, handleClose } = usePinDialog();
  const [amt, setAmt] = useState("");
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const v = parseFloat(amt);
    if (!v) return toast.error("Enter amount");
    if (!dest) return toast.error("Destination required");

    let pin: string | undefined;
    if (mode === "live") {
      try {
        pin = await requestPin();
      } catch {
        return;
      }
    }

    setBusy(true);
    try {
      const success = await transferOut(v, dest, pin);
      if (success === false) throw new Error("Insufficient balance");
      toast.success(`Sent ${formatUSD(v)} to ${dest}`);
      setAmt(""); setDest("");
    } catch (err: any) {
      toast.error(err.message || "Transfer failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="text-3xl font-display font-bold">Wallet → Wallet transfer</h1>

      <GlassCard className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-neon flex items-center justify-center text-background"><ArrowLeftRight className="w-5 h-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">Available</div>
            <div className="text-xl font-bold">{formatUSD(walletUSD)}</div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Recipient (email or wallet ID)</Label>
          <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="alice@coinnova.io" />
        </div>
        <div className="space-y-2">
          <Label>Amount (USD)</Label>
          <Input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="100" />
        </div>
        <Button onClick={send} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Send
        </Button>
      </GlassCard>
      <PinDialog open={open} onClose={handleClose} onConfirm={handleConfirm} />
    </div>
  );
}
