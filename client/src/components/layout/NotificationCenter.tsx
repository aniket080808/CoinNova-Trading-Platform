import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDemo, type NotificationItem } from "@/store/demo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Trash2,
  ArrowLeftRight,
  TrendingUp,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  X,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "trade":
      return <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />;
    case "deposit":
      return <ArrowDownLeft className="w-3.5 h-3.5 text-sky-400" />;
    case "withdraw":
      return <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />;
    case "alert":
      return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
    case "security":
      return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
    case "system":
    default:
      return <Sparkles className="w-3.5 h-3.5 text-primary" />;
  }
}

function getIconBg(type: NotificationItem["type"]) {
  switch (type) {
    case "trade":
      return "bg-emerald-500/15 border-emerald-500/30";
    case "deposit":
      return "bg-sky-500/15 border-sky-500/30";
    case "withdraw":
      return "bg-violet-500/15 border-violet-500/30";
    case "alert":
      return "bg-amber-500/15 border-amber-500/30";
    case "security":
      return "bg-rose-500/15 border-rose-500/30";
    case "system":
    default:
      return "bg-primary/15 border-primary/30";
  }
}

export function NotificationCenter() {
  const {
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useDemo();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "trade" | "alert" | "system">("all");
  const navigate = useNavigate();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.read;
      if (filter === "trade") return n.type === "trade";
      if (filter === "alert") return n.type === "alert";
      if (filter === "system") return ["deposit", "withdraw", "security", "system"].includes(n.type);
      return true;
    });
  }, [notifications, filter]);

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      markNotificationRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all focus:outline-none"
          title="Notifications"
          aria-label="Open notifications"
        >
          <Bell className="w-5 h-5 transition-transform hover:scale-105 active:scale-95" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-background font-bold text-[10px] ring-2 ring-background animate-pulse-subtle">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] p-0 glass-strong border border-border/60 shadow-2xl rounded-2xl overflow-hidden z-50 text-foreground"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border/40 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight">Notifications</span>
            {unreadCount > 0 ? (
              <Badge className="bg-primary/20 text-primary hover:bg-primary/20 text-[10px] px-1.5 py-0 h-4 border-primary/30">
                {unreadCount} new
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                All caught up
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => clearNotifications()}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-1 overflow-x-auto scrollbar-hide text-xs border-b border-border/20">
          {(
            [
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "trade", label: "Trades" },
              { key: "alert", label: "Alerts" },
              { key: "system", label: "System" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={clsx(
                "px-2.5 py-1 rounded-lg font-medium transition text-[11px] whitespace-nowrap",
                filter === t.key
                  ? "bg-primary text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {t.label}
              {t.key === "unread" && unreadCount > 0 && (
                <span className="ml-1 text-[9px] font-bold">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/20 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center mx-auto text-muted-foreground">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <div className="text-xs font-semibold text-muted-foreground">No notifications</div>
              <p className="text-[11px] text-muted-foreground/60 max-w-[200px] mx-auto">
                {filter === "unread"
                  ? "You have read all notifications."
                  : "Trade orders, alerts, and system updates will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={clsx(
                  "p-3 flex items-start gap-3 transition-colors cursor-pointer group relative",
                  !n.read ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-white/[0.03]"
                )}
              >
                {/* Unread indicator pill */}
                {!n.read && (
                  <div className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-primary/30" />
                )}

                {/* Icon */}
                <div
                  className={clsx(
                    "w-8 h-8 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5",
                    getIconBg(n.type)
                  )}
                >
                  {getNotificationIcon(n.type)}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={clsx(
                        "text-xs leading-tight truncate",
                        !n.read ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {n.message}
                  </p>

                  {n.link && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary font-medium hover:underline">
                      <span>View details</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markNotificationRead(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-white/10"
                  title="Mark as read"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
