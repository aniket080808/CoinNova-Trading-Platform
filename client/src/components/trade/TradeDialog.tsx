import { useState, useEffect, useRef } from "react";
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
import { Loader2, ChevronDown, Zap, Target, ShieldAlert, AlertCircle, ArrowDown, ArrowUp } from "lucide-react";
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

export const TradeDialog = ({
  coin,
  trigger,
  defaultTab = "buy",
  initialTargetPrice,
  initialOrderType,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  coin: Coin;
  trigger?: ReactNode;
  defaultTab?: "buy" | "sell";
  initialTargetPrice?: number;
  initialOrderType?: "market" | "limit" | "stop_loss";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const { walletUSD, holdings, buy, sell, placeOrder, mode, currency, convert, format } = useDemo();
  const { open: pinOpen, requestPin, handleConfirm, handleClose } = usePinDialog();
  const { prices: livePrices } = usePrices();
  const holding = holdings.find((h) => h.coinId === coin.id);

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const [buyOrderType, setBuyOrderType] = useState<"market" | "limit">("market");
  const [sellOrderType, setSellOrderType] = useState<"market" | "limit" | "stop_loss">("market");
  const [buyTargetPrice, setBuyTargetPrice] = useState("");
  const [sellTargetPrice, setSellTargetPrice] = useState("");
  const [activeTab, setActiveTab] = useState<"buy" | "sell">(defaultTab);
  const [amount, setAmount] = useState(""); // Amount in current currency for buy
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

  const prevOpenRef = useRef(false);

  // Initialize order types and target prices ONLY on initial open transition
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;

    if (justOpened) {
      const safePrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : (coin.current_price || 0);
      const defaultBuyTarget = (safePrice * 0.98).toFixed(safePrice < 1 ? 4 : 2);
      const defaultSellTarget = (safePrice * 1.05).toFixed(safePrice < 1 ? 4 : 2);

      if (initialTargetPrice) {
        const targetStr = initialTargetPrice.toString();
        if (initialOrderType === "stop_loss") {
          setSellOrderType("stop_loss");
          setSellTargetPrice(targetStr);
          setActiveTab("sell");
        } else {
          setBuyOrderType("limit");
          setBuyTargetPrice(targetStr);
          setSellOrderType("limit");
          setSellTargetPrice(targetStr);
          if (defaultTab) setActiveTab(defaultTab);
        }
      } else {
        setBuyTargetPrice(defaultBuyTarget);
        setSellTargetPrice(defaultSellTarget);
        setBuyOrderType(initialOrderType === "limit" ? "limit" : "market");
        setSellOrderType(initialOrderType === "stop_loss" ? "stop_loss" : initialOrderType === "limit" ? "limit" : "market");
        setActiveTab(defaultTab);
      }
    }

    prevOpenRef.current = open;
  }, [open]);

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
        
        const isPassed = warning.passed ?? warning.isSafe ?? (warning.riskScore !== undefined ? warning.riskScore <= 50 : true);
        if (!isPassed) {
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
        
        const isPassed = warning.passed ?? warning.isSafe ?? (warning.riskScore !== undefined ? warning.riskScore <= 50 : true);
        if (!isPassed) {
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

  // ─── Limit & Stop-Loss Submission ─────────────────────────
  const onPlaceOrder = async (side: "buy" | "sell") => {
    const target = side === "buy" ? parseFloat(buyTargetPrice) : parseFloat(sellTargetPrice);
    if (!target || target <= 0) return toast.error("Enter valid target price");

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
      if (side === "buy") {
        let v = parseFloat(amount);
        if (!v || v <= 0) return toast.error("Enter amount");
        const amountInUsd = currency === "INR" ? v / rate : v;
        if (amountInUsd > walletUSD) {
          return toast.error(`Insufficient balance (need ${format(amountInUsd)})`);
        }
        const coinAmount = amountInUsd / target;

        await placeOrder({
          coinId: coin.id,
          symbol: coin.symbol,
          type: "limit",
          side: "buy",
          targetPrice: target,
          amount: coinAmount,
          pin,
          transactionPin: pin,
          reason: reason === "none" ? undefined : (reason || undefined),
          confidence,
        });
        toast.success(`Limit Buy order placed for ${coinAmount.toFixed(4)} ${coin.symbol.toUpperCase()} at $${target.toFixed(2)}`);
        setAmount("");
        setOpen(false);
      } else {
        const v = parseFloat(sellAmount);
        if (!v || v <= 0) return toast.error("Enter amount");
        if (!holding || v > holding.amount) return toast.error("Not enough coins in holding");

        const actualType = sellOrderType === "stop_loss" ? "stop_loss" : "limit";

        await placeOrder({
          coinId: coin.id,
          symbol: coin.symbol,
          type: actualType,
          side: "sell",
          targetPrice: target,
          amount: v,
          pin,
          transactionPin: pin,
          reason: reason === "none" ? undefined : (reason || undefined),
          confidence,
        });
        toast.success(`${actualType === "stop_loss" ? "Stop-Loss" : "Limit Sell"} order placed for ${v.toFixed(4)} ${coin.symbol.toUpperCase()} at $${target.toFixed(2)}`);
        setSellAmount("");
        setOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setBusy(false);
    }
  };

  const parsedBuyTarget = parseFloat(buyTargetPrice) || currentPrice;
  const buyPriceDiffPct = ((parsedBuyTarget - currentPrice) / currentPrice) * 100;

  const parsedSellTarget = parseFloat(sellTargetPrice) || currentPrice;
  const sellPriceDiffPct = ((parsedSellTarget - currentPrice) / currentPrice) * 100;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="glass-strong max-w-md border-border/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={coin.image} className="w-7 h-7 rounded-full" alt="" />
              Trade {coin.name}
            </DialogTitle>
            <DialogDescription>
              Market: <span className="text-primary font-semibold">{format(currentPrice)}</span> · Wallet: {format(walletUSD)}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
          >
            <TabsList className="grid grid-cols-2 w-full mb-3">
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
            </TabsList>

            {/* ─── BUY TAB ─────────────────────────────────────────── */}
            <TabsContent value="buy" className="space-y-4 pt-1">
              {/* Order Type Selector */}
              <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 border border-border/30">
                <button
                  type="button"
                  onClick={() => setBuyOrderType("market")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    buyOrderType === "market"
                      ? "bg-primary text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Instant Market
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBuyOrderType("limit");
                    if (!buyTargetPrice || parseFloat(buyTargetPrice) >= currentPrice) {
                      setBuyTargetPrice((currentPrice * 0.98).toFixed(currentPrice < 1 ? 4 : 2));
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    buyOrderType === "limit"
                      ? "bg-primary text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Limit Order
                </button>
              </div>

              {/* Target Price (for Limit Buy) */}
              {buyOrderType === "limit" && (
                <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center text-xs">
                    <Label className="text-xs font-medium text-foreground">Target Buy Price ($)</Label>
                    <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${buyPriceDiffPct < 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {buyPriceDiffPct < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                      {Math.abs(buyPriceDiffPct).toFixed(2)}% {buyPriceDiffPct < 0 ? "below" : "above"} market
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="any"
                    value={buyTargetPrice}
                    onChange={(e) => setBuyTargetPrice(e.target.value)}
                    className="bg-background/80 font-mono text-sm"
                  />
                  {/* Shortcut Pills */}
                  <div className="flex gap-1.5">
                    {[-1, -2, -5, -10].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setBuyTargetPrice((currentPrice * (1 + pct / 100)).toFixed(currentPrice < 1 ? 4 : 2))
                        }
                        className="px-2 py-0.5 text-[10px] rounded bg-secondary/70 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30"
                      >
                        {pct}%
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBuyTargetPrice(currentPrice.toFixed(currentPrice < 1 ? 4 : 2))}
                      className="px-2 py-0.5 text-[10px] rounded bg-secondary/70 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30 ml-auto"
                    >
                      Current
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight pt-1">
                    Triggers automatically when {coin.symbol.toUpperCase()} drops to <b>${parsedBuyTarget.toFixed(2)}</b> or lower.
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label>Amount in {currency}</Label>
                <Input
                  type="number"
                  placeholder={currency === "INR" ? "5000" : "100"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex gap-2 pt-1">
                  {(currency === "INR" ? [1000, 5000, 10000, 50000] : [25, 100, 500, 1000]).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="glass text-xs h-7"
                      onClick={() => setAmount(String(v))}
                    >
                      {currency === "INR" ? `₹${v}` : `$${v}`}
                    </Button>
                  ))}
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    ≈ {(
                      (currency === "INR" ? parseFloat(amount) / rate : parseFloat(amount)) /
                      (buyOrderType === "limit" ? parsedBuyTarget : currentPrice)
                    ).toFixed(6)}{" "}
                    {coin.symbol.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Advanced Journal Reason */}
              <button
                type="button"
                onClick={() => setShowAdvanced((a) => !a)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Journal annotation (optional)
              </button>
              {showAdvanced && (
                <div className="space-y-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Trade Reason</Label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="w-full bg-background/50 border border-border/30 rounded-xl px-3 py-2 text-sm focus:ring-0 text-foreground">
                        <SelectValue placeholder="Select reason (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-border/30">
                        {TRADE_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value || "none"}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex justify-between">
                      <span>Confidence Level</span>
                      <span className="text-primary font-bold">{confidence}%</span>
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              {buyOrderType === "market" ? (
                <Button
                  onClick={onBuy}
                  disabled={busy}
                  className="w-full bg-gradient-neon text-background shadow-glow-primary font-semibold"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Buy {coin.symbol.toUpperCase()} (Market)
                </Button>
              ) : (
                <Button
                  onClick={() => onPlaceOrder("buy")}
                  disabled={busy}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Target className="w-4 h-4 mr-1.5" />}
                  Place Limit Buy @ ${parsedBuyTarget.toFixed(2)}
                </Button>
              )}
            </TabsContent>

            {/* ─── SELL TAB ────────────────────────────────────────── */}
            <TabsContent value="sell" className="space-y-4 pt-1">
              {/* Order Type Selector */}
              <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 border border-border/30">
                <button
                  type="button"
                  onClick={() => setSellOrderType("market")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sellOrderType === "market"
                      ? "bg-primary text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellOrderType("limit");
                    if (!sellTargetPrice || parseFloat(sellTargetPrice) <= currentPrice) {
                      setSellTargetPrice((currentPrice * 1.05).toFixed(currentPrice < 1 ? 4 : 2));
                    }
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sellOrderType === "limit"
                      ? "bg-primary text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  Limit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellOrderType("stop_loss");
                    setSellTargetPrice((currentPrice * 0.95).toFixed(currentPrice < 1 ? 4 : 2));
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all ${
                    sellOrderType === "stop_loss"
                      ? "bg-rose-500 text-slate-950 shadow-sm font-bold"
                      : "text-rose-400/80 hover:text-rose-400"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Stop-Loss
                </button>
              </div>

              {/* Target / Stop Price Input */}
              {sellOrderType !== "market" && (
                <div
                  className={`space-y-2 p-3 rounded-xl border ${
                    sellOrderType === "stop_loss"
                      ? "bg-rose-500/10 border-rose-500/20"
                      : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <Label className="text-xs font-medium text-foreground">
                      {sellOrderType === "stop_loss" ? "Stop Trigger Price ($)" : "Target Sell Price ($)"}
                    </Label>
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                        sellOrderType === "stop_loss"
                          ? "text-rose-400"
                          : sellPriceDiffPct > 0
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {sellPriceDiffPct < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                      {Math.abs(sellPriceDiffPct).toFixed(2)}% {sellPriceDiffPct < 0 ? "below" : "above"} market
                    </span>
                  </div>

                  <Input
                    type="number"
                    step="any"
                    value={sellTargetPrice}
                    onChange={(e) => setSellTargetPrice(e.target.value)}
                    className="bg-background/80 font-mono text-sm"
                  />

                  {/* Shortcut Pills */}
                  <div className="flex gap-1.5">
                    {sellOrderType === "stop_loss"
                      ? [-3, -5, -10, -15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              setSellTargetPrice((currentPrice * (1 + pct / 100)).toFixed(currentPrice < 1 ? 4 : 2))
                            }
                            className="px-2 py-0.5 text-[10px] rounded bg-secondary/70 hover:bg-rose-500/20 hover:text-rose-400 transition-colors border border-border/30"
                          >
                            {pct}%
                          </button>
                        ))
                      : [2, 5, 10, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              setSellTargetPrice((currentPrice * (1 + pct / 100)).toFixed(currentPrice < 1 ? 4 : 2))
                            }
                            className="px-2 py-0.5 text-[10px] rounded bg-secondary/70 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30"
                          >
                            +{pct}%
                          </button>
                        ))}
                    <button
                      type="button"
                      onClick={() => setSellTargetPrice(currentPrice.toFixed(currentPrice < 1 ? 4 : 2))}
                      className="px-2 py-0.5 text-[10px] rounded bg-secondary/70 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30 ml-auto"
                    >
                      Current
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-tight pt-1">
                    {sellOrderType === "stop_loss" ? (
                      <>
                        Protects capital: sells automatically if price falls to or below{" "}
                        <b>${parsedSellTarget.toFixed(2)}</b>.
                      </>
                    ) : (
                      <>
                        Books profit: sells automatically when price reaches or exceeds{" "}
                        <b>${parsedSellTarget.toFixed(2)}</b>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <Label>Amount in {coin.symbol.toUpperCase()}</Label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                />
                <div className="text-xs text-muted-foreground flex justify-between">
                  <span>
                    Holding:{" "}
                    {holding
                      ? `${holding.amount.toFixed(6)} ${coin.symbol.toUpperCase()}`
                      : "0.00"}
                  </span>
                  <span>
                    ≈ {format((parseFloat(sellAmount) || 0) * (sellOrderType !== "market" ? parsedSellTarget : currentPrice))}
                  </span>
                </div>
                {holding && (
                  <div className="flex gap-2 pt-1">
                    {[0.25, 0.5, 0.75, 1].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="glass text-xs h-7"
                        onClick={() => setSellAmount((holding.amount * p).toFixed(6))}
                      >
                        {p * 100}%
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Journal Reason */}
              <button
                type="button"
                onClick={() => setShowAdvanced((a) => !a)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                Journal annotation (optional)
              </button>
              {showAdvanced && (
                <div className="space-y-3 p-3 rounded-xl bg-secondary/30 border border-border/30">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Trade Reason</Label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-background/50 border border-border/30 rounded-xl px-3 py-2 text-sm focus:outline-none text-foreground"
                    >
                      {TRADE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex justify-between">
                      <span>Confidence Level</span>
                      <span className="text-primary font-bold">{confidence}%</span>
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              {sellOrderType === "market" ? (
                <Button
                  onClick={onSell}
                  disabled={busy}
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Sell {coin.symbol.toUpperCase()} (Market)
                </Button>
              ) : sellOrderType === "stop_loss" ? (
                <Button
                  onClick={() => onPlaceOrder("sell")}
                  disabled={busy}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ShieldAlert className="w-4 h-4 mr-1.5" />}
                  Place Stop-Loss @ ${parsedSellTarget.toFixed(2)}
                </Button>
              ) : (
                <Button
                  onClick={() => onPlaceOrder("sell")}
                  disabled={busy}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Target className="w-4 h-4 mr-1.5" />}
                  Place Limit Sell @ ${parsedSellTarget.toFixed(2)}
                </Button>
              )}
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
