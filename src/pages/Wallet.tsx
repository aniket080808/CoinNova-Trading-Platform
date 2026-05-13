import { GlassCard } from "@/components/glass/GlassCard";
import { useDemo } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletIcon, CreditCard, Plus, Banknote, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { usePinDialog, PinDialog } from "@/components/PinDialog";
import { razorpayApi } from "@/lib/api";

export default function Wallet() {
  const { walletUSD, deposit, withdraw, mode, syncWallet, currency, convert, format, user } = useDemo();
  const { open, requestPin, handleConfirm, handleClose } = usePinDialog();
  const [addAmt, setAddAmt] = useState("");
  const [wAmt, setWAmt] = useState("");
  const [bank, setBank] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchParams] = useSearchParams();

  // Handle Stripe redirect return
  useEffect(() => {
    const depositStatus = searchParams.get("deposit");
    const sessionId = searchParams.get("session_id");
    if (depositStatus === "success" && sessionId && mode === "live") {
      import("@/lib/api").then(({ walletApi }) => {
        walletApi.confirmDeposit(sessionId).then((res) => {
          toast.success(`Deposit of ${format(res.balanceUsd > 0 ? res.balanceUsd : 0)} confirmed!`);
          syncWallet();
        }).catch(() => toast.error("Could not confirm deposit"));
      });
    } else if (depositStatus === "cancel") {
      toast.error("Deposit cancelled");
    }
  }, [searchParams, mode, syncWallet, format]);

  const handleStripeDeposit = async () => {
    const v = parseFloat(addAmt);
    if (!v || v <= 0) return toast.error("Enter amount");

    const { rate } = useCurrencyStore.getState();
    const amountInUsd = currency === "INR" ? v / rate : v;

    let pin: string | undefined;
    if (mode === "live") {
      try {
        pin = await requestPin();
      } catch {
        return; // User cancelled
      }
    }

    setBusy(true);
    try {
      const res = await deposit(amountInUsd, pin);
      if (res?.url) {
        window.location.href = res.url; // Redirect to Stripe Checkout if live
      } else {
        toast.success(`Added ${format(amountInUsd)} to demo wallet`);
        setAddAmt("");
      }
    } catch (err: any) {
      toast.error(err.message || "Deposit failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRazorpayDeposit = async () => {
    const v = parseFloat(addAmt);
    if (!v || v <= 0) return toast.error("Enter amount");

    const { rate } = useCurrencyStore.getState();
    const amountInUsd = currency === "INR" ? v / rate : v;

    if (mode === "demo") {
      toast.success(`Added ${format(amountInUsd)} to demo wallet`);
      setAddAmt("");
      return;
    }

    let pin: string | undefined;
    try {
      pin = await requestPin();
    } catch {
      return; // User cancelled
    }

    setBusy(true);
    try {
      const order = await razorpayApi.createOrder(v, pin!, rate);
      
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: "CoinNova",
        description: `Wallet Deposit: ${format(amountInUsd)}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            setBusy(true);
            await razorpayApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amountUsd: amountInUsd,
            });
            toast.success("Deposit successful!");
            syncWallet();
            setAddAmt("");
          } catch (err) {
            toast.error("Payment verification failed");
          } finally {
            setBusy(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: "#3b82f6",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize Razorpay");
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    const v = parseFloat(wAmt);
    if (!v || v <= 0) return toast.error("Enter amount");
    if (!bank) return toast.error("Bank account required");

    const { rate } = useCurrencyStore.getState();
    const amountInUsd = currency === "INR" ? v / rate : v;

    if (amountInUsd > walletUSD) return toast.error(`Insufficient balance (need ${format(amountInUsd)})`);

    let pin: string | undefined;
    if (mode === "live") {
      try {
        pin = await requestPin();
      } catch {
        return; // User cancelled
      }
    }

    setBusy(true);
    try {
      const success = await withdraw(amountInUsd, bank, pin);
      if (success === false) throw new Error("Insufficient balance");
      toast.success(`Withdrawal of ${format(amountInUsd)} initiated`);
      setWAmt(""); setBank("");
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-display font-bold">Wallet</h1>

      <GlassCard glow className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/30 blur-3xl rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-neon flex items-center justify-center shadow-glow-primary">
            <WalletIcon className="w-6 h-6 text-background" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground capitalize">{mode} balance</div>
            <div className="text-4xl font-display font-bold">{format(walletUSD)}</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-0 overflow-hidden">
        <Tabs defaultValue="add">
          <TabsList className="grid grid-cols-2 m-3">
            <TabsTrigger value="add"><Plus className="w-4 h-4 mr-1" /> Add balance</TabsTrigger>
            <TabsTrigger value="withdraw"><Banknote className="w-4 h-4 mr-1" /> Withdraw</TabsTrigger>
          </TabsList>
          <TabsContent value="add" className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <Input type="number" value={addAmt} onChange={(e) => setAddAmt(e.target.value)} placeholder={currency === "INR" ? "10000" : "500"} />
              <div className="flex gap-2">
                {(currency === "INR" ? [1000, 5000, 10000, 50000] : [100, 500, 1000, 5000]).map((v) => (
                  <Button key={v} variant="outline" size="sm" className="glass" onClick={() => setAddAmt(String(v))}>{currency === "INR" ? `₹${v}` : `$${v}`}</Button>
                ))}
              </div>
            </div>
            <button onClick={handleStripeDeposit} disabled={busy} className="glass rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-glow-primary/30 transition border border-transparent w-full">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                   {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-semibold text-sm">{mode === "live" ? `Pay with Stripe (${currency})` : "Demo Deposit"}</div>
                  <div className="text-xs text-muted-foreground">{mode === "live" ? "Card payment via Stripe Checkout" : "Instant demo credit"}</div>
                </div>
              </div>
            </button>

            {mode === "live" && (
              <button onClick={handleRazorpayDeposit} disabled={busy} className="glass rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-glow-primary/30 transition border border-transparent w-full">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#3399cc]/15 text-[#3399cc] flex items-center justify-center">
                     {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Pay with Razorpay (INR)</div>
                    <div className="text-xs text-muted-foreground">UPI, Cards, and Netbanking via Razorpay</div>
                  </div>
                </div>
              </button>
            )}

            <div className="text-xs text-muted-foreground">
              {mode === "live"
                ? "⚠️ Educational project — payments run in test mode. Stripe: use 4242... Razorpay: use any test method."
                : "⚠️ Demo mode — no real money is moved."}
            </div>
          </TabsContent>
          <TabsContent value="withdraw" className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Amount ({currency})</Label>
              <Input type="number" value={wAmt} onChange={(e) => setWAmt(e.target.value)} placeholder={currency === "INR" ? "5000" : "100"} />
            </div>
            <div className="space-y-2">
              <Label>Bank account</Label>
              <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="ACC ****1234" />
            </div>
            <Button onClick={handleWithdraw} disabled={busy} className="w-full bg-gradient-neon text-background">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Request withdrawal
            </Button>
          </TabsContent>
        </Tabs>
      </GlassCard>
      
      <PinDialog 
        open={open} 
        onClose={handleClose} 
        onConfirm={handleConfirm} 
      />
    </div>
  );
}
