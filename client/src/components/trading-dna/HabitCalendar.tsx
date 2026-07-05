import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format, subDays, isSameDay } from "date-fns";
import { useMemo } from "react";

interface HistoryData {
  timestamp: string;
  behaviorScore: number;
}

export function HabitCalendar({ history }: { history: HistoryData[] }) {
  const days = useMemo(() => {
    const today = new Date();
    // 90 days grid
    return Array.from({ length: 90 }).map((_, i) => {
      const date = subDays(today, 89 - i);
      const record = history.find(h => isSameDay(new Date(h.timestamp), date));
      return {
        date,
        score: record?.behaviorScore ?? null,
      };
    });
  }, [history]);

  const getColor = (score: number | null) => {
    if (score === null) return "bg-white/5 border border-white/5";
    if (score >= 90) return "bg-primary border border-primary/20 shadow-glow-primary/20";
    if (score >= 70) return "bg-primary/70 border border-primary/20";
    if (score >= 50) return "bg-primary/40 border border-primary/20";
    return "bg-destructive/60 border border-destructive/20";
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        <TooltipProvider delayDuration={100}>
          {days.map((day, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className={`w-3.5 h-3.5 rounded-[3px] transition-all hover:scale-110 cursor-pointer ${getColor(day.score)}`} />
              </TooltipTrigger>
              <TooltipContent className="bg-background/95 border-border/50 text-xs backdrop-blur-xl">
                <div className="font-semibold">{format(day.date, "MMM d, yyyy")}</div>
                {day.score !== null ? (
                  <div className="text-primary mt-1">Score: {day.score}/100</div>
                ) : (
                  <div className="text-muted-foreground mt-1">No trading activity</div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2">
        <span>Less discipline</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-white/5" />
          <div className="w-3 h-3 rounded-sm bg-destructive/60" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/70" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
        </div>
        <span>More discipline</span>
      </div>
    </div>
  );
}
