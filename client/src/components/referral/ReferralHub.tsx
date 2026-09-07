import { useState, useEffect } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Copy,
  CheckCircle2,
  Users,
  DollarSign,
  Clock,
  Loader2,
  Share2,
  MessageCircle,
  Send,
} from "lucide-react";
import { referralApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReferralHub() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = () => {
    setLoading(true);
    referralApi
      .stats()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const referralLink = data?.referralCode
    ? `${window.location.origin}/register?ref=${data.referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await referralApi.claim();
      toast.success(res.message);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "No rewards to claim");
    } finally {
      setClaiming(false);
    }
  };

  const shareUrl = encodeURIComponent(referralLink);
  const shareText = encodeURIComponent(
    `Join CoinNova and get $25 bonus! Use my referral code: ${data?.referralCode ?? ""}`
  );

  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Referral Program</h3>
      </div>

      <div className="text-sm text-muted-foreground">
        Invite friends and earn <span className="text-primary font-bold">$25</span> for every trader who joins!
      </div>

      {/* Referral Code & Link */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Referral Code</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 glass rounded-lg px-4 py-2.5 font-mono text-lg font-bold tracking-wider text-primary">
            {data?.referralCode ?? "—"}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn("glass transition-all", copied && "text-emerald-400 border-emerald-500/40")}
            onClick={handleCopy}
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Social share buttons */}
        <div className="flex gap-2">
          <a
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 glass rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 glass rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10 transition"
          >
            <Send className="w-3.5 h-3.5" /> Telegram
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 glass rounded-lg py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition"
          >
            <Share2 className="w-3.5 h-3.5" /> Twitter
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <Users className="w-4 h-4 mx-auto text-primary mb-1" />
          <div className="text-lg font-bold">{data?.totalReferred ?? 0}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Invited</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <DollarSign className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
          <div className="text-lg font-bold text-emerald-400">${(data?.totalEarned ?? 0).toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Earned</div>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 mx-auto text-amber-400 mb-1" />
          <div className="text-lg font-bold text-amber-400">${(data?.pendingRewards ?? 0).toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground uppercase">Pending</div>
        </div>
      </div>

      {/* Claim button */}
      {(data?.pendingRewards ?? 0) > 0 && (
        <Button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-neon text-background shadow-glow-primary"
        >
          {claiming ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Gift className="w-4 h-4 mr-2" />
          )}
          Claim ${(data?.pendingRewards ?? 0).toFixed(2)} Reward
        </Button>
      )}

      {/* Friends list */}
      {data?.friends && data.friends.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invited Friends</div>
          <div className="divide-y divide-border/30">
            {data.friends.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground">{f.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-primary">${f.reward}</div>
                  <div className={cn(
                    "text-[10px] font-medium uppercase",
                    f.claimed ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {f.claimed ? "Claimed" : f.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
