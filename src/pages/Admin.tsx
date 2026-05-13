import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ShieldCheck, AlertTriangle, DollarSign, Activity, Loader2 } from "lucide-react";
import { useDemo, formatUSD } from "@/store/demo";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Admin() {
  const { user: currentUser } = useAuthStore();
  const { mode, transactions: demoTxs } = useDemo();
  const [stats, setStats] = useState({ users: 0, transactions: 0, totalVolume: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [liveTxs, setLiveTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    if (mode === "live") {
      setLoading(true);
      Promise.all([adminApi.stats(), adminApi.users(), adminApi.transactions()])
        .then(([s, u, t]) => { setStats(s); setUsers(u); setLiveTxs(t); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    refresh();
  }, [mode]);

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveWithdrawal(id);
      toast.success("Withdrawal approved successfully");
      refresh();
    } catch (e) { 
      toast.error("Failed to approve withdrawal");
      console.error(e); 
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectWithdrawal(id);
      toast.success("Withdrawal rejected and refunded");
      refresh();
    } catch (e) { 
      toast.error("Failed to reject withdrawal");
      console.error(e); 
    }
  };

  const handleDeleteUser = async (id: string) => {
    toast("Delete User?", {
      description: "This action cannot be undone.",
      action: {
        label: "Confirm Delete",
        onClick: async () => {
          try {
            await adminApi.deleteUser(id);
            toast.success("User deleted successfully");
            refresh();
          } catch (e) { 
            toast.error("Failed to delete user");
            console.error(e); 
          }
        },
      },
    });
  };

  // Demo fallback data
  const demoUsers = [
    { id: "u1", name: "Alice Chen", email: "alice@coinnova.io", createdAt: "2026-04-12", balance: 12400, role: "active" },
    { id: "u2", name: "Bob Patel", email: "bob@coinnova.io", createdAt: "2026-04-21", balance: 980, role: "active" },
    { id: "u3", name: "Carla Diaz", email: "carla@coinnova.io", createdAt: "2026-04-30", balance: 0, role: "flagged" },
    { id: "u4", name: "Daniel Kim", email: "dan@coinnova.io", createdAt: "2026-05-01", balance: 56700, role: "active" },
  ];

  const displayUsers = mode === "live" ? users : demoUsers;
  const displayTxs = mode === "live" ? liveTxs : demoTxs;
  const totalVolume = mode === "live" ? stats.totalVolume : demoTxs.reduce((s, t) => s + t.total, 0);
  const trades = mode === "live" ? stats.transactions : demoTxs.filter((t) => t.type === "buy" || t.type === "sell").length;

  const pendingWithdrawals = displayTxs.filter(t => t.type === "withdraw" && t.status === "pending");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-display font-bold">Admin</h1>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {mode === "live" ? "Live data" : "Read-only demo"}
        </Badge>
        {mode === "live" && <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}><Activity className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>}
      </div>

      {loading && stats.users === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat icon={<Users className="w-4 h-4" />} label="Users" v={mode === "live" ? String(stats.users) : "4"} />
            <Stat icon={<DollarSign className="w-4 h-4" />} label="Total volume" v={formatUSD(totalVolume)} />
            <Stat icon={<Activity className="w-4 h-4" />} label="Trades" v={String(trades)} />
            <Stat icon={<AlertTriangle className="w-4 h-4" />} label="Pending" v={String(pendingWithdrawals.length)} />
          </div>

          {pendingWithdrawals.length > 0 && (
            <GlassCard className="p-0 overflow-hidden border-primary/30">
              <div className="px-4 py-3 bg-primary/5 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-semibold text-primary flex items-center gap-2"><DollarSign className="w-4 h-4" /> Pending Withdrawals</h3>
              </div>
              <div className="divide-y divide-border/40">
                {pendingWithdrawals.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{formatUSD(t.total)}</div>
                      <div className="text-xs text-muted-foreground">{t.userName || "User"} ({t.userEmail}) · {t.toDest}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-primary text-background" onClick={() => handleApprove(t.id)}>Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(t.id)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-semibold">Users</h3>
            </div>
            <div className="divide-y divide-border/40">
              {displayUsers.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-gradient-neon text-background flex items-center justify-center font-bold">{u.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email} · joined {typeof u.createdAt === 'string' ? u.createdAt : new Date(u.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatUSD(u.balance ?? 0)}</div>
                  <Badge variant="outline" className={u.role === "admin" ? "border-primary/40 text-primary" : "border-primary/40 text-primary"}>
                    {u.role ?? "active"}
                  </Badge>
                  {u.id !== currentUser?.id && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u.id)}>Delete</Button>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="font-semibold mb-3">Recent platform activity</h3>
            {displayTxs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {displayTxs.slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm border-b border-border/10 pb-1 last:border-0">
                    <Badge variant="outline" className={`capitalize ${t.status === 'pending' ? 'bg-warning/10 text-warning border-warning/30' : ''}`}>{t.type} · {t.status}</Badge>
                    <span className="flex-1 truncate">{t.userName ? `${t.userName}: ` : ""}{t.symbol?.toUpperCase() ?? t.toDest ?? t.to ?? ""}</span>
                    <span className="font-semibold">{formatUSD(t.total)}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
}

const Stat = ({ icon, label, v }: any) => (
  <GlassCard>
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
      <span>{label}</span><span className="text-primary">{icon}</span>
    </div>
    <div className="text-2xl font-display font-bold">{v}</div>
  </GlassCard>
);
