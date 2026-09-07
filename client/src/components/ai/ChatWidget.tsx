import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDemo, formatUSD } from "@/store/demo";
import { aiApi } from "@/lib/api";
import { usePrices } from "@/lib/binance";
import { useMarkets } from "@/lib/coingecko";
import ReactMarkdown from "react-markdown";

interface Msg { role: "user" | "assistant"; content: string; }

export const NovaAIIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z"
      fill="currentColor"
    />
    <circle cx="12" cy="11" r="2.2" fill="#070d18" />
    <circle cx="18" cy="4.5" r="1.4" fill="currentColor" opacity="0.9" />
    <circle cx="6" cy="18" r="1.2" fill="currentColor" opacity="0.7" />
  </svg>
);

import React from "react";
class ErrorBoundary extends React.Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div className="text-red-500 text-xs">ReactMarkdown Error: {this.state.error?.message || String(this.state.error)}</div>;
    return this.props.children;
  }
}

const SUGGESTIONS = [
  "Explain Bitcoin like I'm 5",
  "Is Ethereum risky right now?",
  "What is staking?",
  "Suggest a beginner portfolio",
];

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm **Nova** ✨ — your crypto AI assistant. Ask me anything about coins, strategies or terms." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { mode, walletUSD, holdings, user } = useDemo();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { prices } = usePrices();
  const { data: markets = [] } = useMarkets(1);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  const handleOpenToggle = () => {
    if (!user) {
      toast.error("Please create an account and log in to use Nova AI Chat");
      return;
    }
    setOpen((v) => !v);
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    const userMsg: Msg = { role: "user", content: q };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);

    const portfolio = holdings.map(h => `${h.symbol.toUpperCase()}: ${h.amount} (Avg $${h.avgPrice.toFixed(2)})`).join(", ");
    const livePrices = markets.slice(0, 5).map(m => `${m.symbol.toUpperCase()}: $${prices[m.symbol.toLowerCase()] || m.current_price}`).join(", ");
    const contextStr = `Wallet Balance: ${formatUSD(walletUSD)}\nMode: ${mode}\nHoldings: ${portfolio || "None"}\nTop Market Prices: ${livePrices}`;

    try {
      // Try SSE streaming first
      const stream = await aiApi.chatStream(newMsgs.filter(m => m.role === "user" || m.role === "assistant"), contextStr);
      if (stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        setMsgs((m) => [...m, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                assistantContent += parsed.content;
                setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: assistantContent }]);
              }
            } catch (err: any) {
              if (err.message && !err.message.includes("JSON")) {
                throw err;
              }
            }
          }
        }

        if (!assistantContent.trim()) {
          throw new Error("Stream returned empty response");
        }
      }
    } catch {
      // Fallback to non-streaming or mock if API fails
      try {
        const res = await aiApi.chat(newMsgs, contextStr);
        setMsgs((m) => {
          const filtered = m.filter(msg => msg.role !== "assistant" || msg.content.trim().length > 0);
          return [...filtered, { role: "assistant", content: res.reply }];
        });
      } catch (err: any) {
        setMsgs((m) => {
          const filtered = m.filter(msg => msg.role !== "assistant" || msg.content.trim().length > 0);
          return [...filtered, { role: "assistant", content: "Sorry, I couldn't reach the AI service right now. Please try again later." }];
        });
      }
    }

    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpenToggle}
        className={cn(
          "fixed bottom-6 right-6 z-50 group flex items-center justify-center transition-all duration-300 select-none",
          open ? "rotate-90" : "hover:scale-105"
        )}
        aria-label="Open Nova AI assistant"
      >
        {/* Ambient Outer Aura Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-violet-600 blur-md opacity-70 group-hover:opacity-100 group-hover:blur-lg transition-all animate-pulse" />
        
        {/* Core Glowing Orb */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 p-[2px] shadow-glow-primary">
          <div className="w-full h-full rounded-full bg-[#070d18]/90 backdrop-blur-md flex items-center justify-center text-white transition-colors group-hover:bg-[#070d18]/75">
            {open ? (
              <X className="w-6 h-6 text-white transition-transform" />
            ) : (
              <div className="relative flex items-center justify-center">
                <NovaAIIcon className="w-7 h-7 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                {/* Micro Online Dot */}
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070d18] animate-ping" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070d18]" />
              </div>
            )}
          </div>
        </div>

        {/* Hover Tooltip Pill */}
        {!open && (
          <span className="absolute right-16 px-3 py-1 rounded-full glass border border-white/10 text-xs font-semibold text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Ask Nova AI
          </span>
        )}
      </button>

      {open && (
        <GlassCard className="fixed bottom-24 right-6 w-[22rem] max-w-[calc(100vw-3rem)] h-[32rem] z-50 flex flex-col p-0 overflow-hidden animate-scale-in border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl rounded-2xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-card/80 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-violet-600 p-[1.5px] shadow-glow-primary/30">
                <div className="w-full h-full rounded-[10px] bg-[#070d18] flex items-center justify-center">
                  <NovaAIIcon className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div>
                <div className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Nova AI
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {mode === "live" ? "Powered by Groq Llama 3" : "Demo Intelligence"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {msgs.filter(m => m.content && m.content.trim().length > 0).map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-gradient-neon text-background font-medium shadow-sm"
                    : "glass border border-white/10 shadow-sm"
                )}>
                  {m.role === "assistant" ? (
                    <ErrorBoundary>
                      <div className="prose prose-sm prose-invert max-w-none [&>p]:my-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </ErrorBoundary>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="glass rounded-2xl px-3.5 py-2 text-sm w-fit border border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-muted-foreground">Nova is thinking…</span>
              </div>
            )}
            {msgs.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-xs glass rounded-full px-3 py-1 hover:bg-primary/10 transition border border-white/5">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-white/10 flex gap-2 bg-card/60 backdrop-blur-md">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Nova AI anything…"
              className="flex-1 bg-muted/40 rounded-xl px-3.5 py-2 text-sm outline-none border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/40 transition"
            />
            <Button size="icon" onClick={() => send()} disabled={loading} className="bg-gradient-neon text-background hover:opacity-90 rounded-xl shadow-glow-primary">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>
      )}
    </>
  );
};
