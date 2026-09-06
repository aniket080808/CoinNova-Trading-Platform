import { useState, useEffect } from "react";
import { useNews } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ExternalLink, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BreakingNewsTicker() {
  const { data } = useNews(undefined, undefined, 10);
  const newsList = data?.news?.slice(0, 8) || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!newsList.length || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsList.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [newsList.length, isPaused]);

  if (!newsList.length) return null;

  const current = newsList[currentIndex];
  if (!current) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background/40 to-primary/5 p-2 backdrop-blur-md"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-3 text-xs">
        {/* Pulsing Breaking Tag */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 font-bold tracking-wider text-[10px] uppercase shrink-0 border border-red-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <Zap className="w-3 h-3 fill-red-400 text-red-400" />
          <span>Live Wire</span>
        </div>

        {/* Animated Headline Item */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id || currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5 truncate"
            >
              {/* Sentiment pill */}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 border ${
                  current.sentiment === "bullish"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : current.sentiment === "bearish"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-secondary/60 text-muted-foreground border-border/40"
                }`}
              >
                {current.sentiment === "bullish" && <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />}
                {current.sentiment === "bearish" && <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />}
                {current.sentiment.toUpperCase()}
              </span>

              {/* Source */}
              <span className="text-muted-foreground text-[11px] font-medium shrink-0">
                [{current.source}]
              </span>

              {/* Title & Link */}
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors truncate flex items-center gap-1 group"
              >
                <span className="truncate">{current.title}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          <span className="text-[10px] mr-1 hidden sm:inline">
            {currentIndex + 1} / {newsList.length}
          </span>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + newsList.length) % newsList.length)}
            aria-label="Previous headline"
            className="p-1 rounded hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % newsList.length)}
            aria-label="Next headline"
            className="p-1 rounded hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
