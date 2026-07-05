import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemo, formatUSD } from "@/store/demo";
import { toast } from "sonner";
import { ReactNode } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import type { Coin } from "@/lib/coingecko";
import { usePinDialog, PinDialog } from "@/components/PinDialog";
import { useCurrencyStore } from "@/store/currencyStore";
import { usePrices } from "@/lib/binance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTradeWarningModal, GuardianWarning } from "../trading-dna/SmartTradeWarningModal";
import { behaviorApi } from "@/lib/api";
// ─── Trade Reason options ─────────────────────────────────
const TRADE_REASONS = [
  { value: "", label: "Select reason (optional)" },
  { value: "technical_analysis", label: "📊 Technical Analysis" },
  { value: "fundamental", label: "📰 Fundamental / News" },
  { value: "fomo", label: "😱 FOMO" },
  { value: "long_term", label: "🌱 Long-term Investment" },
  { value: "profit_booking", label: "💰 Profit Booking" },
  { value: "other", label: "🎯 Other" },
];

export const TradeDialog = ({ coin, trigger, defaultTab = "buy" }: { coin: Coin; trigger: ReactNode; defaultTab?: "buy" | "sell" }) => {
  const { walletUSD, holdings, buy, sell, mode, currency, convert, format } = useDemo();
  const { open: pinOpen, requestPin, handleConfirm, handleClose } = usePinDialog();
  const { prices: livePrices } = usePrices();
  const holding = holdings.find((h) => h.coinId === coin.id);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(""); // Amount in current currency
  const [sellAmount, setSellAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [confidence, setConfidence] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [guardianWarning, setGuardianWarning] = useState<GuardianWarning | null>(null);
  const [pendingTrade, setPendingTrade] = useState<(() => Promise<void>) | null>(null);

  const livePrice = livePrices[coin.symbol.toLowerCase()];
  const currentPrice = livePrice ?? coin.current_price;

  const { rate } = useCurrencyStore.getState();

  const executeBuy = async (amountInUsd: number, pin: string | undefined) => {
    setBusy(true);
    try {
      await buy(
        { id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image },
        amountInUsd,
        currentPrice,
        pin,
        reason === "none" ? undefined : (reason || undefined),
        confidence,
      );
      toast.success(`Bought ${format(amountInUsd)} of ${coin.symbol.toUpperCase()}`);
      setAmount(""); setReason(""); setConfidence(50); setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Buy failed");
    } finally { setBusy(false); }
  };

  const onBuy = async () => {
    let v = parseFloat(amount);
    if (!v || v <= 0) return toast.error("Enter amount");

    const amountInUsd = currency === "INR" ? v / rate : v;
    if (amountInUsd > walletUSD) return toast.error(`Insufficient balance (need ${format(amountInUsd)})`);

    let pin: string | undefined;
    if (mode === "live") {
      try {
        pin = await requestPin();
      } catch {
        return;
      }
    }

    // Guardian Check
    if (mode === "live") {
      try {
        setBusy(true);
        const warning = await behaviorApi.guardian({
          type: "buy",
          coinId: coin.id,
          amount: amountInUsd,
          price: currentPrice,
          confidence,
        });
        setBusy(false);
        
        if (!warning.passed) {
          setGuardianWarning(warning);
          setPendingTrade(() => () => executeBuy(amountInUsd, pin));
          return;
        }
      } catch (err) {
        console.warn("Guardian check failed, proceeding anyway", err);
      }
    }

    await executeBuy(amountInUsd, pin);
  };

  const executeSell = async (v: number, pin: string | undefined) => {
    setBusy(true);
    try {
      await sell(
        coin.id,
        v,
        currentPrice,
        pin,
        reason === "none" ? undefined : (reason || undefined),
        confidence,
      );
      toast.success(`Sold ${v} ${coin.symbol.toUpperCase()}`);
      setSellAmount(""); setReason(""); setConfidence(50); setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Sell failed");
    } finally { setBusy(false); }
  };

  const onSell = async () => {
    const v = parseFloat(sellAmount);
    if (!v || v <= 0) return toast.error("Enter amount");
    if (!holding || v > holding.amount) return toast.error("Not enough coins");

    let pin: string | undefined;
    if (mode === "live") {
      try {
        pin = await requestPin();
      } catch {
        return;
      }
    }

    // Guardian Check
    if (mode === "live") {
      try {
        setBusy(true);
        const warning = await behaviorApi.guardian({
          type: "sell",
          coinId: coin.id,
          amount: v,
          price: currentPrice,
          confidence,
        });
        setBusy(false);
        
        if (!warning.passed) {
          setGuardianWarning(warning);
          setPendingTrade(() => () => executeSell(v, pin));
          return;
        }
      } catch (err) {
        console.warn("Guardian check failed, proceeding anyway", err);
      }
    }

    await executeSell(v, pin);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={coin.image} className="w-7 h-7 rounded-full" alt="" />
              Trade {coin.name}
            </DialogTitle>
            <DialogDescription>
              Price: <span className="text-primary font-semibold">{format(currentPrice)}</span> · Wallet: {format(walletUSD)}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
            </TabsList>
            <TabsContent value="buy" className="space-y-3 pt-3">
              <Label>Amount in {currency}</Label>
              <Input type="number" placeholder={currency === "INR" ? "5000" : "100"} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex gap-2">
                {(currency === "INR" ? [1000, 5000, 10000, 50000] : [25, 100, 500, 1000]).map((v) => (
                  <Button key={v} variant="outline" size="sm" className="glass" onClick={() => setAmount(String(v))}>{currency === "INR" ? `₹${v}` : `$${v}`}</Button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div className="text-sm text-muted-foreground">≈ {((currency === "INR" ? parseFloat(amount) / rate : parseFloat(amount)) / currentPrice).toFixed(6)} {coin.symbol.toUpperCase()}</div>
              )}

              {/* Advanced: Reason + Confidence */}
              <button
                type="button"
                onClick={() => setShowAdvanced(a => !a)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Journal annotation (optional)
              </button>
              {showAdvanced && (
                <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-border/20">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Trade Reason</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="w-full bg-white/5 border border-border/30 rounded-xl px-3 py-2 text-sm focus:ring-0 focus:outline-none focus:border-primary/50 text-foreground">
                        <SelectValue placeholder="Select reason (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-border/30">
                        {TRADE_REASONS.map(r => <SelectItem key={r.value} value={r.value || "none"}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex justify-between">
                      <span>Confidence Level</span>
                      <span className="text-primary font-bold">{confidence}%</span>
                    </Label>
                    <input
                      type="range" min={0} max={100} value={confidence}
                      onChange={e => setConfidence(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>Uncertain</span><span>Very Confident</span>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={onBuy} disabled={busy} className="w-full bg-gradient-neon text-background shadow-glow-primary">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Buy {coin.symbol.toUpperCase()}
              </Button>
            </TabsContent>
            <TabsContent value="sell" className="space-y-3 pt-3">
              <Label>Amount in {coin.symbol.toUpperCase()}</Label>
              <Input type="number" placeholder="0.0" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                Holding: {holding ? `${holding.amount.toFixed(6)} ${coin.symbol.toUpperCase()} (${format(holding.amount * currentPrice)})` : "none"}
              </div>
              {holding && (
                <div className="flex gap-2">
                  {[0.25, 0.5, 0.75, 1].map((p) => (
                    <Button key={p} variant="outline" size="sm" className="glass" onClick={() => setSellAmount((holding.amount * p).toFixed(6))}>{p * 100}%</Button>
                  ))}
                </div>
              )}

              {/* Advanced: Reason + Confidence */}
              <button
                type="button"
                onClick={() => setShowAdvanced(a => !a)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Journal annotation (optional)
              </button>
              {showAdvanced && (
                <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-border/20">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Trade Reason</Label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="w-full bg-white/5 border border-border/30 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-foreground"
                    >
                      {TRADE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex justify-between">
                      <span>Confidence Level</span>
                      <span className="text-primary font-bold">{confidence}%</span>
                    </Label>
                    <input
                      type="range" min={0} max={100} value={confidence}
                      onChange={e => setConfidence(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                      <span>Uncertain</span><span>Very Confident</span>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={onSell} disabled={busy} variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Sell {coin.symbol.toUpperCase()}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <PinDialog open={pinOpen} onClose={handleClose} onConfirm={handleConfirm} />
      
      <SmartTradeWarningModal
        open={!!guardianWarning}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setGuardianWarning(null);
            setPendingTrade(null);
          }
        }}
        warning={guardianWarning}
        onProceed={() => {
          setGuardianWarning(null);
          if (pendingTrade) pendingTrade();
        }}
      />
    </>
  );
};
