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
              if (parsed.content) {
                assistantContent += parsed.content;
                setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: assistantContent }]);
              }
            } catch { /* skip unparseable chunks */ }
          }
        }
      }
    } catch {
      // Fallback to non-streaming or mock if API fails
      try {
        const res = await aiApi.chat(newMsgs, contextStr);
        setMsgs((m) => [...m, { role: "assistant", content: res.reply }]);
      } catch (err: any) {
        setMsgs((m) => [...m, { role: "assistant", content: "Sorry, I couldn't reach the AI service right now. Please try again later." }]);
      }
    }

    setLoading(false);
  };

  return (
    <>
      <button
        onClick={handleOpenToggle}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-neon shadow-glow-primary flex items-center justify-center text-background hover:scale-110 transition-transform animate-pulse-glow"
        aria-label="Open AI chat"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {open && (
        <GlassCard className="fixed bottom-24 right-6 w-[22rem] max-w-[calc(100vw-3rem)] h-[32rem] z-50 flex flex-col p-0 overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2 bg-gradient-card">
            <div className="w-8 h-8 rounded-lg bg-gradient-neon flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <div>
              <div className="font-semibold text-sm">Nova AI</div>
              <div className="text-[10px] text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {mode === "live" ? "Powered by Groq" : "Demo mode"}
              </div>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-gradient-neon text-background" : "glass"
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
              <div className="glass rounded-2xl px-3 py-2 text-sm w-fit">
                <span className="animate-pulse">Nova is thinking…</span>
              </div>
            )}
            {msgs.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-xs glass rounded-full px-3 py-1 hover:bg-primary/10 transition">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border/40 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Nova…"
              className="flex-1 bg-muted/40 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/60"
            />
            <Button size="icon" onClick={() => send()} disabled={loading} className="bg-gradient-neon text-background hover:opacity-90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>
      )}
    </>
  );
};
