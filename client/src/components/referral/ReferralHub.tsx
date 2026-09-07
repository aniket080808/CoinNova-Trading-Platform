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
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { referralApi } from "@/lib/api";
import { useDemo } from "@/store/demo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReferralHub() {
  const { user, syncAll } = useDemo();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = () => {
    setLoading(true);
    referralApi
      .stats()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Failed to load referral stats:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute clean, reliable referral code derived from user name or email if server hasn't loaded yet
  const fallbackCode = user
    ? `${(user.name || user.email.split("@")[0] || "NOVA")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)}-${(user.id || "2026").slice(0, 4).toUpperCase()}`
    : "COINNOVA";

  const referralCode = data?.referralCode || fallbackCode;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

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
      toast.success(res.message || "Referral reward claimed successfully!");
      await syncAll();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "No rewards to claim");
    } finally {
      setClaiming(false);
    }
  };

  const shareText = `Trade smarter on CoinNova! Sign up with my link to get a $25 bonus on your account.`;
  const shareUrl = encodeURIComponent(referralLink);
  const encodedText = encodeURIComponent(shareText);

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(`${shareText}\n${referralLink}`).then(() => {
      toast.success("Link & caption copied! Paste it into your Instagram Story or Bio.");
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    });
  };

  if (loading && !data) {
    return (
      <GlassCard className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </GlassCard>
    );
  }

  const invitedCount = data?.totalReferred ?? 0;
  const earnedAmount = data?.totalEarned ?? 0;
  const pendingAmount = data?.pendingRewards ?? 0;

  return (
    <GlassCard className="space-y-5 border border-primary/20 bg-gradient-to-b from-card/60 to-background/90 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-glow-primary">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
              Referral Program
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                $25 Per Friend
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Share your link. When a friend joins CoinNova, you both earn rewards.
            </p>
          </div>
        </div>

        {pendingAmount > 0 && (
          <Button
            onClick={handleClaim}
            disabled={claiming}
            size="sm"
            className="bg-gradient-neon text-background shadow-glow-primary font-bold text-xs"
          >
            {claiming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Claim ${pendingAmount.toFixed(2)}
          </Button>
        )}
      </div>

      {/* Referral Code & Share Link */}
      <div className="glass rounded-xl p-4 space-y-3.5 border border-white/5 bg-background/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Your Unique Referral Code
          </span>
          <span className="text-[11px] text-primary/80 font-medium">Click copy to share link</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 glass rounded-lg px-4 py-2.5 font-mono text-base sm:text-lg font-black tracking-widest text-primary border border-primary/20 select-all">
            {referralCode}
          </div>
          <Button
            variant="outline"
            size="default"
            className={cn(
              "glass px-4 transition-all gap-1.5 font-semibold text-xs",
              copied ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" : "hover:bg-primary/10 hover:text-primary"
            )}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </Button>
        </div>

        {/* Social Share Buttons: WhatsApp, Telegram, Meta / Facebook, Instagram, Twitter */}
        <div className="pt-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Share on Social Media
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodedText}%20${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.97.549 1.831.849 2.807.85h.001c3.179 0 5.766-2.587 5.767-5.766.002-3.181-2.585-5.766-5.779-5.766zm3.374 8.163c-.144.405-.837.774-1.17.823-.312.045-.694.073-1.996-.465-1.579-.652-2.597-2.273-2.678-2.381-.081-.108-.646-.861-.646-1.642 0-.78.409-1.164.553-1.326.145-.162.316-.203.421-.203.104 0 .209.002.301.006.096.004.225-.036.352.268.13.312.446 1.087.485 1.167.04.08.066.174.013.28-.053.107-.079.174-.158.267-.08.093-.167.208-.239.28-.08.08-.163.167-.07.327.094.161.417.688.895 1.114.615.549 1.133.72 1.294.8.161.08.256.07.351-.04.095-.11.408-.475.518-.638.109-.163.22-.136.369-.081.149.054.945.446 1.108.527.162.081.27.121.31.189.039.068.039.394-.105.799z" />
              </svg>
              WhatsApp
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${shareUrl}&text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/15 border border-sky-500/20 transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z" />
              </svg>
              Telegram
            </a>

            {/* Meta / Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/15 border border-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </a>

            {/* Instagram */}
            <button
              type="button"
              onClick={handleInstagramShare}
              className="glass rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-pink-400 hover:bg-pink-500/15 border border-pink-500/20 transition-all hover:scale-[1.02]"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Instagram
            </button>

            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${shareUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-lg py-2.5 px-3 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground/80 hover:bg-white/10 border border-white/10 transition-all hover:scale-[1.02] col-span-2 sm:col-span-1"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X (Twitter)
            </a>
          </div>
        </div>
      </div>

      {/* Real Stats Cards: Invited, Earned, Pending */}
      <div className="grid grid-cols-3 gap-3">
        {/* Invited */}
        <div className="glass rounded-xl p-3.5 text-center border border-white/5 bg-background/30 hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary mx-auto mb-1.5 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black tracking-tight">{invitedCount}</div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
            Invited
          </div>
        </div>

        {/* Earned */}
        <div className="glass rounded-xl p-3.5 text-center border border-white/5 bg-background/30 hover:border-emerald-500/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 mx-auto mb-1.5 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            ${earnedAmount.toFixed(0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
            Earned
          </div>
        </div>

        {/* Pending */}
        <div className="glass rounded-xl p-3.5 text-center border border-white/5 bg-background/30 hover:border-amber-500/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 mx-auto mb-1.5 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-400 tracking-tight">
            ${pendingAmount.toFixed(0)}
          </div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
            Pending
          </div>
        </div>
      </div>

      {/* Friends list */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Invited Friends ({data?.friends?.length || 0})
          </span>
          {pendingAmount > 0 && (
            <span className="text-xs text-amber-400 font-semibold">
              ${pendingAmount.toFixed(2)} Ready to Claim
            </span>
          )}
        </div>

        {data?.friends && data.friends.length > 0 ? (
          <div className="divide-y divide-border/20 glass rounded-xl border border-white/5 overflow-hidden">
            {data.friends.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
                    {f.name?.[0] || "T"}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-snug">{f.name}</div>
                    <div className="text-[11px] text-muted-foreground">{f.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-emerald-400">+${f.reward}</div>
                  <span
                    className={cn(
                      "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 border",
                      f.claimed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}
                  >
                    {f.claimed ? "Claimed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-6 text-center border border-dashed border-white/10">
            <p className="text-xs text-muted-foreground">
              No friends have joined yet. Share your referral link on WhatsApp, Telegram, Facebook, or Instagram to start earning!
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
