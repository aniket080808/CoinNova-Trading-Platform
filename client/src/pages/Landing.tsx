import { Logo } from "@/components/glass/Logo";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBg } from "@/components/glass/AuroraBg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMarkets } from "@/lib/coingecko";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatUSD, formatPct } from "@/store/demo";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowRight, Bot, Shield, GraduationCap, Wallet, TrendingUp, Bell,
  Sparkles, Play, CheckCircle2, BookOpen, BrainCircuit, Activity
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";

const FEATURES = [
  { icon: Bot, title: "Nova AI Copilot", desc: "Understand coins, review portfolio risk and get plain-English trade guidance from the built-in AI assistant." },
  { icon: TrendingUp, title: "Live Markets", desc: "Track live coin prices, market caps, sparkline movement and detailed charts from CoinGecko." },
  { icon: Wallet, title: "Demo Wallet + Real Flow", desc: "Practice with a $100,000 demo balance, then move through deposit, transfer, withdraw and trade flows." },
  { icon: Shield, title: "Security First", desc: "Protect accounts with email verification, OTP, 2FA and transaction PIN workflows." },
  { icon: Bell, title: "Smart Alerts", desc: "Create custom price and movement alerts so you never miss a key market moment." },
  { icon: GraduationCap, title: "Learning Loop", desc: "Use journaling, replay mode and behavioral insights to improve every trading decision." },
];

const MODULES = [
  { title: "Market Explorer", desc: "Browse top coins, compare chart performance and drill into coin-specific details.", href: "/market" },
  { title: "Portfolio Health", desc: "Track allocations, concentration and stability with built-in health insights.", href: "/portfolio" },
  { title: "Wallet Center", desc: "Deposit, withdraw, transfer funds and review recent transactions in one place.", href: "/wallet" },
  { title: "Replay Mode", desc: "Practice across market histories and compare outcomes against buy-and-hold strategies.", href: "/replay" },
  { title: "Trading Journal", desc: "Document your trade reasoning and review your performance with AI summaries.", href: "/journal" },
  { title: "Trading DNA", desc: "Analyze your behavioral patterns and learn how your habits influence results.", href: "/trading-dna" },
];

const STEPS = [
  { num: "01", title: "Create your account", desc: "Sign up, verify your email and secure your wallet with 2FA or PIN protection." },
  { num: "02", title: "Open demo mode", desc: "Start with a $100,000 virtual balance and explore live prices without risking real funds." },
  { num: "03", title: "Practice, analyze, repeat", desc: "Watchlists, alerts, portfolio scores, replay sessions and journal insights help you grow." },
  { num: "04", title: "Go live when ready", desc: "Use the same workflow for wallet actions and trading once you are comfortable." },
];

const FAQS = [
  { q: "Is CoinNova free to try?", a: "Yes. Demo Mode gives you a $100,000 practice wallet and access to the core trading, analysis and AI features without a card." },
  { q: "How does the AI help beginners?", a: "Nova explains what a coin does, flags risk, offers portfolio suggestions and translates market movements into easy-to-follow guidance." },
  { q: "Where does the market data come from?", a: "CoinNova uses CoinGecko market APIs for live prices, charts and market snapshots, refreshed in the app experience." },
  { q: "Is this a real exchange?", a: "No. This is an educational trading platform prototype built for practice, learning and demo flows, with test-mode payment actions." },
  { q: "Can I track my trading behavior?", a: "Yes. The platform includes a journal, replay simulator and Trading DNA analysis to help you reflect on habits and decision patterns." },
];

