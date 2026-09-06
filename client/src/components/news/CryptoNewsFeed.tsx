import { useState, useMemo } from "react";
import { useNews, CryptoNewsItem } from "@/lib/coingecko";
import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Search,
  RefreshCw,
  Newspaper,
  Flame,
  Filter,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface CryptoNewsFeedProps {
  coinSymbol?: string;
  coinName?: string;
  compact?: boolean;
  limit?: number;
}

const POPULAR_COINS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK"];

export function CryptoNewsFeed({
  coinSymbol,
  coinName,
  compact = false,
  limit = 30,
}: CryptoNewsFeedProps) {
  const [selectedSentiment, setSelectedSentiment] = useState<"all" | "bullish" | "bearish">("all");
  const [selectedCoin, setSelectedCoin] = useState<string>(coinSymbol ? coinSymbol.toUpperCase() : "all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeCoinFilter = coinSymbol ? coinSymbol.toLowerCase() : selectedCoin !== "all" ? selectedCoin.toLowerCase() : undefined;
  const activeSentimentFilter = selectedSentiment !== "all" ? selectedSentiment : undefined;

  const { data, isLoading, isError, refetch, isFetching } = useNews(
    activeCoinFilter,
    activeSentimentFilter,
    limit
  );

  const articles = useMemo(() => {
    if (!data?.news) return [];
    if (!searchQuery.trim()) return data.news;
    const q = searchQuery.toLowerCase();
    return data.news.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.relatedCoins.some((c) => c.toLowerCase().includes(q))
    );
  }, [data?.news, searchQuery]);

  const sentiment = data?.sentimentSummary || { bullish: 0, bearish: 0, neutral: 0 };
  const totalSentiment = sentiment.bullish + sentiment.bearish + sentiment.neutral || 1;
  const bullishPct = Math.round((sentiment.bullish / totalSentiment) * 100);
  const bearishPct = Math.round((sentiment.bearish / totalSentiment) * 100);
  const neutralPct = 100 - bullishPct - bearishPct;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      {!compact && (
        <div className="space-y-3">
          {/* Sentiment Gauge Bar */}
          <GlassCard className="p-4 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Newspaper className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Crypto Market Sentiment
                    <span className="text-xs font-normal text-muted-foreground">
                      ({data?.total || 0} recent stories analyzed)
                    </span>
                  </h3>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Sentiment Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> {bullishPct}% Bullish ({sentiment.bullish})
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" /> {neutralPct}% Neutral ({sentiment.neutral})
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> {bearishPct}% Bearish ({sentiment.bearish})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/60 flex overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: `${bullishPct}%` }}
                />
                <div
                  className="h-full bg-slate-500/50 transition-all duration-500"
                  style={{ width: `${neutralPct}%` }}
                />
                <div
                  className="h-full bg-rose-500 transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                  style={{ width: `${bearishPct}%` }}
                />
              </div>
            </div>
          </GlassCard>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            {/* Sentiment Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/40 border border-border/30 overflow-x-auto">
              <button
                onClick={() => setSelectedSentiment("all")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  selectedSentiment === "all"
                    ? "bg-primary text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All News
              </button>
              <button
                onClick={() => setSelectedSentiment("bullish")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                  selectedSentiment === "bullish"
                    ? "bg-emerald-500 text-slate-950 font-semibold shadow-sm"
                    : "text-emerald-400/80 hover:text-emerald-400"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                Bullish
              </button>
              <button
                onClick={() => setSelectedSentiment("bearish")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                  selectedSentiment === "bearish"
                    ? "bg-rose-500 text-slate-950 font-semibold shadow-sm"
                    : "text-rose-400/80 hover:text-rose-400"
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                Bearish
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search headlines or tickers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-secondary/30 border-border/40 focus-visible:ring-primary/40 rounded-xl"
              />
            </div>
          </div>

          {/* Quick Coin Filter Pills (if not on coin detail page) */}
          {!coinSymbol && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-semibold mr-1 shrink-0">
                Tickers:
              </span>
              <button
                onClick={() => setSelectedCoin("all")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  selectedCoin === "all"
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground border border-border/20"
                }`}
              >
                All
              </button>
              {POPULAR_COINS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setSelectedCoin(sym === selectedCoin ? "all" : sym)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                    selectedCoin === sym
                      ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                      : "bg-secondary/40 text-muted-foreground hover:text-foreground border border-border/20"
                  }`}
                >
                  ${sym}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Fetching live crypto feed...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <GlassCard className="p-6 text-center space-y-2">
          <p className="text-sm text-destructive">Failed to load crypto news feed.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && !isError && articles.length === 0 && (
        <GlassCard className="p-8 text-center space-y-2">
          <Newspaper className="w-8 h-8 text-muted-foreground/50 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            No news articles found for current filter.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedSentiment("all");
              setSelectedCoin("all");
              setSearchQuery("");
            }}
            className="text-xs text-primary"
          >
            Reset filters
          </Button>
        </GlassCard>
      )}

      {/* News Card Grid */}
      {!isLoading && !isError && articles.length > 0 && (
        <div
          className={
            compact
              ? "space-y-3"
              : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          }
        >
          <AnimatePresence>
            {articles.map((item, idx) => (
              <NewsCard key={item.id || idx} item={item} compact={compact} idx={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function NewsCard({
  item,
  compact,
  idx,
}: {
  item: CryptoNewsItem;
  compact: boolean;
  idx: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const sentimentBadge = {
    bullish: {
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      icon: TrendingUp,
      label: "Bullish",
    },
    bearish: {
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
      icon: TrendingDown,
      label: "Bearish",
    },
    neutral: {
      bg: "bg-secondary/60 border-border/40 text-muted-foreground",
      icon: Minus,
      label: "Neutral",
    },
  }[item.sentiment];

  const Icon = sentimentBadge.icon;

  if (compact) {
    return (
      <motion.a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx < 10 ? idx * 0.03 : 0 }}
        className="block group"
      >
        <GlassCard className="p-3 hover:border-primary/40 transition-all hover:bg-primary/5 flex items-start gap-3">
          {!imgFailed && item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              onError={() => setImgFailed(true)}
              className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border/40"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-semibold text-primary/80">
                {item.source}
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(item.publishedAt)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${sentimentBadge.bg}`}
              >
                <Icon className="w-2.5 h-2.5" />
                {sentimentBadge.label}
              </span>
            </div>
            <h4 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {item.title}
            </h4>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors mt-0.5" />
        </GlassCard>
      </motion.a>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx < 15 ? idx * 0.03 : 0 }}
      className="flex flex-col h-full"
    >
      <GlassCard className="p-0 overflow-hidden flex flex-col h-full group hover:border-primary/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
        {/* Cover Image */}
        <div className="relative h-40 w-full overflow-hidden bg-secondary/30">
          {!imgFailed && item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/30">
              <Newspaper className="w-10 h-10 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

          {/* Sentiment Badge on Top */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border backdrop-blur-md font-semibold ${sentimentBadge.bg}`}
            >
              <Icon className="w-3 h-3" />
              {sentimentBadge.label}
            </span>
          </div>

          {/* Source & Time */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span className="text-foreground/90 font-semibold bg-background/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
              {item.source}
            </span>
            <span className="flex items-center gap-1 bg-background/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px]">
              <Clock className="w-2.5 h-2.5" />
              {formatTimeAgo(item.publishedAt)}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group/link"
            >
              <h3 className="text-sm font-semibold text-foreground group-hover/link:text-primary transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h3>
            </a>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Footer: Coins tags & Read More link */}
          <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {item.relatedCoins.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20"
                >
                  ${c}
                </span>
              ))}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline shrink-0"
            >
              Read Article
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
