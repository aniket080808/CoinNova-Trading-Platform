import { useState, useCallback, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";

interface PinDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
  title?: string;
  description?: string;
}

export function PinDialog({ open, onClose, onConfirm, title, description }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (pin.length !== 6) {
      setError("PIN must be 6 digits");
      return;
    }
    setError("");
    onConfirm(pin);
    setPin("");
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="glass-strong border-border/50 max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {title || "Enter Transaction PIN"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description || "Enter your 6-digit transaction PIN to authorize this operation."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={pin.length !== 6} className="bg-gradient-neon text-background">
            Confirm
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function usePinDialog() {
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((pin: string) => void) | null>(null);
  const rejectRef = useRef<(() => void) | null>(null);

  const requestPin = useCallback((): Promise<string> => {
    return new Promise((res, rej) => {
      resolveRef.current = res;
      rejectRef.current = rej;
      setOpen(true);
    });
  }, []);

  const handleConfirm = useCallback((pin: string) => {
    if (resolveRef.current) {
      resolveRef.current(pin);
      resolveRef.current = null;
      rejectRef.current = null;
    }
    setOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    if (rejectRef.current) {
      rejectRef.current();
      resolveRef.current = null;
      rejectRef.current = null;
    }
    setOpen(false);
  }, []);

  return {
    open,
    requestPin,
    handleConfirm,
    handleClose,
  };
}
