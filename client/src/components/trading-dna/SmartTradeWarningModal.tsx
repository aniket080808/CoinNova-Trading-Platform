import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export interface GuardianWarning {
  passed: boolean;
  riskScore: number;
  warnings?: string[] | null;
}

interface SmartTradeWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warning: GuardianWarning | null;
  onProceed: () => void;
}

export function SmartTradeWarningModal({ open, onOpenChange, warning, onProceed }: SmartTradeWarningModalProps) {
  if (!warning) return null;

  const { passed, riskScore, warnings } = warning;
  const normalizedWarnings = Array.isArray(warnings) ? warnings : [];
  
  // If no warnings and low risk, don't show the modal as highly dangerous
  const isDanger = riskScore > 60;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={`glass-strong border ${isDanger ? 'border-destructive/50' : 'border-warning/50'}`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDanger ? (
              <ShieldAlert className="w-5 h-5 text-destructive" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning" />
            )}
            Smart Trade Guardian
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2 text-left">
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <p className="text-sm font-semibold mb-1">
                  Deterministic Risk Score: <span className={isDanger ? "text-destructive" : "text-warning"}>{riskScore}/100</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Our backend engine compared this trade setup against your historical losses.
                </p>
              </div>
              
              {normalizedWarnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Warning Triggers:</p>
                  <ul className="space-y-2">
                    {normalizedWarnings.map((w, i) => (
                      <motion.li 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.1 }}
                        className="text-sm flex items-start gap-2 bg-destructive/10 text-destructive p-2 rounded-md"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 hover:bg-white/10 border-border/50">Cancel Trade</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onProceed}
            className={`${isDanger ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : 'bg-warning hover:bg-warning/90 text-warning-foreground'}`}
          >
            I understand, Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