export default function Landing() {
  const { data: coins } = useMarkets(1);
  const { setMode } = useAuthStore();
  const navigate = useNavigate();
  const top = (coins ?? []).slice(0, 6);
  const tickerCoins = (coins ?? []).slice(0, 12);

  const enterDemo = () => {
    setMode("demo");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <AuroraBg />

      <header className="sticky top-0 z-40 glass-strong border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#markets" className="hover:text-foreground transition">Markets</a>
            <a href="#how" className="hover:text-foreground transition">How to use</a>
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

      <section className="container pt-16 lg:pt-24 pb-12 relative">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6 animate-fade-up">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 gap-1.5 py-1 px-3">
              <Sparkles className="w-3 h-3" /> AI-powered crypto education and practice platform
            </Badge>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter leading-[1.05]">
              Learn, practice and trade with <span className="text-gradient">Nova AI</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              CoinNova combines live market data, a demo wallet, AI analysis, alerts, replay simulations and behavioral feedback in one beginner-friendly experience.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={enterDemo} size="lg" className="bg-gradient-neon text-background hover:opacity-90 shadow-glow-primary text-base h-12 px-6">
                Start with {formatUSD(100000)} demo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 glass border-border/60">
                <Link to="/login"><Play className="w-4 h-4 mr-2" /> Open your workspace</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Demo trading ready</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Secure sign-in flow</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Built for learning</span>
            </div>
          </div>

          <div className="lg:col-span-5 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <GlassCard className="p-5 space-y-4 shadow-elevated">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Demo portfolio snapshot</div>
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

      <section className="container py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { title: "Live market coverage", text: "Explore coins with charts, pricing and market context." },
            { title: "AI guidance", text: "Use Nova to get quick explanations and risk framing." },
            { title: "Practice-first workflow", text: "Build confidence with demo funds before going live." },
            { title: "Behavioral reflection", text: "Review your actions with journaling and Trading DNA analysis." },
          ].map((item) => (
            <GlassCard key={item.title} className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-neon/20 border border-primary/30 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="features" className="container py-20">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-secondary/40 text-secondary bg-secondary/5 mb-4">Core features</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Every part of the platform is designed to help you learn faster</h2>
          <p className="text-muted-foreground">From discovery to execution and review, CoinNova brings the full trading loop into one experience.</p>
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

      <section id="markets" className="container py-12">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <Badge variant="outline" className="border-primary/40 text-primary mb-2">Live market overview</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Explore the market from a single place</h2>
          </div>
          <Button asChild variant="outline" className="glass">
            <Link to="/market">Open market view <ArrowRight className="w-4 h-4 ml-1" /></Link>
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

      <section className="container py-20">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">Explore the app</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">A full toolkit for market learning and trading practice</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.map((module) => (
            <GlassCard key={module.title} hover className="space-y-3">
              <h3 className="font-semibold text-lg">{module.title}</h3>
              <p className="text-sm text-muted-foreground">{module.desc}</p>
              <Button asChild variant="ghost" className="px-0 h-auto text-primary">
                <Link to={module.href}>Open section <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </GlassCard>
          ))}
        </div>
      </section>

      <section id="how" className="container py-24">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <Badge variant="outline" className="border-secondary/40 text-secondary mb-4">How to use CoinNova</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Start simple and level up as you learn</h2>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {STEPS.map((s, i) => (
            <GlassCard key={s.num} hover className="space-y-3 relative">
              <div className="text-5xl font-display font-bold text-gradient opacity-90">{s.num}</div>
              <h3 className="font-semibold text-xl">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <ArrowRight className="hidden xl:block absolute -right-4 top-1/2 text-primary/50" />
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <GlassCard glow className="p-10 lg:p-14 grid lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/30 blur-3xl rounded-full" />
          <div className="space-y-5 relative">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
              <Sparkles className="w-3 h-3" /> Nova AI
            </Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
              From market questions to trade reflection, <span className="text-gradient">everything stays connected</span>
            </h2>
            <p className="text-muted-foreground">Ask about a coin, study your portfolio health, review your trades and reflect on your habits — all inside one guided workflow.</p>
            <ul className="space-y-2 text-sm">
              {[
                "Risk and portfolio guidance",
                "Beginner-friendly explanations",
                "Journal and replay-based learning",
                "Actionable next steps for improvement"
              ].map((x) => (
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
                <div className="glass rounded-2xl px-3 py-2 text-sm">Hi! I can explain a coin, review your portfolio, or help you study your recent trades.</div>
              </div>
              <div className="flex gap-2 justify-end">
                <div className="bg-gradient-neon text-background rounded-2xl px-3 py-2 text-sm">Show me my portfolio health.</div>
              </div>
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-neon flex items-center justify-center"><Bot className="w-4 h-4 text-background" /></div>
                <div className="glass rounded-2xl px-3 py-2 text-sm">
                  <Badge variant="outline" className="border-warning/40 text-warning mb-1">Balanced</Badge>
                  <div>Your position mix looks diversified, but a few concentrated holdings may need closer review.</div>
                </div>
              </div>
            </GlassCard>
          </div>
        </GlassCard>
      </section>

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

      <section className="container py-20">
        <GlassCard glow className="p-12 lg:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative space-y-5">
            <h2 className="text-4xl md:text-6xl font-display font-bold">Your {formatUSD(100000)} demo wallet <br /> is <span className="text-gradient">waiting</span>.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Practice with live markets, learn from AI feedback and build your confidence before you move into real-world trading.</p>
            <Button asChild size="lg" className="bg-gradient-neon text-background shadow-glow-primary h-12 px-8">
              <Link to="/register">Create free account <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </GlassCard>
      </section>

      <footer className="border-t border-border/40 mt-10">
        <div className="container py-10 grid md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <Logo />
            <p className="text-sm text-muted-foreground max-w-sm">CoinNova is an AI-powered crypto learning and practice platform for beginners, built as an educational project.</p>
          </div>
          <div>
            <div className="font-semibold mb-3">Explore</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#markets" className="hover:text-foreground">Markets</a></li>
              <li><a href="#how" className="hover:text-foreground">How to use</a></li>
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
