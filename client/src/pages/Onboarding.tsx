import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBg } from "@/components/glass/AuroraBg";
import { Logo } from "@/components/glass/Logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Wallet, TrendingUp, Bot, GraduationCap, Bell, ArrowRight, CheckCircle2 } from "lucide-react";
import { useDemo } from "@/store/demo";

const STEPS = [
  { icon: Wallet, title: "$100,000 demo wallet", desc: "Pre-loaded so you can practice every feature." },
  { icon: TrendingUp, title: "Buy & sell coins", desc: "One-tap trades from market or coin detail page." },
  { icon: Bot, title: "Ask Nova AI", desc: "Tap the green button anywhere for AI insights." },
  { icon: Bell, title: "Set alerts", desc: "Get notified when prices hit your targets." },
  { icon: GraduationCap, title: "Learn & quiz", desc: "Bite-sized lessons in the Learn section." },
];

export default function Onboarding() {
  const { setOnboarded } = useDemo();
  const navigate = useNavigate();
  const start = () => { setOnboarded(true); navigate("/dashboard"); };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10">
      <AuroraBg />
      <div className="absolute top-6 left-6"><Logo /></div>

      <div className="max-w-3xl w-full space-y-6 animate-fade-up">
        <div className="text-center space-y-2">
          <Sparkles className="w-10 h-10 text-primary mx-auto animate-pulse-glow" />
          <h1 className="text-4xl md:text-5xl font-display font-bold">Welcome to <span className="text-gradient">CoinNova</span></h1>
          <p className="text-muted-foreground">Here's a 30-second tour of what you can do.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {STEPS.map((s, i) => (
            <GlassCard key={s.title} hover className="flex gap-4 items-start" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="w-10 h-10 rounded-xl bg-gradient-neon/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2">{s.title} <CheckCircle2 className="w-4 h-4 text-primary" /></div>
                <div className="text-sm text-muted-foreground">{s.desc}</div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={start} size="lg" className="bg-gradient-neon text-background shadow-glow-primary h-12 px-8">
            Enter dashboard <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
