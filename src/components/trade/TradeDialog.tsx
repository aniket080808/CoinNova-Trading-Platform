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
import { Loader2 } from "lucide-react";
import type { Coin } from "@/lib/coingecko";
import { usePinDialog, PinDialog } from "@/components/PinDialog";
import { useCurrencyStore } from "@/store/currencyStore";
import { usePrices } from "@/lib/binance";

export const TradeDialog = ({ coin, trigger, defaultTab = "buy" }: { coin: Coin; trigger: ReactNode; defaultTab?: "buy" | "sell" }) => {
  const { walletUSD, holdings, buy, sell, mode, currency, convert, format } = useDemo();
  const { open: pinOpen, requestPin, handleConfirm, handleClose } = usePinDialog();
  const { prices: livePrices } = usePrices();
  const holding = holdings.find((h) => h.coinId === coin.id);
  
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(""); // Amount in current currency
  const [sellAmount, setSellAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const livePrice = livePrices[coin.symbol.toLowerCase()];
  const currentPrice = livePrice ?? coin.current_price;

  const { rate } = useCurrencyStore.getState();

  const onBuy = async () => {
    let v = parseFloat(amount);
    if (!v || v <= 0) return toast.error("Enter amount");
    
    // Convert to USD for backend if needed
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

    setBusy(true);
    try {
      await buy({ id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image }, amountInUsd, currentPrice, pin);
      toast.success(`Bought ${format(amountInUsd)} of ${coin.symbol.toUpperCase()}`);
      setAmount(""); setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Buy failed");
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

    setBusy(true);
    try {
      await sell(coin.id, v, currentPrice, pin);
      toast.success(`Sold ${v} ${coin.symbol.toUpperCase()}`);
      setSellAmount(""); setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Sell failed");
    } finally { setBusy(false); }
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
                <div className="text-sm text-muted-foreground">≈ {( (currency === "INR" ? parseFloat(amount) / rate : parseFloat(amount)) / currentPrice).toFixed(6)} {coin.symbol.toUpperCase()}</div>
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
              <Button onClick={onSell} disabled={busy} variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Sell {coin.symbol.toUpperCase()}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <PinDialog open={pinOpen} onClose={handleClose} onConfirm={handleConfirm} />
    </>
  );
};
