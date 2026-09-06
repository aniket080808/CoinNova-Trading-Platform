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
import { useEffect } from "react";
import {
  ArrowRight, Bot, Shield, GraduationCap, Wallet, TrendingUp, Bell,
  Sparkles, ChartLine, Zap, Lock, Star, Play, CheckCircle2
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";

const FEATURES = [
  { icon: Bot, title: "AI Trading Copilot", desc: "Nova AI explains coins, suggests portfolios and flags risk in plain English." },
  { icon: TrendingUp, title: "Live Markets", desc: "Real-time prices, charts and trends for thousands of coins via CoinGecko." },
  { icon: Wallet, title: "Smart Wallet", desc: "Buy, sell, transfer and withdraw — one tap, zero friction." },
  { icon: Shield, title: "2FA + Biometric", desc: "Multi-layer security with TOTP and device biometrics." },
  { icon: Bell, title: "Price Alerts", desc: "Never miss a move. Custom alerts on price, volume and P/L." },
];

const STEPS = [
  { num: "01", title: "Sign up in seconds", desc: "Email + 2FA. No paperwork." },
  { num: "02", title: "Start in Demo Mode", desc: "$100,000 practice cash. Trade risk-free." },
  { num: "03", title: "Go Live when ready", desc: "Add funds, place real trades, track gains." },
];

const FAQS = [
  { q: "Is CoinNova really free to try?", a: "Yes — Demo Mode gives you $100,000 in practice funds and full access to core features, with no card required." },
  { q: "How does the AI work?", a: "Nova uses Groq-powered LLMs to explain markets, score risk and suggest portfolios. It never gives financial advice — only education." },
  { q: "Where does price data come from?", a: "Live data via CoinGecko's free API, refreshed every 60s." },
  { q: "Is this a real exchange?", a: "CoinNova is a semester educational project. Live trading uses Stripe/Razorpay test mode for demonstration only." },
];

export default function Landing() {
  const { data: coins } = useMarkets(1);
  const { user, setMode } = useAuthStore();
  const { currency } = useCurrencyStore();
  const navigate = useNavigate();
  const top = (coins ?? []).slice(0, 6);
  const tickerCoins = (coins ?? []).slice(0, 12);

  // Removed auto-redirect to dashboard to allow seeing the landing page even if logged in

  const enterDemo = () => {
    setMode("demo");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBg />

      {/* Nav */}
      <header className="sticky top-0 z-40 glass-strong border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#markets" className="hover:text-foreground transition">Markets</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Login</Link></Button>
            <Button asChild className="bg-gradient-neon text-background hover:opacity-90 shadow-glow-primary">
              <Link to="/register">Get started <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-16 lg:pt-24 pb-12 relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6 animate-fade-up">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 gap-1.5 py-1 px-3">
              <Sparkles className="w-3 h-3" /> AI-powered crypto, built for beginners
            </Badge>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter leading-[1.05]">
              Trade smarter with{" "}
              <span className="text-gradient">Nova AI</span>{" "}
              by your side.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              CoinNova is the friendliest way to learn, practice and trade crypto.
              Live markets, AI insights, and a $100,000 demo wallet to start risk-free.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={enterDemo} size="lg" className="bg-gradient-neon text-background hover:opacity-90 shadow-glow-primary text-base h-12 px-6">
                Start with {formatUSD(100000)} Demo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 glass border-border/60">
                <Link to="/login"><Play className="w-4 h-4 mr-2" /> Login to trade</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> No card required</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 2FA + biometrics</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 10,000+ coins</span>
            </div>
          </div>

          {/* Hero card */}
          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <GlassCard className="p-5 space-y-4 shadow-elevated">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Demo Portfolio</div>
                <Badge className="bg-primary/15 text-primary border-0">+ 12.4% today</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total balance</div>
                <div className="text-4xl font-display font-bold">{formatUSD(112438.20)}</div>
              </div>
              <div className="space-y-2">
                {top.slice(0, 4).map((c) => (
                  <div key={c.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <img src={c.image} alt={c.name} className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.symbol.toUpperCase()}</div>
                    </div>
                    <div className="w-20 h-8">
                      {c.sparkline_in_7d?.price && (
                        <Sparkline data={c.sparkline_in_7d.price} color={c.price_change_percentage_24h >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} height={32} />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatUSD(c.current_price)}</div>
                      <div className={`text-xs ${c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatPct(c.price_change_percentage_24h ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Marquee ticker */}
      <section className="border-y border-border/40 glass overflow-hidden py-3">
        <div className="flex gap-8 animate-marquee whitespace-nowrap">
          {[...tickerCoins, ...tickerCoins].map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
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

      {/* Features */}
      <section id="features" className="container py-24">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-secondary/40 text-secondary bg-secondary/5 mb-4">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Everything you need to <span className="text-gradient">go from zero to crypto</span></h2>
          <p className="text-muted-foreground">One platform — markets, wallet, AI, learning, alerts and admin.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} hover className="space-y-3" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-12 h-12 rounded-xl bg-gradient-neon/20 border border-primary/30 flex items-center justify-center text-primary">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="container py-12">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <Badge variant="outline" className="border-primary/40 text-primary mb-2">Live</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Top markets right now</h2>
          </div>
          <Button asChild variant="outline" className="glass">
            <Link to="/market">View all <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
        <GlassCard className="p-0 overflow-hidden">
          <div className="divide-y divide-border/40">
            {top.map((c) => (
              <Link to={`/coin/${c.id}`} key={c.id} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition">
                <span className="text-xs text-muted-foreground w-6">#{c.market_cap_rank}</span>
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
                  <div className="font-semibold">{formatUSD(c.current_price)}</div>
                  <div className={`text-xs ${c.price_change_percentage_24h >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatPct(c.price_change_percentage_24h ?? 0)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* How it works */}
      <section id="how" className="container py-24">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-secondary/40 text-secondary mb-4">How it works</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Live in <span className="text-gradient">3 steps</span></h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <GlassCard key={s.num} hover className="space-y-3 relative">
              <div className="text-5xl font-display font-bold text-gradient opacity-90">{s.num}</div>
              <h3 className="font-semibold text-xl">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 text-primary/50" />
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      {/* AI showcase */}
      <section className="container py-16">
        <GlassCard glow className="p-10 lg:p-14 grid lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/30 blur-3xl rounded-full" />
          <div className="space-y-5 relative">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
              <Sparkles className="w-3 h-3" /> Nova AI
            </Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
              Crypto explained, <span className="text-gradient">in plain English</span>
            </h2>
            <p className="text-muted-foreground">Ask anything. Nova explains coins, scores risk, and suggests beginner-friendly portfolios — instantly.</p>
            <ul className="space-y-2 text-sm">
              {["Risk analysis (low / medium / high)", "Personalized investment suggestions", "Learn-by-asking Q&A", "Real-time market commentary"].map(x => (
                <li key={x} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {x}</li>
              ))}
            </ul>
            <Button asChild size="lg" className="bg-gradient-neon text-background shadow-glow-primary">
              <Link to="/dashboard">Try Nova free <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
          <div className="relative">
            <GlassCard className="p-4 space-y-3 max-w-md ml-auto">
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-neon flex items-center justify-center"><Bot className="w-4 h-4 text-background" /></div>
                <div className="glass rounded-2xl px-3 py-2 text-sm">Hi! I'm Nova. What do you want to learn today?</div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="bg-gradient-neon text-background rounded-2xl px-3 py-2 text-sm">Is Solana risky?</div>
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-neon flex items-center justify-center"><Bot className="w-4 h-4 text-background" /></div>
                <div className="glass rounded-2xl px-3 py-2 text-sm">
                  <Badge variant="outline" className="border-warning/40 text-warning mb-1">Medium risk</Badge>
                  <div>Solana has strong adoption but volatile price action. Good as 5–10% of a balanced crypto portfolio.</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-20 max-w-3xl">
        <h2 className="text-4xl font-display font-bold text-center mb-10">Frequently asked questions</h2>
        <GlassCard>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`f${i}`} className="border-border/40">
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <GlassCard glow className="p-12 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative space-y-5">
            <h2 className="text-4xl md:text-6xl font-display font-bold">Your {formatUSD(100000)} demo wallet <br /> is <span className="text-gradient">waiting</span>.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Practice trading risk-free, get AI insights, and graduate to real markets when you're ready.</p>
            <Button asChild size="lg" className="bg-gradient-neon text-background shadow-glow-primary h-12 px-8">
              <Link to="/register">Create free account <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-10">
        <div className="container py-10 grid md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm">AI-powered crypto platform — built for beginners. Educational project, not financial advice.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#markets" className="hover:text-foreground">Markets</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Account</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
              <li><Link to="/register" className="hover:text-foreground">Register</Link></li>
              <li><Link to="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="container py-5 border-t border-border/40 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CoinNova — Built with neon dreams.
        </div>
      </footer>
    </div>
  );
}
