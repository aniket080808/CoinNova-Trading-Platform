import { Logo } from "@/components/glass/Logo";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBg } from "@/components/glass/AuroraBg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarkets } from "@/lib/coingecko";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatUSD, formatPct } from "@/store/demo";
import { useCurrencyStore } from "@/store/currencyStore";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { isAuthenticated } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HeroTerminalMockup } from "@/components/landing/HeroTerminalMockup";
import { ProfitCalculator } from "@/components/landing/ProfitCalculator";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { LiveActivityTicker } from "@/components/landing/LiveActivityTicker";
import {
  ArrowRight, Bot, Shield, Wallet, TrendingUp, Bell,
  Sparkles, Zap, Lock, Play, CheckCircle2, Gift,
  Smartphone, Activity, BarChart3, Share2, Layers, DollarSign,
  Copy, Check, ShieldCheck, HelpCircle, Star, ArrowUpRight, LogIn
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";

interface FaqItem {
  q: string;
  a: string;
  category: "all" | "demo" | "ai" | "security" | "rewards";
}

const FAQS: FaqItem[] = [
  {
    category: "demo",
    q: "Is CoinNova really 100% free with no deposit required?",
    a: "Yes! Every user immediately receives $100,000 in simulated practice capital with full real-time access to live market charts, order book execution, and Nova AI risk diagnostics without entering any credit card or bank details."
  },
  {
    category: "ai",
    q: "How does the Nova AI Copilot analyze market risk?",
    a: "Nova leverages ultra-fast Groq LLM inference to synthesize live order book volume, technical momentum, and volatility. It produces plain-English risk ratings (Low, Moderate, High) and clear portfolio diversification guidance."
  },
  {
    category: "rewards",
    q: "How does the Referral Cash Reward work?",
    a: "Every registered user receives a unique invite code (e.g. NOVA-7492). When your friend signs up using your code, you earn $25 and they automatically receive a $10 welcome bonus credited directly to their CoinNova wallet balance."
  },
  {
    category: "security",
    q: "What makes CoinNova’s transaction security bank-grade?",
    a: "CoinNova employs multi-layered defenses: Brevo-powered 2FA email one-time passwords for authentication, a mandatory 6-digit Transaction PIN for balance transfers, and HTTP-only encrypted session cookies."
  },
  {
    category: "demo",
    q: "Can I practice both Limit Orders and Market Orders?",
    a: "Yes. CoinNova's proprietary Order Matching Engine accurately simulates market depth, limit bid/ask queues, and execution slippage, providing realistic institutional trading practice."
  },
  {
    category: "all",
    q: "Can I view all prices and charts in Indian Rupees (INR)?",
    a: "Yes! CoinNova includes native dual-currency architecture. You can switch between USD ($) and INR (₹) at any time from the top header or settings, and all 10,000+ crypto pairs convert dynamically in real-time."
  }
];

export default function Landing() {
  const { data: coins } = useMarkets(1);
  const { user, setMode } = useAuthStore();
  const { currency, setCurrency, rate } = useCurrencyStore();
  const navigate = useNavigate();
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [faqFilter, setFaqFilter] = useState<"all" | "demo" | "ai" | "security" | "rewards">("all");

  const top = (coins ?? []).slice(0, 6);
  const tickerCoins = (coins ?? []).slice(0, 12);
  const loggedIn = !!user;

  // Automatically navigate to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const enterDemo = () => {
    sessionStorage.setItem("coinnova_demo_active", "true");
    setMode("demo");
    navigate("/dashboard");
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText("NOVA-2026");
    setCopiedReferral(true);
    toast.success("Referral code NOVA-2026 copied to clipboard!");
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  if (isAuthenticated()) {
    return null;
  }

  const filteredFaqs = faqFilter === "all" ? FAQS : FAQS.filter(f => f.category === faqFilter);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBg />
      <LiveActivityTicker />

      {/* Nav */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/40 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#simulator" className="hover:text-foreground transition">Terminal</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#calculator" className="hover:text-foreground transition">Profit Simulator</a>
            <a href="#markets" className="hover:text-foreground transition">Live Markets</a>
            <a href="#comparison" className="hover:text-foreground transition">Why Us</a>
            <a href="#referrals" className="hover:text-foreground transition">Rewards ($25)</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Currency toggle */}
            <button
              onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold glass border border-border/60 text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              title="Toggle Currency"
            >
              <span>{currency === "USD" ? "🇺🇸 USD ($)" : "🇮🇳 INR (₹)"}</span>
            </button>

            {loggedIn ? (
              <Button asChild className="bg-gradient-neon text-background hover:opacity-95 shadow-glow-primary text-sm font-semibold rounded-xl">
                <Link to="/dashboard">Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex text-sm font-semibold">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="bg-gradient-neon text-background hover:opacity-90 shadow-glow-primary text-sm font-bold rounded-xl px-5">
                  <Link to="/register">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container pt-12 lg:pt-20 pb-16 relative">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-bold tracking-wide shadow-glow-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Crypto Simulator & Pro Trading Terminal
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight leading-[1.05]">
              Trade smarter with{" "}
              <span className="text-gradient">Nova AI</span>{" "}
              by your side.
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Master crypto trading with institutional precision. Real-time order matching, risk-free <strong className="text-foreground">$100,000 virtual capital</strong>, bank-grade PIN security, and instant AI portfolio diagnostics.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <Button 
                onClick={enterDemo} 
                size="lg" 
                className="group relative overflow-hidden h-12 sm:h-13 px-7 sm:px-8 font-bold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:via-teal-200 hover:to-emerald-300 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-950/80" />
                  <span>Start Free with {currency === "INR" ? "₹95L Demo" : "$100K Demo"}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>

              <Button 
                asChild 
                size="lg" 
                className="group h-12 sm:h-13 px-6 sm:px-7 font-semibold text-sm sm:text-base text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 backdrop-blur-xl rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Link to="/login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span>Login to Account</span>
                </Link>
              </Button>
            </div>

            {/* Micro-Trust Props */}
            <div className="flex flex-wrap gap-5 pt-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> $100K Zero-risk demo</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> 6-Digit PIN & 2FA</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> 10,000+ Live coins</span>
            </div>
          </div>

          {/* Hero Right: Interactive 3D Terminal Preview */}
          <div id="simulator" className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <HeroTerminalMockup onGetStarted={enterDemo} />
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-3xl glass border border-primary/20 shadow-2xl">
          <div className="p-3 text-center">
            <div className="text-2xl sm:text-4xl font-display font-extrabold text-gradient">$100,000</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Practice Capital</div>
          </div>
          <div className="p-3 text-center border-l border-border/40">
            <div className="text-2xl sm:text-4xl font-display font-extrabold text-primary">10,000+</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Real-Time Crypto Pairs</div>
          </div>
          <div className="p-3 text-center border-t md:border-t-0 md:border-l border-border/40">
            <div className="text-2xl sm:text-4xl font-display font-extrabold text-gradient">$25 Cash</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">Per Qualified Referral</div>
          </div>
          <div className="p-3 text-center border-t md:border-t-0 border-l border-border/40">
            <div className="text-2xl sm:text-4xl font-display font-extrabold text-primary">100% PWA</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">iOS & Android Ready</div>
          </div>
        </div>
      </section>

      {/* Infinite Marquee Ticker */}
      <section className="border-y border-border/40 glass overflow-hidden py-3.5">
        <div className="flex gap-8 animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
          {[...tickerCoins, ...tickerCoins].map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm font-medium px-2 py-1 rounded-xl glass border border-border/30">
              <img src={c.image} alt="" className="w-5 h-5 rounded-full" />
              <span className="font-bold">{c.symbol.toUpperCase()}</span>
              <span className="text-muted-foreground font-mono">
                {currency === "INR" ? `₹${(c.current_price * rate).toLocaleString(undefined, { maximumFractionDigits: 1 })}` : formatUSD(c.current_price)}
              </span>
              <span className={`text-xs font-bold ${c.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {formatPct(c.price_change_percentage_24h ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Profit Calculator Section */}
      <section id="calculator" className="container py-20">
        <ProfitCalculator />
      </section>

      {/* Features Asymmetric Bento Grid */}
      <section id="features" className="container py-20">
        <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
            <Layers className="w-3.5 h-3.5" /> Institutional Ecosystem
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-display font-bold">
            Everything you need to <span className="text-gradient">conquer crypto trading</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            A comprehensive trading simulator engineered with modern UI, AI diagnostics, and bank-grade security.
          </p>
        </div>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bento Card 1: Nova AI Copilot (Double-Width) */}
          <GlassCard glow className="p-7 space-y-5 lg:col-span-2 border-primary/30 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-neon/15 border border-primary/30 flex items-center justify-center text-primary shadow-glow-primary/20">
                  <Bot className="w-6 h-6" />
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs">
                  AI INTELLIGENCE
                </Badge>
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground">
                Nova AI Intelligence Copilot
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                Real-time risk scoring (Low / Medium / High), conversational market intelligence, and portfolio diversification health checks delivered in plain English without confusing jargon.
              </p>
            </div>

            {/* Interactive Chat Snippet preview inside card */}
            <div className="p-4 rounded-2xl bg-background/50 border border-border/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">Live Market Diagnostic:</span>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px] font-mono">
                  ● Bullish Sentiment 84/100
                </Badge>
              </div>
              <div className="text-xs text-foreground bg-primary/5 p-3 rounded-xl border border-primary/20 leading-relaxed font-medium">
                "BTC is consolidating near resistance. In your demo portfolio, maintain 40% allocation and set a trailing stop at $78,200 for optimal capital safety."
              </div>
            </div>
          </GlassCard>

          {/* Bento Card 2: Order Matching Engine */}
          <GlassCard hover className="p-7 space-y-4 border-border/60 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-neon/15 border border-primary/30 flex items-center justify-center text-primary">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">ORDER BOOK</Badge>
              </div>
              <h3 className="text-xl font-display font-bold">Matching Engine</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Realistic order execution with Limit, Market, Stop-Loss, and Take-Profit orders simulating real liquidity and slippage.
              </p>
            </div>

            {/* Visual Depth Bars */}
            <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/40 font-mono text-[11px]">
              <div className="flex justify-between text-emerald-400">
                <span>BUY 79,530.00</span>
                <span>1.45 BTC</span>
              </div>
              <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-3/4" />
              </div>
              <div className="flex justify-between text-red-400 pt-1">
                <span>SELL 79,545.00</span>
                <span>2.10 BTC</span>
              </div>
              <div className="w-full bg-red-500/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-400 h-full w-1/2" />
              </div>
            </div>
          </GlassCard>

          {/* Bento Card 3: Bank-Grade 6-Digit PIN Security */}
          <GlassCard hover className="p-7 space-y-4 border-border/60 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-500/30">BANK-GRADE</Badge>
              </div>
              <h3 className="text-xl font-display font-bold">6-Digit PIN & 2FA</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                All outgoing balance movements and withdrawals require your private 6-digit Transaction PIN plus Brevo 2FA email codes.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-background/50 border border-border/40">
              {[1, 2, 3, 4, 5, 6].map((dot) => (
                <div key={dot} className="w-3 h-3 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: `${dot * 0.15}s` }} />
              ))}
              <span className="text-[10px] font-mono text-primary font-bold ml-2">PIN LOCKED</span>
            </div>
          </GlassCard>

          {/* Bento Card 4: $25 Referral Program (Double-Width) */}
          <GlassCard glow className="p-7 space-y-5 lg:col-span-2 border-primary/30 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Gift className="w-6 h-6" />
                </div>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-mono text-xs">
                  $25 PER INVITE
                </Badge>
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground">
                Earn $25 Cash Rewards per Friend
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                Share your personalized invite link directly to WhatsApp or Telegram. When friends sign up, you earn <strong className="text-emerald-400">$25</strong> and they get a <strong className="text-amber-400">$10 welcome bonus</strong> credited instantly to their wallet.
              </p>
            </div>

            {/* Interactive Referral Code Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-background/50 border border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground uppercase font-bold">Sample Invite Code:</span>
                <span className="font-mono font-extrabold text-primary text-base tracking-widest bg-primary/10 px-3 py-1 rounded-xl border border-primary/30">
                  NOVA-2026
                </span>
              </div>
              <Button onClick={copyReferralCode} size="sm" variant="outline" className="glass gap-1.5 text-xs font-semibold">
                {copiedReferral ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReferral ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Comparison Matrix Table */}
      <section id="comparison">
        <ComparisonTable />
      </section>

      {/* Markets Preview */}
      <section id="markets" className="container py-16">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <Badge variant="outline" className="border-primary/40 text-primary mb-2">Live Spot Prices</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Top markets right now</h2>
          </div>
          <Button asChild variant="outline" className="glass">
            <Link to="/market">Explore All 10,000+ Coins <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>

        <GlassCard className="p-0 overflow-hidden border-border/40 rounded-3xl shadow-xl">
          <div className="divide-y divide-border/40">
            {top.map((c) => (
              <Link to={`/coin/${c.id}`} key={c.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-primary/5 transition">
                <span className="text-xs text-muted-foreground w-6 font-mono">#{c.market_cap_rank}</span>
                <img src={c.image} alt={c.name} className="w-9 h-9 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{c.symbol}</div>
                </div>
                <div className="hidden sm:block w-32 h-10">
                  {c.sparkline_in_7d?.price && (
                    <Sparkline data={c.sparkline_in_7d.price} color={c.price_change_percentage_24h >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm sm:text-base font-mono">
                    {currency === "INR" ? `₹${(c.current_price * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : formatUSD(c.current_price)}
                  </div>
                  <div className={`text-xs font-bold ${c.price_change_percentage_24h >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {formatPct(c.price_change_percentage_24h ?? 0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* PWA Mobile App Callout */}
      <section className="container py-12">
        <GlassCard className="p-8 lg:p-12 text-center relative overflow-hidden border-border/60 rounded-3xl">
          <div className="max-w-2xl mx-auto space-y-4">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Smartphone className="w-3.5 h-3.5 mr-1" /> Progressive Web App
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Trade anytime, anywhere — <span className="text-gradient">on all devices</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Install CoinNova directly to your iPhone or Android home screen without waiting for App Store approvals. Full offline support, lightning-fast price feeds, and zero app store bloat.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={enterDemo} className="bg-gradient-neon text-background font-bold shadow-glow-primary rounded-xl px-6 h-11">
                Open App Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Categorized FAQ Section */}
      <section id="faq" className="container py-20 max-w-3xl">
        <div className="text-center mb-8 space-y-2">
          <Badge variant="outline" className="border-primary/40 text-primary">Got Questions?</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Frequently asked questions</h2>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { id: "all", label: "All Questions" },
            { id: "demo", label: "Practice & Demo" },
            { id: "ai", label: "Nova AI Copilot" },
            { id: "security", label: "Security & PIN" },
            { id: "rewards", label: "Referrals & Rewards" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFaqFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                faqFilter === cat.id
                  ? "bg-primary/20 border-primary text-primary font-bold shadow-glow-primary/20"
                  : "glass border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <GlassCard className="rounded-3xl border-primary/20">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((f, i) => (
              <AccordionItem key={f.q} value={`f${i}`} className="border-border/40">
                <AccordionTrigger className="text-left font-semibold text-sm sm:text-base py-4">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* Final Call to Action */}
      <section className="container py-16">
        <GlassCard glow className="p-12 lg:p-16 text-center relative overflow-hidden border-primary/40 rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative space-y-5">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight">
              Your {currency === "INR" ? "₹95 Lakh" : "$100,000"} demo wallet <br /> is <span className="text-gradient">ready to trade</span>.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Practice trading with real order matching, ask Nova AI anything, and claim your $25 referral bonus today.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="group relative overflow-hidden h-13 px-9 font-bold text-base text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 shadow-xl shadow-emerald-500/25 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Link to="/register" className="flex items-center gap-2">
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Modern FinTech Footer */}
      <footer className="border-t border-border/40 mt-10 bg-background/50 backdrop-blur-xl">
        <div className="container py-12 grid md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              CoinNova is an institutional-grade digital asset trading simulator and educational terminal. Powered by Nova AI, high-security 2FA, and live order matching.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold">All Systems Operational (99.98% Uptime)</span>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Platform</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#simulator" className="hover:text-foreground transition">Terminal Simulator</a></li>
              <li><a href="#calculator" className="hover:text-foreground transition">ROI Calculator</a></li>
              <li><a href="#comparison" className="hover:text-foreground transition">Why CoinNova</a></li>
              <li><a href="#referrals" className="hover:text-foreground transition">Referral Rewards ($25)</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Account & Access</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground transition">Sign In</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition">Create Account</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground transition">Trading Terminal</Link></li>
              <li><Link to="/settings" className="hover:text-foreground transition">Security & PIN</Link></li>
            </ul>
          </div>
        </div>
        <div className="container py-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3">
          <div>© {new Date().getFullYear()} CoinNova Trading Platform. All rights reserved.</div>
          <div className="text-muted-foreground/70">Educational & Simulation Platform • Not Financial Advice</div>
        </div>
      </footer>
    </div>
  );
}
