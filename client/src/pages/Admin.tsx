import { GlassCard } from "@/components/glass/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Activity,
  Loader2,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Ban,
  ShieldAlert,
  Info,
  Search,
  Filter,
  ArrowUpDown,
  X,
  ExternalLink,
  Gift,
  Award,
  TrendingUp,
  Calendar,
  CreditCard,
  Layers,
  Eye,
  RefreshCw,
  FileText,
  Globe,
  Sparkles,
  UserCheck,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  User as UserIcon,
} from "lucide-react";
import { useDemo, formatUSD } from "@/store/demo";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

type AdminTab = "overview" | "verified-kyc" | "referral-analytics";

export default function Admin() {
  const { user: currentUser } = useAuthStore();
  const { mode, transactions: demoTxs } = useDemo();

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Platform Data
  const [stats, setStats] = useState({ users: 0, transactions: 0, totalVolume: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [liveTxs, setLiveTxs] = useState<any[]>([]);
  const [kycPending, setKycPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // KYC Reject Dialog
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Block User Dialog
  const [blockTargetUser, setBlockTargetUser] = useState<any | null>(null);
  const [blockReasonText, setBlockReasonText] = useState("");
  const [blockingBusy, setBlockingBusy] = useState(false);

  // Feature 1: Verified KYC Section States
  const [verifiedKycList, setVerifiedKycList] = useState<any[]>([]);
  const [loadingVerifiedKyc, setLoadingVerifiedKyc] = useState(false);
  const [kycSearchQuery, setKycSearchQuery] = useState("");
  const [kycDocFilter, setKycDocFilter] = useState("all");
  const [kycCountryFilter, setKycCountryFilter] = useState("all");
  const [kycSortBy, setKycSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "balance-desc">("date-desc");
  const [selectedKycDocUser, setSelectedKycDocUser] = useState<any | null>(null);

  // Feature 2: User Detail Drawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerUserData, setDrawerUserData] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Feature 3: Referral Analytics State
  const [referralAnalytics, setReferralAnalytics] = useState<any | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  // User List Search in Overview
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const refreshOverview = () => {
    if (mode === "live") {
      setLoading(true);
      Promise.all([
        adminApi.stats(),
        adminApi.users(),
        adminApi.transactions(),
        adminApi.kycPending(),
      ])
        .then(([s, u, t, k]) => {
          setStats(s);
          setUsers(u);
          setLiveTxs(t);
          setKycPending(k);
        })
        .catch((err) => {
          console.error("Overview refresh error:", err);
        })
        .finally(() => setLoading(false));
    }
  };

  const loadVerifiedKyc = async () => {
    if (mode !== "live") return;
    try {
      setLoadingVerifiedKyc(true);
      const res = await adminApi.kycVerified();
      setVerifiedKycList(res);
    } catch (err) {
      console.error("Load verified KYC error:", err);
      toast.error("Failed to load verified KYC users");
    } finally {
      setLoadingVerifiedKyc(false);
    }
  };

  const loadReferralAnalytics = async () => {
    if (mode !== "live") return;
    try {
      setLoadingReferrals(true);
      const res = await adminApi.referralAnalytics();
      setReferralAnalytics(res);
    } catch (err) {
      console.error("Load referral analytics error:", err);
      toast.error("Failed to load referral analytics");
    } finally {
      setLoadingReferrals(false);
    }
  };

  // Open User Detail Drawer
  const openUserDrawer = async (userId: string) => {
    setDrawerUserId(userId);
    setDrawerUserData(null);
    setDrawerLoading(true);
    try {
      if (mode === "live") {
        const data = await adminApi.userDetail(userId);
        setDrawerUserData(data);
      } else {
        // Mock data for demo
        const mockUser = demoUsers.find((u) => u.id === userId) || demoUsers[0];
        setDrawerUserData({
          profile: {
            ...mockUser,
            kycStatus: "verified",
            kycLevel: 2,
            kycFullName: mockUser.name,
            kycCountry: "United States",
            kycDocumentType: "passport",
            kycDocumentNumber: "P89218201",
            kycDob: "1994-08-15",
            referralCode: "NOVA-8921",
            createdAt: mockUser.createdAt,
          },
          transactions: demoTxs.slice(0, 5),
          holdings: [
            { symbol: "BTC", name: "Bitcoin", amount: 0.35, avgPrice: 62000 },
            { symbol: "ETH", name: "Ethereum", amount: 2.5, avgPrice: 3100 },
          ],
          referrer: { id: "ref-1", name: "Alpha Leader", email: "alpha@coinnova.io" },
          referredUsers: [
            { id: "r1", referredName: "Bob Patel", rewardAmount: 25, status: "completed", claimed: true, createdAt: "2026-05-01" },
          ],
          orders: [],
        });
      }
    } catch (err) {
      console.error("Failed to load user details:", err);
      toast.error("Failed to load full user details");
    } finally {
      setDrawerLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshOverview();
    loadVerifiedKyc();
    loadReferralAnalytics();
  }, [mode]);

  // Tab change handler
  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    if (tab === "verified-kyc" && verifiedKycList.length === 0) {
      loadVerifiedKyc();
    } else if (tab === "referral-analytics" && !referralAnalytics) {
      loadReferralAnalytics();
    }
  };

  // Actions
  const handleApproveWithdrawal = async (id: string) => {
    try {
      await adminApi.approveWithdrawal(id);
      toast.success("Withdrawal approved successfully");
      refreshOverview();
    } catch (e) {
      toast.error("Failed to approve withdrawal");
      console.error(e);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    try {
      await adminApi.rejectWithdrawal(id);
      toast.success("Withdrawal rejected and refunded");
      refreshOverview();
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
            if (drawerUserId === id) setDrawerUserId(null);
            refreshOverview();
            loadVerifiedKyc();
          } catch (e) {
            toast.error("Failed to delete user");
            console.error(e);
          }
        },
      },
    });
  };

  const handleBlockUser = async () => {
    if (!blockTargetUser) return;
    if (!blockReasonText.trim()) {
      toast.error("Please enter a suspension reason");
      return;
    }

    try {
      setBlockingBusy(true);
      await adminApi.blockUser(blockTargetUser.id, blockReasonText.trim());
      toast.success(`Account for ${blockTargetUser.name || blockTargetUser.email} has been suspended.`);
      setBlockTargetUser(null);
      setBlockReasonText("");
      refreshOverview();
      if (drawerUserId === blockTargetUser.id) {
        openUserDrawer(blockTargetUser.id);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to suspend account");
    } finally {
      setBlockingBusy(false);
    }
  };

  const handleUnblockUser = async (u: any) => {
    toast(`Restore Account Access?`, {
      description: `Re-activate trading access for ${u.name || u.email}? A restoration email will be sent.`,
      action: {
        label: "Confirm Unblock",
        onClick: async () => {
          try {
            await adminApi.unblockUser(u.id);
            toast.success(`Account for ${u.name || u.email} has been re-activated.`);
            refreshOverview();
            if (drawerUserId === u.id) {
              openUserDrawer(u.id);
            }
          } catch (e: any) {
            toast.error(e.message || "Failed to unblock account");
          }
        },
      },
    });
  };

  const BLOCK_REASON_PRESETS = [
    "Terms of Service & Compliance policy violation",
    "Suspicious trading patterns / Unusual account activity",
    "Identity verification failure / Document mismatch",
    "Pending security review / Suspected credential compromise",
    "Payment dispute / Chargeback investigation",
  ];

  // Demo fallback data
  const demoUsers = [
    { id: "u1", name: "Alice Chen", email: "alice@coinnova.io", createdAt: "2026-04-12", balance: 12400, role: "active", kycStatus: "verified", kycLevel: 2 },
    { id: "u2", name: "Bob Patel", email: "bob@coinnova.io", createdAt: "2026-04-21", balance: 980, role: "active", kycStatus: "verified", kycLevel: 2 },
    { id: "u3", name: "Carla Diaz", email: "carla@coinnova.io", createdAt: "2026-04-30", balance: 0, role: "flagged", kycStatus: "pending", kycLevel: 1 },
    { id: "u4", name: "Daniel Kim", email: "dan@coinnova.io", createdAt: "2026-05-01", balance: 56700, role: "active", kycStatus: "verified", kycLevel: 2 },
  ];

  const demoVerifiedKyc = [
    {
      id: "u1",
      name: "Alice Chen",
      email: "alice@coinnova.io",
      kycStatus: "verified",
      kycLevel: 2,
      kycFullName: "Alice Meili Chen",
      kycDob: "1992-04-14",
      kycCountry: "Singapore",
      kycDocumentType: "passport",
      kycDocumentNumber: "E4829104A",
      kycSubmittedAt: "2026-04-13T10:20:00Z",
      kycReviewedAt: "2026-04-13T12:00:00Z",
      createdAt: "2026-04-12",
      balance: 12400,
    },
    {
      id: "u2",
      name: "Bob Patel",
      email: "bob@coinnova.io",
      kycStatus: "verified",
      kycLevel: 2,
      kycFullName: "Bob Rajesh Patel",
      kycDob: "1988-11-03",
      kycCountry: "United Kingdom",
      kycDocumentType: "driving_license",
      kycDocumentNumber: "PATEL881103GB",
      kycSubmittedAt: "2026-04-22T08:30:00Z",
      kycReviewedAt: "2026-04-22T09:15:00Z",
      createdAt: "2026-04-21",
      balance: 980,
    },
    {
      id: "u4",
      name: "Daniel Kim",
      email: "dan@coinnova.io",
      kycStatus: "verified",
      kycLevel: 2,
      kycFullName: "Daniel Joon Kim",
      kycDob: "1995-07-29",
      kycCountry: "United States",
      kycDocumentType: "passport",
      kycDocumentNumber: "USA99482012",
      kycSubmittedAt: "2026-05-02T14:10:00Z",
      kycReviewedAt: "2026-05-02T15:00:00Z",
      createdAt: "2026-05-01",
      balance: 56700,
    },
  ];

  const demoReferralAnalytics = {
    summary: {
      totalReferrals: 48,
      claimedRewards: 32,
      unclaimedRewards: 16,
      totalDistributed: 800,
      totalPending: 400,
      welcomeBonusCount: 48,
      welcomeBonusTotal: 480,
      referredUsers: 48,
      totalUsers: 95,
      conversionRate: "50.5",
    },
    topReferrers: [
      { referrerId: "u1", referrerName: "Alice Chen", referrerEmail: "alice@coinnova.io", totalReferred: 18, totalEarned: 350, totalPending: 100 },
      { referrerId: "u4", referrerName: "Daniel Kim", referrerEmail: "dan@coinnova.io", totalReferred: 12, totalEarned: 225, totalPending: 75 },
      { referrerId: "u2", referrerName: "Bob Patel", referrerEmail: "bob@coinnova.io", totalReferred: 7, totalEarned: 125, totalPending: 50 },
    ],
    referralsByDay: [
      { day: "2026-08-10", count: 2 },
      { day: "2026-08-12", count: 4 },
      { day: "2026-08-15", count: 3 },
      { day: "2026-08-18", count: 6 },
      { day: "2026-08-22", count: 5 },
      { day: "2026-08-26", count: 8 },
      { day: "2026-08-30", count: 9 },
      { day: "2026-09-02", count: 7 },
      { day: "2026-09-06", count: 4 },
    ],
  };

  const displayUsers = mode === "live" ? users : demoUsers;
  const displayTxs = mode === "live" ? liveTxs : demoTxs;
  const totalVolume = mode === "live" ? stats.totalVolume : demoTxs.reduce((s, t) => s + t.total, 0);
  const trades = mode === "live" ? stats.transactions : demoTxs.filter((t) => t.type === "buy" || t.type === "sell").length;
  const pendingWithdrawals = displayTxs.filter((t) => t.type === "withdraw" && t.status === "pending");

  const effectiveVerifiedKyc = mode === "live" ? verifiedKycList : demoVerifiedKyc;
  const effectiveReferrals = mode === "live" ? referralAnalytics || demoReferralAnalytics : demoReferralAnalytics;

  // Filtered Verified KYC Users
  const filteredVerifiedKyc = useMemo(() => {
    let list = [...effectiveVerifiedKyc];

    // Search filter
    if (kycSearchQuery.trim()) {
      const q = kycSearchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.kycFullName?.toLowerCase().includes(q) ||
          u.kycDocumentNumber?.toLowerCase().includes(q) ||
          u.kycCountry?.toLowerCase().includes(q)
      );
    }

    // Document type filter
    if (kycDocFilter !== "all") {
      list = list.filter((u) => u.kycDocumentType === kycDocFilter);
    }

    // Country filter
    if (kycCountryFilter !== "all") {
      list = list.filter((u) => u.kycCountry?.toLowerCase() === kycCountryFilter.toLowerCase());
    }

    // Sorting
    list.sort((a, b) => {
      if (kycSortBy === "date-desc") {
        return new Date(b.kycReviewedAt || 0).getTime() - new Date(a.kycReviewedAt || 0).getTime();
      }
      if (kycSortBy === "date-asc") {
        return new Date(a.kycReviewedAt || 0).getTime() - new Date(b.kycReviewedAt || 0).getTime();
      }
      if (kycSortBy === "name-asc") {
        return (a.kycFullName || a.name || "").localeCompare(b.kycFullName || b.name || "");
      }
      if (kycSortBy === "balance-desc") {
        return (b.balance || 0) - (a.balance || 0);
      }
      return 0;
    });

    return list;
  }, [effectiveVerifiedKyc, kycSearchQuery, kycDocFilter, kycCountryFilter, kycSortBy]);

  // Unique countries for filter
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    effectiveVerifiedKyc.forEach((u) => {
      if (u.kycCountry) countries.add(u.kycCountry);
    });
    return Array.from(countries);
  }, [effectiveVerifiedKyc]);

  // Filtered Overview Users
  const filteredOverviewUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return displayUsers;
    const q = userSearchQuery.toLowerCase().trim();
    return displayUsers.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [displayUsers, userSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Mode Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-emerald-500/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-display font-bold">Admin Console</h1>
              <Badge variant="outline" className="border-primary/40 text-primary">
                {mode === "live" ? "Live data" : "Read-only demo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Platform administration, compliance enforcement, verified users & referral intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === "live" && (
            <Button
              variant="outline"
              size="sm"
              className="glass border-white/10 hover:border-primary/40 text-xs h-9"
              onClick={() => {
                refreshOverview();
                loadVerifiedKyc();
                loadReferralAnalytics();
                toast.success("Admin data refreshed");
              }}
              disabled={loading || loadingVerifiedKyc || loadingReferrals}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${
                  loading || loadingVerifiedKyc || loadingReferrals ? "animate-spin text-primary" : ""
                }`}
              />
              Refresh All
            </Button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto">
        <button
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-primary text-background font-semibold shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <Activity className="w-4 h-4" />
          Platform Overview
        </button>

        <button
          onClick={() => handleTabChange("verified-kyc")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
            activeTab === "verified-kyc"
              ? "bg-primary text-background font-semibold shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          Verified KYC Users
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "verified-kyc" ? "bg-background/20 text-background" : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {effectiveVerifiedKyc.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("referral-analytics")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "referral-analytics"
              ? "bg-primary text-background font-semibold shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Referral Analytics
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === "referral-analytics" ? "bg-background/20 text-background" : "bg-amber-500/20 text-amber-400"
            }`}
          >
            {effectiveReferrals?.summary?.totalReferrals ?? 0}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PLATFORM OVERVIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {loading && stats.users === 0 ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="w-5 h-5 text-primary" />}
                  label="Registered Users"
                  v={mode === "live" ? String(stats.users) : "4"}
                  sub="Active accounts"
                />
                <StatCard
                  icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                  label="Total Trading Volume"
                  v={formatUSD(totalVolume)}
                  sub="Cumulative turnover"
                />
                <StatCard
                  icon={<Activity className="w-5 h-5 text-blue-400" />}
                  label="Completed Trades"
                  v={String(trades)}
                  sub="Buy / Sell orders"
                />
                <StatCard
                  icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
                  label="Pending Action"
                  v={String(pendingWithdrawals.length + kycPending.length)}
                  sub={`${pendingWithdrawals.length} withdraw · ${kycPending.length} KYC`}
                />
              </div>

              {/* Pending Withdrawals */}
              {pendingWithdrawals.length > 0 && (
                <GlassCard className="p-0 overflow-hidden border-primary/30 shadow-xl shadow-primary/5">
                  <div className="px-4 py-3 bg-primary/10 border-b border-border/40 flex items-center justify-between">
                    <h3 className="font-semibold text-primary flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Pending Withdrawals ({pendingWithdrawals.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-border/40">
                    {pendingWithdrawals.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-semibold text-lg font-mono text-emerald-400">{formatUSD(t.total)}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.userName || "User"} ({t.userEmail}) · Dest: <span className="font-mono text-white/90">{t.toDest}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-primary text-background font-semibold" onClick={() => handleApproveWithdrawal(t.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawal(t.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* KYC Pending Verifications */}
              {kycPending.length > 0 && (
                <GlassCard className="p-0 overflow-hidden border-amber-500/30 shadow-xl shadow-amber-500/5">
                  <div className="px-4 py-3 bg-amber-500/10 border-b border-border/40 flex items-center justify-between">
                    <h3 className="font-semibold text-amber-400 flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4" /> Pending KYC Verifications ({kycPending.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-border/40">
                    {kycPending.map((k: any) => (
                      <div key={k.id} className="p-4 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold">
                            {k.kycFullName?.[0] ?? k.name?.[0] ?? "?"}
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {k.kycFullName ?? k.name}
                              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                                Pending Review
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">{k.email}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                              onClick={async () => {
                                try {
                                  await adminApi.kycApprove(k.id);
                                  toast.success(`KYC approved for ${k.kycFullName ?? k.name}`);
                                  refreshOverview();
                                  loadVerifiedKyc();
                                } catch (e) {
                                  toast.error("Failed to approve KYC");
                                }
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Tier 2
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRejectUserId(k.id);
                                setRejectReason("");
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="glass rounded-lg p-2 border border-white/5">
                            <div className="text-muted-foreground text-[10px]">Document</div>
                            <div className="font-medium capitalize">{k.kycDocumentType?.replace("_", " ") ?? "—"}</div>
                          </div>
                          <div className="glass rounded-lg p-2 border border-white/5">
                            <div className="text-muted-foreground text-[10px]">Doc Number</div>
                            <div className="font-medium font-mono text-primary">{k.kycDocumentNumber ?? "—"}</div>
                          </div>
                          <div className="glass rounded-lg p-2 border border-white/5">
                            <div className="text-muted-foreground text-[10px]">Country</div>
                            <div className="font-medium">{k.kycCountry ?? "—"}</div>
                          </div>
                          <div className="glass rounded-lg p-2 border border-white/5">
                            <div className="text-muted-foreground text-[10px]">Date of Birth</div>
                            <div className="font-medium">{k.kycDob ?? "—"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Users List with Drawer Integration */}
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">User Accounts ({displayUsers.length})</h3>
                    <p className="text-xs text-muted-foreground">
                      Click "Inspect" on any user to open their complete profile drawer
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 glass rounded-xl text-xs border border-white/10 focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="divide-y divide-border/40">
                  {filteredOverviewUsers.map((u: any) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3.5 flex-wrap hover:bg-white/[0.02] transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-background ${
                          u.isBlocked ? "bg-red-500" : "bg-gradient-neon"
                        }`}
                      >
                        {u.name?.[0] || "?"}
                      </div>

                      <div className="flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{u.name}</span>
                          {u.isBlocked && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0 flex items-center gap-1 bg-red-500/20 text-red-400 border-red-500/40"
                            >
                              <Ban className="w-3 h-3" /> Suspended
                            </Badge>
                          )}
                          {u.kycStatus === "verified" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 flex items-center gap-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            >
                              <BadgeCheck className="w-3 h-3" /> KYC Verified (Tier 2)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 text-muted-foreground border-white/10"
                            >
                              Tier 1 ($500/day limit)
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email} · joined {typeof u.createdAt === "string" ? u.createdAt : new Date(u.createdAt).toLocaleDateString()}
                        </div>
                        {u.isBlocked && u.blockReason && (
                          <div className="text-[11px] text-red-400/90 flex items-center gap-1 mt-0.5 font-medium italic">
                            <Info className="w-3 h-3 shrink-0" /> Reason: "{u.blockReason}"
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="text-sm font-semibold font-mono text-emerald-400">{formatUSD(u.balance ?? 0)}</div>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          u.role === "admin"
                            ? "border-primary/40 text-primary"
                            : u.isBlocked
                            ? "border-red-500/40 text-red-400"
                            : "border-emerald-500/40 text-emerald-400"
                        }
                      >
                        {u.role === "admin" ? "Admin" : u.isBlocked ? "Blocked" : "Active"}
                      </Badge>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="glass hover:bg-primary/10 hover:border-primary/50 text-primary h-8 px-2.5 text-xs flex items-center gap-1"
                          onClick={() => openUserDrawer(u.id)}
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </Button>

                        {u.id !== currentUser?.id && u.role !== "admin" && (
                          <>
                            {u.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 h-8 px-2.5 text-xs"
                                onClick={() => handleUnblockUser(u)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Unblock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-8 px-2.5 text-xs"
                                onClick={() => {
                                  setBlockTargetUser(u);
                                  setBlockReasonText("");
                                }}
                              >
                                <Ban className="w-3.5 h-3.5 mr-1" /> Block
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Recent Activity */}
              <GlassCard>
                <h3 className="font-semibold mb-3">Recent Platform Activity</h3>
                {displayTxs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {displayTxs.slice(0, 8).map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 text-sm border-b border-border/10 pb-1.5 last:border-0"
                      >
                        <Badge
                          variant="outline"
                          className={`capitalize ${
                            t.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : t.type === "deposit"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "border-white/10"
                          }`}
                        >
                          {t.type} · {t.status}
                        </Badge>
                        <span className="flex-1 truncate">
                          {t.userName ? `${t.userName}: ` : ""}
                          {t.symbol?.toUpperCase() ?? t.toDest ?? t.to ?? ""}
                          {t.reason === "referral_welcome_bonus" && (
                            <span className="ml-2 text-xs text-amber-400">🎁 Welcome Bonus</span>
                          )}
                        </span>
                        <span className="font-semibold font-mono">{formatUSD(t.total)}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(t.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: VERIFIED KYC USERS SECTION (Feature 1)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "verified-kyc" && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard
              icon={<BadgeCheck className="w-5 h-5 text-emerald-400" />}
              label="Verified Identity Profiles"
              v={String(effectiveVerifiedKyc.length)}
              sub="Tier 2 Unlocked accounts"
            />
            <StatCard
              icon={<Globe className="w-5 h-5 text-blue-400" />}
              label="Countries Represented"
              v={String(uniqueCountries.length || 1)}
              sub="Global user base"
            />
            <StatCard
              icon={<ShieldCheck className="w-5 h-5 text-primary" />}
              label="Withdrawal Limit Tier"
              v="Unlimited"
              sub="Tier 2 verification compliance"
            />
          </div>

          {/* Search, Filters & Sorting Toolbar */}
          <GlassCard className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by full legal name, email, document number, or country..."
                  value={kycSearchQuery}
                  onChange={(e) => setKycSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 glass rounded-xl text-sm border border-white/10 focus:outline-none focus:border-emerald-500/50"
                />
                {kycSearchQuery && (
                  <button
                    onClick={() => setKycSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Doc Type Filter */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass px-2.5 py-1.5 rounded-xl border border-white/10">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <select
                    value={kycDocFilter}
                    onChange={(e) => setKycDocFilter(e.target.value)}
                    className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-900">All Documents</option>
                    <option value="passport" className="bg-zinc-900">Passport</option>
                    <option value="national_id" className="bg-zinc-900">National ID</option>
                    <option value="driving_license" className="bg-zinc-900">Driving License</option>
                  </select>
                </div>

                {/* Country Filter */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass px-2.5 py-1.5 rounded-xl border border-white/10">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <select
                    value={kycCountryFilter}
                    onChange={(e) => setKycCountryFilter(e.target.value)}
                    className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-900">All Countries</option>
                    {uniqueCountries.map((c) => (
                      <option key={c} value={c} className="bg-zinc-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground glass px-2.5 py-1.5 rounded-xl border border-white/10">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                  <select
                    value={kycSortBy}
                    onChange={(e: any) => setKycSortBy(e.target.value)}
                    className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date-desc" className="bg-zinc-900">Verified: Newest</option>
                    <option value="date-asc" className="bg-zinc-900">Verified: Oldest</option>
                    <option value="name-asc" className="bg-zinc-900">Name: A to Z</option>
                    <option value="balance-desc" className="bg-zinc-900">Highest Balance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter tags & count */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-white/5">
              <div>
                Showing <span className="text-emerald-400 font-semibold">{filteredVerifiedKyc.length}</span> of{" "}
                {effectiveVerifiedKyc.length} verified users
              </div>
              {(kycSearchQuery || kycDocFilter !== "all" || kycCountryFilter !== "all") && (
                <button
                  onClick={() => {
                    setKycSearchQuery("");
                    setKycDocFilter("all");
                    setKycCountryFilter("all");
                  }}
                  className="text-primary hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </GlassCard>

          {/* Verified KYC Users Table */}
          {loadingVerifiedKyc ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : filteredVerifiedKyc.length === 0 ? (
            <GlassCard className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg">No Verified KYC Users Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No users match the active search query or filters. As new users complete their identity verification,
                they will be recorded here.
              </p>
            </GlassCard>
          ) : (
            <GlassCard className="p-0 overflow-hidden border-emerald-500/30 shadow-xl shadow-emerald-500/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-emerald-500/10 border-b border-border/40 text-xs text-emerald-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">User & Legal Name</th>
                      <th className="px-4 py-3 font-semibold">Document Type</th>
                      <th className="px-4 py-3 font-semibold">Document Number</th>
                      <th className="px-4 py-3 font-semibold">Country</th>
                      <th className="px-4 py-3 font-semibold">Date of Birth</th>
                      <th className="px-4 py-3 font-semibold">Verified Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Balance</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredVerifiedKyc.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs">
                              {u.kycFullName?.[0] || u.name?.[0] || "?"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {u.kycFullName || u.name}
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                            {u.kycDocumentType?.replace("_", " ") || "Passport"}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs font-semibold text-white/90">
                          {u.kycDocumentNumber || "—"}
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <span>{u.kycCountry || "—"}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.kycDob || "—"}
                        </td>

                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {u.kycReviewedAt ? new Date(u.kycReviewedAt).toLocaleDateString() : "—"}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-400 text-xs">
                          {formatUSD(u.balance ?? 0)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="glass hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400 h-7 px-2 text-xs"
                              onClick={() => setSelectedKycDocUser(u)}
                            >
                              <FileText className="w-3 h-3 mr-1" /> Doc
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="glass hover:bg-primary/10 hover:border-primary/40 text-primary h-7 px-2 text-xs"
                              onClick={() => openUserDrawer(u.id)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Profile
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Full KYC Details Modal */}
          {selectedKycDocUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="glass-strong border border-emerald-500/40 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <BadgeCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white">Verified KYC Record</h3>
                      <p className="text-xs text-zinc-400">Compliance & Regulatory Identity Record</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedKycDocUser(null)}
                    className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Full Legal Name</div>
                    <div className="font-semibold text-foreground text-sm">{selectedKycDocUser.kycFullName || selectedKycDocUser.name}</div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Account Email</div>
                    <div className="font-semibold text-foreground text-sm truncate">{selectedKycDocUser.email}</div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Document Type</div>
                    <div className="font-semibold capitalize text-emerald-400 text-sm">
                      {selectedKycDocUser.kycDocumentType?.replace("_", " ") || "Passport"}
                    </div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Document ID Number</div>
                    <div className="font-semibold font-mono text-white text-sm">{selectedKycDocUser.kycDocumentNumber || "—"}</div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Country of Citizenship</div>
                    <div className="font-semibold text-foreground text-sm">{selectedKycDocUser.kycCountry || "—"}</div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Date of Birth</div>
                    <div className="font-semibold text-foreground text-sm">{selectedKycDocUser.kycDob || "—"}</div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Submission Date</div>
                    <div className="font-semibold text-foreground text-xs">
                      {selectedKycDocUser.kycSubmittedAt ? new Date(selectedKycDocUser.kycSubmittedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <div className="glass rounded-xl p-3 border border-white/5 space-y-1">
                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Approval Date</div>
                    <div className="font-semibold text-emerald-400 text-xs">
                      {selectedKycDocUser.kycReviewedAt ? new Date(selectedKycDocUser.kycReviewedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <div>
                    This account is verified for <span className="font-bold text-white">Tier 2 Unlimited Withdrawals</span>.
                    All compliance requirements have been approved by platform administration.
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 glass"
                    onClick={() => setSelectedKycDocUser(null)}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-background font-semibold"
                    onClick={() => {
                      const uid = selectedKycDocUser.id;
                      setSelectedKycDocUser(null);
                      openUserDrawer(uid);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1.5" /> Inspect Full Profile
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: REFERRAL ANALYTICS DASHBOARD (Feature 3)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === "referral-analytics" && (
        <div className="space-y-6">
          {loadingReferrals ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<Gift className="w-5 h-5 text-amber-400" />}
                  label="Total Referrals"
                  v={String(effectiveReferrals?.summary?.totalReferrals ?? 0)}
                  sub={`${effectiveReferrals?.summary?.conversionRate ?? 0}% of all users joined via referral`}
                />
                <StatCard
                  icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
                  label="Claimed Cash Distributed"
                  v={formatUSD(effectiveReferrals?.summary?.totalDistributed ?? 0)}
                  sub={`${effectiveReferrals?.summary?.claimedRewards ?? 0} claimed rewards ($25 each)`}
                />
                <StatCard
                  icon={<Sparkles className="w-5 h-5 text-primary" />}
                  label="Pending Rewards"
                  v={formatUSD(effectiveReferrals?.summary?.totalPending ?? 0)}
                  sub={`${effectiveReferrals?.summary?.unclaimedRewards ?? 0} ready to be claimed`}
                />
                <StatCard
                  icon={<Award className="w-5 h-5 text-purple-400" />}
                  label="Welcome Bonuses Given"
                  v={formatUSD(effectiveReferrals?.summary?.welcomeBonusTotal ?? 0)}
                  sub={`${effectiveReferrals?.summary?.welcomeBonusCount ?? 0} new members received $10`}
                />
              </div>

              {/* Charts & Breakdown Row */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* 30-Day Activity Bar Chart */}
                <GlassCard className="lg:col-span-2 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-amber-400" /> Referral Growth Trend
                      </h3>
                      <p className="text-xs text-muted-foreground">Daily referral signups recorded</p>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                      Recent Activity
                    </Badge>
                  </div>

                  {/* Visual Chart */}
                  <div className="pt-4 pb-2">
                    {effectiveReferrals?.referralsByDay?.length > 0 ? (
                      <div className="space-y-3">
                        <div className="h-44 flex items-end gap-2 pt-4 px-2 border-b border-border/40">
                          {effectiveReferrals.referralsByDay.map((d: any, idx: number) => {
                            const maxVal = Math.max(
                              ...effectiveReferrals.referralsByDay.map((x: any) => x.count),
                              1
                            );
                            const heightPct = Math.round((d.count / maxVal) * 100);

                            return (
                              <div
                                key={idx}
                                className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                              >
                                {/* Tooltip */}
                                <div className="absolute -top-8 hidden group-hover:flex px-2 py-1 bg-zinc-900 border border-white/20 rounded-md text-[10px] font-mono whitespace-nowrap z-10 text-white">
                                  {d.day}: {d.count} invites
                                </div>
                                <div
                                  style={{ height: `${Math.max(heightPct, 8)}%` }}
                                  className="w-full rounded-t-md bg-gradient-to-t from-amber-500/40 via-amber-400 to-primary group-hover:from-amber-400 group-hover:to-white transition-all shadow-md shadow-amber-500/20"
                                />
                                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                                  {d.day.slice(5)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        No daily referral activity recorded in the last 30 days.
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Reward Distribution Breakdown */}
                <GlassCard className="p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" /> Reward Breakdown
                    </h3>
                    <p className="text-xs text-muted-foreground">Distribution across program incentives</p>
                  </div>

                  <div className="space-y-4 py-2">
                    {/* Referrer Claimed */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Referrer Cash (Claimed)</span>
                        <span className="font-semibold text-emerald-400">
                          {formatUSD(effectiveReferrals?.summary?.totalDistributed ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${
                              (effectiveReferrals?.summary?.totalDistributed /
                                ((effectiveReferrals?.summary?.totalDistributed || 1) +
                                  (effectiveReferrals?.summary?.totalPending || 0) +
                                  (effectiveReferrals?.summary?.welcomeBonusTotal || 0))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Referrer Pending */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Referrer Cash (Pending Claim)</span>
                        <span className="font-semibold text-amber-400">
                          {formatUSD(effectiveReferrals?.summary?.totalPending ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${
                              (effectiveReferrals?.summary?.totalPending /
                                ((effectiveReferrals?.summary?.totalDistributed || 1) +
                                  (effectiveReferrals?.summary?.totalPending || 0) +
                                  (effectiveReferrals?.summary?.welcomeBonusTotal || 0))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* New Member Welcome Bonus */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">New Member Welcome Bonus ($10)</span>
                        <span className="font-semibold text-purple-400">
                          {formatUSD(effectiveReferrals?.summary?.welcomeBonusTotal ?? 0)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${
                              (effectiveReferrals?.summary?.welcomeBonusTotal /
                                ((effectiveReferrals?.summary?.totalDistributed || 1) +
                                  (effectiveReferrals?.summary?.totalPending || 0) +
                                  (effectiveReferrals?.summary?.welcomeBonusTotal || 0))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-3 border border-white/5 text-xs text-muted-foreground">
                    💡 <span className="text-foreground font-medium">Program Rule:</span> Referrer earns $25 USDT when invited member completes verification, and the invited member gets $10 USDT instant welcome credit.
                  </div>
                </GlassCard>
              </div>

              {/* Top Referrers Leaderboard */}
              <GlassCard className="p-0 overflow-hidden border-amber-500/30">
                <div className="px-4 py-3 bg-amber-500/10 border-b border-border/40 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-amber-400 flex items-center gap-2">
                      <Award className="w-5 h-5" /> Top Referrers Leaderboard
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Platform champions driving user acquisition and community expansion
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.02] border-b border-border/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Rank & Referrer</th>
                        <th className="px-4 py-3 font-semibold text-center">Invited Users</th>
                        <th className="px-4 py-3 font-semibold text-right">Claimed Cash</th>
                        <th className="px-4 py-3 font-semibold text-right">Pending Cash</th>
                        <th className="px-4 py-3 font-semibold text-right">Total Earnings</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {effectiveReferrals?.topReferrers?.map((r: any, idx: number) => {
                        const isFirst = idx === 0;
                        const isSecond = idx === 1;
                        const isThird = idx === 2;

                        return (
                          <tr key={r.referrerId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    isFirst
                                      ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30"
                                      : isSecond
                                      ? "bg-zinc-300 text-black shadow-lg shadow-zinc-300/30"
                                      : isThird
                                      ? "bg-amber-700 text-white shadow-lg shadow-amber-700/30"
                                      : "glass text-muted-foreground"
                                  }`}
                                >
                                  {isFirst ? "🥇" : isSecond ? "🥈" : isThird ? "🥉" : `#${idx + 1}`}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    {r.referrerName || "Anonymous User"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{r.referrerEmail}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className="border-primary/40 text-primary font-mono">
                                {r.totalReferred} friends
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-emerald-400 text-xs">
                              {formatUSD(r.totalEarned)}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-amber-400 text-xs">
                              {formatUSD(r.totalPending)}
                            </td>

                            <td className="px-4 py-3 text-right font-mono font-bold text-white text-sm">
                              {formatUSD(r.totalEarned + r.totalPending)}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="glass hover:bg-primary/10 hover:border-primary/40 text-primary h-7 px-2.5 text-xs"
                                onClick={() => openUserDrawer(r.referrerId)}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> Profile
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FEATURE 2: USER DETAIL SIDE-PANEL DRAWER
         ───────────────────────────────────────────────────────────── */}
      {drawerUserId && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerUserId(null)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] bg-zinc-950/95 border-l border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col z-50">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-neon text-background flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                  {drawerUserData?.profile?.name?.[0] || drawerUserData?.profile?.email?.[0] || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-display font-bold text-white">
                      {drawerUserData?.profile?.name || "User Details"}
                    </h2>
                    {drawerUserData?.profile?.isBlocked && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Suspended
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{drawerUserData?.profile?.email}</p>
                </div>
              </div>

              <button
                onClick={() => setDrawerUserId(null)}
                className="p-2 rounded-xl glass hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading full user dossier...</p>
                </div>
              ) : drawerUserData ? (
                <>
                  {/* Account Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="glass rounded-xl p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-muted-foreground">Wallet Balance</div>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {formatUSD(drawerUserData.profile.balance ?? 0)}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-muted-foreground">KYC Tier</div>
                      <div className="text-sm font-semibold flex items-center gap-1 mt-0.5 text-foreground">
                        {drawerUserData.profile.kycStatus === "verified" ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <BadgeCheck className="w-4 h-4" /> Tier 2 (Verified)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Tier 1 ($500/day)</span>
                        )}
                      </div>
                    </div>
                    <div className="glass rounded-xl p-3 border border-white/5">
                      <div className="text-[10px] uppercase text-muted-foreground">Referral Code</div>
                      <div className="text-sm font-mono font-bold text-primary mt-0.5">
                        {drawerUserData.profile.referralCode || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Identity & Compliance Section */}
                  <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-white">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Identity Verification
                      </h4>
                      <Badge
                        variant="outline"
                        className={
                          drawerUserData.profile.kycStatus === "verified"
                            ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                        }
                      >
                        {drawerUserData.profile.kycStatus || "unverified"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-muted-foreground block text-[10px]">Legal Name</span>
                        <span className="font-medium text-foreground">{drawerUserData.profile.kycFullName || "—"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-muted-foreground block text-[10px]">Country</span>
                        <span className="font-medium text-foreground">{drawerUserData.profile.kycCountry || "—"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-muted-foreground block text-[10px]">Document Type</span>
                        <span className="font-medium capitalize text-foreground">
                          {drawerUserData.profile.kycDocumentType?.replace("_", " ") || "—"}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-muted-foreground block text-[10px]">Document ID</span>
                        <span className="font-mono font-medium text-primary">{drawerUserData.profile.kycDocumentNumber || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Referral Connection Section */}
                  <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-white">
                      <Gift className="w-4 h-4 text-amber-400" /> Referral Connections
                    </h4>

                    {/* Referrer */}
                    <div className="p-3 rounded-xl bg-white/[0.02] text-xs flex items-center justify-between">
                      <div>
                        <div className="text-muted-foreground text-[10px]">Referred By</div>
                        <div className="font-medium text-foreground">
                          {drawerUserData.referrer ? (
                            <span>
                              {drawerUserData.referrer.name} ({drawerUserData.referrer.email})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Organic registration (No referrer)</span>
                          )}
                        </div>
                      </div>
                      {drawerUserData.referrer && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => openUserDrawer(drawerUserData.referrer.id)}
                        >
                          View Referrer
                        </Button>
                      )}
                    </div>

                    {/* Users they referred */}
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        Invited Friends ({drawerUserData.referredUsers?.length || 0})
                      </div>
                      {drawerUserData.referredUsers?.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {drawerUserData.referredUsers.map((r: any) => (
                            <div
                              key={r.id}
                              className="p-2 rounded-lg bg-white/[0.02] text-xs flex items-center justify-between border border-white/5"
                            >
                              <div>
                                <div className="font-medium text-foreground">{r.referredName || "User"}</div>
                                <div className="text-[10px] text-muted-foreground">{r.referredEmail}</div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    r.claimed
                                      ? "border-emerald-500/40 text-emerald-400"
                                      : "border-amber-500/40 text-amber-400"
                                  }`}
                                >
                                  {r.claimed ? `+$${r.rewardAmount} Claimed` : `+$${r.rewardAmount} Pending`}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground py-2 text-center">
                          No referrals recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Portfolio Holdings */}
                  <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-white">
                      <Wallet className="w-4 h-4 text-primary" /> Crypto Holdings
                    </h4>
                    {drawerUserData.holdings?.length > 0 ? (
                      <div className="space-y-2">
                        {drawerUserData.holdings.map((h: any) => (
                          <div
                            key={h.coinId || h.symbol}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] text-xs border border-white/5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary font-mono">{h.symbol}</span>
                              <span className="text-muted-foreground">{h.name}</span>
                            </div>
                            <div className="text-right font-mono">
                              <div className="font-semibold text-foreground">{h.amount}</div>
                              {h.avgPrice && (
                                <div className="text-[10px] text-muted-foreground">
                                  Avg: {formatUSD(h.avgPrice)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground py-3 text-center">
                        No crypto holdings in wallet.
                      </div>
                    )}
                  </div>

                  {/* Recent Transactions */}
                  <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-white">
                      <Activity className="w-4 h-4 text-blue-400" /> Recent Transactions (Last 30)
                    </h4>
                    {drawerUserData.transactions?.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {drawerUserData.transactions.map((t: any) => (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-xl bg-white/[0.02] text-xs flex items-center justify-between border border-white/5"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {t.type}
                                </Badge>
                                <span className="font-medium text-foreground font-mono">
                                  {t.symbol ? t.symbol.toUpperCase() : t.toDest || "USDT"}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(t.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-semibold text-emerald-400">{formatUSD(t.total)}</div>
                              <span
                                className={`text-[10px] capitalize ${
                                  t.status === "completed"
                                    ? "text-emerald-400"
                                    : t.status === "pending"
                                    ? "text-amber-400"
                                    : "text-red-400"
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground py-3 text-center">
                        No transactions recorded for this account.
                      </div>
                    )}
                  </div>

                  {/* Quick Admin Actions on Target User */}
                  {drawerUserData.profile.id !== currentUser?.id && drawerUserData.profile.role !== "admin" && (
                    <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                      {drawerUserData.profile.isBlocked ? (
                        <Button
                          variant="outline"
                          className="flex-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => handleUnblockUser(drawerUserData.profile)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Re-activate Account
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setBlockTargetUser(drawerUserData.profile);
                            setBlockReasonText("");
                          }}
                        >
                          <Ban className="w-4 h-4 mr-1.5" /> Suspend Account
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS & DIALOGS
         ───────────────────────────────────────────────────────────── */}

      {/* Rejection Dialog for Pending KYC */}
      {rejectUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold">Reject KYC</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full h-24 glass rounded-xl p-3 text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 glass" onClick={() => setRejectUserId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={async () => {
                  try {
                    await adminApi.kycReject(rejectUserId!, rejectReason || "Documents did not pass verification.");
                    toast.success("KYC rejected");
                    setRejectUserId(null);
                    refreshOverview();
                  } catch (e) {
                    toast.error("Failed to reject");
                  }
                }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Reason Dialog */}
      {blockTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-strong border border-red-500/40 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl shadow-red-950/50 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-white">Suspend User Account</h3>
                <p className="text-xs text-zinc-400">
                  Enforce account ban and dispatch official suspension email notification.
                </p>
              </div>
            </div>

            {/* Target user details */}
            <div className="glass rounded-xl p-3 flex items-center justify-between text-xs border border-white/10">
              <div>
                <div className="font-semibold text-foreground text-sm">{blockTargetUser.name}</div>
                <div className="text-muted-foreground">{blockTargetUser.email}</div>
              </div>
              <div className="text-right">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Balance</div>
                <div className="font-mono font-bold text-emerald-400">{formatUSD(blockTargetUser.balance ?? 0)}</div>
              </div>
            </div>

            {/* Warning Notice */}
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Immediate Enforcement Notice
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                Suspending this account will immediately invalidate all active sessions, terminate ongoing access, cancel open orders, and email this suspension reason to the user.
              </p>
            </div>

            {/* Reason presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-zinc-400">Quick Reason Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {BLOCK_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBlockReasonText(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg glass hover:border-red-500/50 hover:text-white transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex justify-between">
                <span>Reason for Account Suspension (Required)</span>
                <span className="text-zinc-500 text-[10px]">{blockReasonText.length} characters</span>
              </label>
              <textarea
                value={blockReasonText}
                onChange={(e) => setBlockReasonText(e.target.value)}
                placeholder="Enter a clear, detailed reason for this suspension. This text will be displayed to the user and included in the official email notice..."
                className="w-full h-28 glass rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-500/60 border border-white/10"
              />
            </div>

            {/* Dialog action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 glass"
                disabled={blockingBusy}
                onClick={() => {
                  setBlockTargetUser(null);
                  setBlockReasonText("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={blockingBusy || !blockReasonText.trim()}
                onClick={handleBlockUser}
              >
                {blockingBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suspending...
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4 mr-1.5" /> Confirm &amp; Suspend
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// KPI Stat Card Component
const StatCard = ({ icon, label, v, sub }: { icon: any; label: string; v: string; sub?: string }) => (
  <GlassCard className="p-4 relative overflow-hidden group hover:border-primary/40 transition-colors">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
      <span className="font-medium">{label}</span>
      <div className="p-2 rounded-xl glass border border-white/5">{icon}</div>
    </div>
    <div className="text-2xl font-display font-bold text-foreground">{v}</div>
    {sub && <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div>}
  </GlassCard>
);
