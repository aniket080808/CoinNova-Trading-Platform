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
import {
  ArrowRight, Bot, Shield, Wallet, TrendingUp, Bell,
  Sparkles, Zap, Lock, Play, CheckCircle2, Gift,
  Smartphone, Activity, BarChart3, Share2, Layers, DollarSign
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";

const FEATURES = [
  {
    icon: Bot,
    title: "Nova AI Copilot",
    desc: "Personalized market sentiment, risk scoring (Low/Med/High), and real-time portfolio advice in plain English.",
    tag: "AI Intelligence"
  },
  {
    icon: TrendingUp,
    title: "Real-Time Matching Engine",
    desc: "Simulated order book with Limit & Market orders. Practice realistic slippage and instant executions.",
    tag: "Pro Trading"
  },
  {
    icon: Shield,
    title: "Bank-Grade PIN & 2FA",
    desc: "Protected by 6-digit Transaction PINs for transfers and withdrawals, plus Brevo-authenticated 2FA.",
    tag: "Security"
  },
  {
    icon: Activity,
    title: "AI Portfolio Diagnostics",
    desc: "Run complete portfolio health checks, evaluate asset diversification, and receive smart rebalance insights.",
    tag: "Analytics"
  },
  {
    icon: Gift,
    title: "$25 Referral Program",
    desc: "Generate your custom invite code, share on WhatsApp or Telegram, and receive $25 cash rewards directly.",
    tag: "Rewards"
  },
  {
    icon: Smartphone,
    title: "Installable Mobile PWA",
    desc: "Install directly on iOS, Android, and desktop in one tap. Lightning-fast performance with zero app store delays.",
    tag: "Mobile Ready"
  },
  {
    icon: BarChart3,
    title: "Trade Journal & Replay",
    desc: "Re-watch historical trades bar-by-bar. Track execution psychology and master your Trading DNA.",
    tag: "Education"
  },
  {
    icon: Wallet,
    title: "Dual Currency (USD & INR)",
    desc: "Instant live conversion between USD ($) and INR (₹) using real-time foreign exchange market rates.",
    tag: "Multi-Currency"
  },
];

const STEPS = [
  { num: "01", title: "Create your free account", desc: "Sign up in 30 seconds with email verification. No credit card or paperwork needed." },
  { num: "02", title: "Trade with $100K Demo cash", desc: "Practice limit and market orders, test strategies with Nova AI, and master risk-free trading." },
  { num: "03", title: "Invite friends & Go Live", desc: "Earn $25 per referral, unlock advanced analytics, and transition to live trading whenever you're ready." },
];

const FAQS = [
  {
    q: "Is CoinNova really 100% free to start?",
    a: "Yes! Every new user immediately receives $100,000 in simulated practice funds with full access to live market charts, AI insights, and order execution without entering any credit card details."
  },
  {
    q: "How does the Nova AI Copilot help beginner traders?",
    a: "Nova uses high-speed Groq LLM inference to analyze any coin's risk rating, explain market volatility in simple terms, and suggest balanced diversification without complicated financial jargon."
  },
  {
    q: "How does the $25 Referral Reward program work?",
    a: "Head to your Referral Hub in Settings to get your custom referral link and code. When your friend signs up using your code, both of you qualify for reward bonuses that credit directly to your account balance."
  },
  {
    q: "How do I install CoinNova on my mobile phone (iOS / Android)?",
    a: "CoinNova is a Progressive Web App (PWA). On mobile Safari (iPhone), tap 'Share' -> 'Add to Home Screen'. On Android Chrome, tap the 'Install App' prompt to get the full app experience."
  },
  {
    q: "How is my account and transaction security protected?",
    a: "CoinNova employs multi-layered defenses: Brevo-powered 2FA email codes for logins, a required 6-digit Transaction PIN for all outgoing balance movements, and encrypted session tokens."
  },
  {
    q: "Can I view prices in Indian Rupees (INR)?",
    a: "Yes! CoinNova includes native dual-currency support. You can toggle between USD ($) and INR (₹) from the navigation bar or settings, and all charts and balances update in real-time."
  },
];

export default function Landing() {
  const { data: coins } = useMarkets(1);
  const { user, setMode } = useAuthStore();
  const { currency, setCurrency, rate } = useCurrencyStore();
  const navigate = useNavigate();
  const top = (coins ?? []).slice(0, 6);
  const tickerCoins = (coins ?? []).slice(0, 12);
  const loggedIn = !!user;

  const enterDemo = () => {
    setMode("demo");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBg />

      {/* Nav */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/40 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#markets" className="hover:text-foreground transition">Markets</a>
            <a href="#referrals" className="hover:text-foreground transition">Rewards ($25)</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            {/* Currency toggle */}
            <button
              onClick={() => setCurrency(currency === "USD" ? "INR" : "USD")}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold glass border border-border/50 text-muted-foreground hover:text-foreground transition flex items-center gap-1"
              title="Toggle Currency"
            >
              <span>{currency === "USD" ? "🇺🇸 USD" : "🇮🇳 INR"}</span>
            </button>
            {loggedIn ? (
              <Button asChild className="bg-gradient-neon text-background hover:opacity-95 shadow-glow-primary text-sm font-semibold">
                <Link to="/dashboard">Go to Dashboard <ArrowRight className="w-4 h-4 ml-1.5" /></Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex text-sm">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild className="bg-gradient-neon text-background hover:opacity-90 shadow-glow-primary text-sm font-semibold">
                  <Link to="/register">Get Started <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Active Session Notification Bar */}
      {loggedIn && (
        <div className="bg-primary/10 border-b border-primary/25 px-4 py-2 text-xs text-center flex items-center justify-center gap-2 text-primary font-medium">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>Active session: <strong>{user?.name || user?.email}</strong></span>
          <span className="text-muted-foreground/60">•</span>
          <Link to="/dashboard" className="underline font-bold hover:text-white transition">
            Continue to Terminal →
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="container pt-14 lg:pt-20 pb-12 relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Crypto Platform & Trading Simulator
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight leading-[1.06]">
              Trade smarter with{" "}
              <span className="text-gradient">Nova AI</span>{" "}
              by your side.
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
              CoinNova is the ultimate platform to learn, simulate, and trade crypto with confidence.
              Real-time order books, AI portfolio diagnostics, and a <strong className="text-foreground">$100,000 risk-free demo wallet</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {loggedIn ? (
                <Button asChild size="lg" className="bg-gradient-neon text-background hover:opacity-95 shadow-glow-primary text-base h-12 px-7 font-semibold">
                  <Link to="/dashboard">Open Trading Terminal <ArrowRight className="w-4 h-4 ml-2" /></Link>
                </Button>
              ) : (
                <>
                  <Button onClick={enterDemo} size="lg" className="bg-gradient-neon text-background hover:opacity-95 shadow-glow-primary text-base h-12 px-6 font-semibold">
                    Start with {formatUSD(100000)} Demo <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 px-6 glass border-border/60 font-medium">
                    <Link to="/login"><Play className="w-4 h-4 mr-2 text-primary" /> Login to Account</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Value Props */}
            <div className="flex flex-wrap gap-6 pt-3 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Zero financial risk demo</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 6-Digit PIN & 2FA security</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 10,000+ live coin markets</span>
            </div>
          </div>

          {/* Hero Live Card */}
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <GlassCard glow className="p-6 space-y-4 shadow-elevated border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo Portfolio</span>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 font-mono text-xs">+12.4% today</Badge>
              </div>
              
              <div>
                <div className="text-xs text-muted-foreground">Total Practice Balance</div>
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-foreground tracking-tight mt-1">
                  {currency === "INR" ? `₹${(112438.20 * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$112,438.20"}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                {top.slice(0, 4).map((c) => (
                  <div key={c.id} className="glass rounded-xl p-3 flex items-center gap-3 border border-border/40 hover:border-primary/40 transition">
                    <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.symbol.toUpperCase()}</div>
                    </div>
                    <div className="w-20 h-7 hidden sm:block">
                      {c.sparkline_in_7d?.price && (
                        <Sparkline data={c.sparkline_in_7d.price} color={c.price_change_percentage_24h >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} height={28} />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatUSD(c.current_price)}</div>
                      <div className={`text-xs font-medium ${c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatPct(c.price_change_percentage_24h ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl glass border border-border/40">
          <div className="p-3 text-center">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-gradient">$100,000</div>
            <div className="text-xs text-muted-foreground mt-1">Risk-Free Practice Cash</div>
          </div>
          <div className="p-3 text-center border-l border-border/40">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-primary">10,000+</div>
            <div className="text-xs text-muted-foreground mt-1">Real-Time Crypto Pairs</div>
          </div>
          <div className="p-3 text-center border-t md:border-t-0 md:border-l border-border/40">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-gradient">$25 Cash</div>
            <div className="text-xs text-muted-foreground mt-1">Per Friend Referral Reward</div>
          </div>
          <div className="p-3 text-center border-t md:border-t-0 border-l border-border/40">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-primary">100% PWA</div>
            <div className="text-xs text-muted-foreground mt-1">iOS & Android Compatible</div>
          </div>
        </div>
      </section>

      {/* Marquee ticker */}
      <section className="border-y border-border/40 glass overflow-hidden py-3">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {[...tickerCoins, ...tickerCoins].map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-medium">
              <img src={c.image} alt="" className="w-5 h-5 rounded-full" />
              <span className="font-semibold">{c.symbol.toUpperCase()}</span>
              <span className="text-muted-foreground">{formatUSD(c.current_price)}</span>
              <span className={c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"}>
                {formatPct(c.price_change_percentage_24h ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container py-24">
        <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5">Platform Features</Badge>
          <h2 className="text-3xl sm:text-5xl font-display font-bold">
            Everything you need to <span className="text-gradient">conquer crypto trading</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            A comprehensive institutional-grade simulator powered by AI, real matching logic, and mobile accessibility.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} hover className="space-y-3 relative p-5 flex flex-col justify-between" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-gradient-neon/15 border border-primary/30 flex items-center justify-center text-primary">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-border/40 text-muted-foreground">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Referral Program Banner */}
      <section id="referrals" className="container py-12">
        <GlassCard glow className="p-8 lg:p-12 relative overflow-hidden border-primary/30">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <Badge className="bg-gradient-neon text-background font-bold text-xs uppercase tracking-wider">
                <Gift className="w-3.5 h-3.5 mr-1" /> Referral Hub
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">
                Invite friends. <span className="text-gradient">Earn $25 cash rewards</span> together.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
                Generate a custom name-based referral code, share your link directly to WhatsApp, Telegram, or Twitter, and claim $25 bonuses straight to your CoinNova wallet for every active trader.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button asChild className="bg-gradient-neon text-background font-semibold shadow-glow-primary">
                  <Link to="/register">Claim $25 Bonus <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Share2 className="w-4 h-4 text-primary" /> Instant 1-Click Social Sharing</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="glass p-5 rounded-2xl border border-primary/20 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase">Your Unique Referral Card</div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/60">
                  <span className="font-mono font-bold text-primary tracking-widest text-base">NOVA-7492</span>
                  <Badge variant="outline" className="border-primary/40 text-primary">Active</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <div className="font-bold text-sm text-foreground">$25.00</div>
                    <div className="text-[10px] text-muted-foreground">Per Qualified Friend</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <div className="font-bold text-sm text-emerald-400">Instant</div>
                    <div className="text-[10px] text-muted-foreground">Direct Wallet Credit</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
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

        <GlassCard className="p-0 overflow-hidden border-border/40">
          <div className="divide-y divide-border/40">
            {top.map((c) => (
              <Link to={`/coin/${c.id}`} key={c.id} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition">
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
                  <div className="font-semibold">
                    {currency === "INR" ? `₹${(c.current_price * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : formatUSD(c.current_price)}
                  </div>
                  <div className={`text-xs font-medium ${c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatPct(c.price_change_percentage_24h ?? 0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* How it works */}
      <section id="how" className="container py-20">
        <div className="text-center mb-14 max-w-2xl mx-auto space-y-3">
          <Badge variant="outline" className="border-secondary/40 text-secondary mb-2">Getting Started</Badge>
          <h2 className="text-3xl sm:text-5xl font-display font-bold">Trading in <span className="text-gradient">3 simple steps</span></h2>
          <p className="text-muted-foreground text-sm sm:text-base">Go from beginner to confident market participant with zero friction.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <GlassCard key={s.num} hover className="space-y-4 relative p-6">
              <div className="text-5xl font-display font-extrabold text-gradient opacity-90">{s.num}</div>
              <h3 className="font-semibold text-xl">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-primary/40 w-7 h-7" />
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {/* AI showcase */}
      <section className="container py-16">
        <GlassCard glow className="p-8 lg:p-14 grid lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
          <div className="space-y-5 relative">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
              <Sparkles className="w-3 h-3" /> Nova AI Copilot
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-display font-bold leading-tight">
              Crypto explained, <span className="text-gradient">in plain English</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Never feel lost in crypto again. Nova evaluates risk scores, explains price trends, and suggests tailored asset allocations — without financial jargon.
            </p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Objective risk ratings (Low / Medium / High)",
                "Instant portfolio diversification health checks",
                "Conversational market intelligence & news digests",
                "Automated order analysis & execution tips"
              ].map(x => (
                <li key={x} className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> <span>{x}</span></li>
              ))}
            </ul>
            <Button asChild size="lg" className="bg-gradient-neon text-background shadow-glow-primary font-semibold">
              <Link to="/dashboard">Try Nova AI Free <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {/* Interactive Chat Mockup */}
          <div className="relative">
            <GlassCard className="p-5 space-y-3.5 max-w-md ml-auto border-primary/30">
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center text-background shrink-0 font-bold text-xs">
                  AI
                </div>
                <div className="glass rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed">
                  Hi! I'm Nova. How can I assist your portfolio today?
                </div>
              </div>
              <div className="flex gap-2.5 justify-end">
                <div className="bg-gradient-neon text-background rounded-2xl px-3.5 py-2 text-sm font-medium">
                  Should I buy Ethereum at current prices?
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center text-background shrink-0 font-bold text-xs">
                  AI
                </div>
                <div className="glass rounded-2xl px-3.5 py-2.5 text-sm space-y-1.5 leading-relaxed">
                  <Badge variant="outline" className="border-emerald-400/40 text-emerald-400 mb-1 text-[10px]">Moderate Risk • Layer 1 Leader</Badge>
                  <div>ETH exhibits strong institutional accumulation. In your demo portfolio, a 15–20% allocation preserves healthy diversification.</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>
      </section>

      {/* PWA Mobile App Callout */}
      <section className="container py-12">
        <GlassCard className="p-8 lg:p-12 text-center relative overflow-hidden border-border/60">
          <div className="max-w-2xl mx-auto space-y-4">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Smartphone className="w-3.5 h-3.5 mr-1" /> Progressive Web App
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">
              Trade anytime, anywhere — <span className="text-gradient">on all devices</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Install CoinNova directly to your iPhone or Android home screen without waiting for App Store approvals. Full offline capabilities, instant price updates, and zero storage bloat.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={enterDemo} className="bg-gradient-neon text-background font-semibold shadow-glow-primary">
                Open App Now <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-20 max-w-3xl">
        <div className="text-center mb-10 space-y-2">
          <Badge variant="outline" className="border-primary/40 text-primary">Got Questions?</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Frequently asked questions</h2>
        </div>
        <GlassCard>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border-border/40">
                <AccordionTrigger className="text-left font-semibold text-sm sm:text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* Final CTA */}
      <section className="container py-20">
        <GlassCard glow className="p-12 lg:p-16 text-center relative overflow-hidden border-primary/40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative space-y-5">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold">
              Your {formatUSD(100000)} demo wallet <br /> is <span className="text-gradient">ready to trade</span>.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Practice trading with real order matching, ask Nova AI anything, and claim your $25 referral bonus today.
            </p>
            <div className="pt-2">
              <Button asChild size="lg" className="bg-gradient-neon text-background shadow-glow-primary h-12 px-8 font-semibold text-base">
                <Link to="/register">Create Free Account <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-10 bg-background/40 backdrop-blur-lg">
        <div className="container py-12 grid md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              CoinNova is an advanced digital asset trading platform and educational simulator. Powered by Nova AI, high-security 2FA, and real-time market data.
            </p>
            <div className="text-xs text-muted-foreground pt-2">
              🔒 Bank-grade 2FA & 6-digit Transaction PIN Protection.
            </div>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Platform</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition">Features</a></li>
              <li><a href="#markets" className="hover:text-foreground transition">Live Markets</a></li>
              <li><a href="#referrals" className="hover:text-foreground transition">Referral Rewards ($25)</a></li>
              <li><Link to="/market" className="hover:text-foreground transition">Market Screener</Link></li>
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
