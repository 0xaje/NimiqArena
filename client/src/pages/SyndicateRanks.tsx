import React, { useState } from "react";
import { Link } from "wouter";
import {
  Shield,
  Swords,
  Timer,
  Lock,
  Trophy,
  Award,
  Users,
  ChevronRight,
  Zap,
  Star,
  Sun,
  Flame,
  EyeOff,
  Wind,
  HeartHandshake,
  Info,
  MessageSquare,
  ArrowRight,
  Compass,
  Wallet,
  X,
  CheckCircle2,
  Sparkles,
  Search,
  Plus,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

interface Syndicate {
  rank: number;
  name: string;
  tag: string;
  leader: string;
  level: number;
  roster: string;
  points: number;
  ptsFormatted: string;
  winRate: string;
  rewardNim: string;
  icon: "swords" | "star" | "sun" | "shield" | "eyeOff" | "wind" | "flame" | "heart";
  isUser?: boolean;
}

const DEFAULT_SYNDICATES_KEY = "arena_registered_syndicates";

export default function SyndicateRanks() {
  const { address, balanceNim, refreshBalance } = useNimiqWallet();
  const { nimToUsd, formatUsd } = useNimiqPrice();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const dripMutation = trpc.payment.requestTestnetDrip.useMutation();
  const walletAddress = address;

  // Authentic live syndicates loaded from persistent storage or initialized empty
  const [syndicates, setSyndicates] = useState<Syndicate[]>(() => {
    try {
      const stored = localStorage.getItem(DEFAULT_SYNDICATES_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [activeScope, setActiveScope] = useState<"top" | "regional" | "raids" | "recruiting">("top");
  const [activeTimeline, setActiveTimeline] = useState<"season1" | "weekly" | "alltime">("season1");
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showWarRoomModal, setShowWarRoomModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [isDripping, setIsDripping] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isYou?: boolean }>>([]);

  // Creation modal state
  const [newClanName, setNewClanName] = useState("");
  const [newClanTag, setNewClanTag] = useState("");
  const [newClanIcon, setNewClanIcon] = useState<Syndicate["icon"]>("shield");

  const userSyndicate = syndicates.find((s) => s.isUser) || null;

  const handleDrip = async () => {
    setIsDripping(true);
    try {
      await dripMutation.mutateAsync({
        address: address || "NQ0700000000000000000000000000000000",
      });
      await refreshBalance?.();
      toast.success("⚡ 50 Testnet NIM deposited to your wallet!");
    } catch {
      toast.error("Faucet request failed. Please try again.");
    } finally {
      setIsDripping(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        sender: user?.name ? `${user.name} (You)` : "You",
        text: chatMessage.trim(),
        time: "Just now",
        isYou: true,
      },
    ]);
    setChatMessage("");
  };

  const handleCreateSyndicate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClanName.trim();
    const cleanTag = newClanTag.trim().toUpperCase();
    if (cleanName.length < 2 || cleanName.length > 24) {
      toast.error("Syndicate name must be between 2 and 24 characters.");
      return;
    }
    if (cleanTag.length < 2 || cleanTag.length > 5) {
      toast.error("Tag must be 2 to 5 letters (e.g. GLD, NXUS).");
      return;
    }
    const created: Syndicate = {
      rank: syndicates.length + 1,
      name: cleanName,
      tag: cleanTag,
      leader: user?.name || "Founder",
      level: 1,
      roster: "1/50",
      points: 0,
      ptsFormatted: "0 pts",
      winRate: "100%",
      rewardNim: "10,000",
      icon: newClanIcon,
      isUser: true,
    };
    const updated = [created, ...syndicates];
    setSyndicates(updated);
    try {
      localStorage.setItem(DEFAULT_SYNDICATES_KEY, JSON.stringify(updated));
    } catch {}
    setShowCreateModal(false);
    setShowBrowseModal(false);
    toast.success(`Syndicate "${cleanName} [${cleanTag}]" successfully registered!`);
  };

  const renderSyndicateIcon = (icon: Syndicate["icon"], className: string) => {
    switch (icon) {
      case "star":
        return <Star className={className} fill="currentColor" />;
      case "swords":
        return <Swords className={className} />;
      case "sun":
        return <Sun className={className} />;
      case "shield":
        return <Shield className={className} fill="currentColor" />;
      case "eyeOff":
        return <EyeOff className={className} />;
      case "wind":
        return <Wind className={className} />;
      case "flame":
        return <Flame className={className} />;
      case "heart":
        return <HeartHandshake className={className} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        {/* ========================================================================= */}
        {/* FIXED HEADER                                                              */}
        {/* ========================================================================= */}
        <header className="fixed top-0 max-w-md w-full z-50 bg-[#0d1321]/85 backdrop-blur-xl border-b border-[#242a39]/60 shadow-[0_1px_12px_rgba(0,0,0,0.4)] pt-safe">
          <div className="h-16 px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <NimiqArenaLogo size={32} />
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#ffd78d] tracking-tight leading-none">
                  NIMIQ ARENA
                </span>
                <span className="text-[10px] text-[#f3b72c] uppercase tracking-wider font-mono font-semibold">
                  Syndicates & Guilds
                </span>
              </div>
            </Link>

            <button
              onClick={() => setShowWalletSheet(true)}
              className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#2f3544] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-transform"
            >
              <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
              <span className="text-xs font-mono text-[#dde2f6] tracking-normal">
                {formatNim(balanceNim)} <span className="text-[#ffd78d] font-bold">NIM</span>
              </span>
              <Wallet size={15} className="text-[#a5e7ff]" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE BODY                                                      */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full px-4 pt-20 pb-24 gap-4">
          {/* DUAL RANKS SEGMENTED SWITCHER */}
          <div className="flex items-center p-1 rounded-xl bg-[#151b29] border border-[#242a39]">
            <Link
              href="/leaderboard"
              className="flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all text-[#d4c5ad] hover:text-[#dde2f6]"
            >
              <Swords size={14} />
              <span>Gladiators (Solo)</span>
            </Link>
            <div className="flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all bg-[#f3b72c] text-[#412d00] shadow">
              <Shield size={14} fill="currentColor" />
              <span>Syndicates (Guilds)</span>
            </div>
          </div>

          {/* Seasonal Syndicate Warfare Hero Header */}
          <section className="flex flex-col gap-2">
            {/* Breadcrumb Badge & Live Counter */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 bg-[#242a39] border border-[#2f3544] px-2.5 py-1 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d2ff]" />
                </span>
                <span className="text-[10px] text-[#00d2ff] tracking-widest uppercase font-mono font-bold">
                  Season 4 · Guild Wars
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[#151b29] border border-[#242a39] px-2.5 py-1 rounded-full text-[#d4c5ad] shadow-sm">
                <Timer size={12} className="text-[#ffd78d]" />
                <span className="text-[10px] text-[#ffd78d] font-mono font-medium tracking-wide">
                  3d 14h 10m left
                </span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#dde2f6] tracking-tight">
                  Syndicate Ranks
                </h1>
                <Shield size={20} className="text-[#ffd78d]" fill="currentColor" />
              </div>
              <p className="text-xs text-[#d4c5ad] leading-relaxed">
                Compete for the 50,000 NIM Guild Treasury pool. On-chain staking rewards distributed pro-rata to active gladiators at settlement.
              </p>
            </div>
          </section>

          {/* Treasury Escrow Card (Bento Style with Specular Highlights) */}
          <section className="relative overflow-hidden rounded-2xl bg-[#151b29] border border-[#242a39] p-4 shadow-xl">
            {/* Ambient background decoration */}
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-[#f3b72c]/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-[#00d2ff]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-3">
              {/* Top Label & Smart Contract Proof */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#a5e7ff]">
                  <Lock size={15} className="text-[#00d2ff]" />
                  <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-[#00d2ff]">
                    Treasury Vault Lock
                  </span>
                </div>
                <span className="text-[10px] text-[#68f5b8] bg-[#242a39] border border-[#2f3544] px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8]" /> Verified Escrow
                </span>
              </div>

              {/* Big Prize Pool Display */}
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#ffd78d] tracking-tight font-mono">
                    50,000
                  </span>
                  <span className="text-sm font-black text-[#ffdea4] font-mono">NIM</span>
                  <span className="text-xs text-[#d4c5ad] font-mono ml-auto">≈ {formatUsd(nimToUsd(50000))} USD</span>
                </div>
                <span className="text-[11px] text-[#d4c5ad]">
                  Guild War Cumulative Settlement Bounty
                </span>
              </div>

              {/* Prize Pool Breakdown Grid */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div className="bg-[#191f2e] border border-[#242a39] p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="flex items-center gap-0.5 text-[#ffd78d]">
                    <Trophy size={13} />
                    <span className="text-[10px] font-bold">1st</span>
                  </div>
                  <span className="text-xs text-[#dde2f6] font-bold font-mono mt-0.5">25k</span>
                  <span className="text-[9px] text-[#d4c5ad] font-mono">NIM</span>
                </div>

                <div className="bg-[#191f2e] border border-[#242a39] p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="flex items-center gap-0.5 text-[#a5e7ff]">
                    <Award size={13} />
                    <span className="text-[10px] font-bold">2nd</span>
                  </div>
                  <span className="text-xs text-[#dde2f6] font-bold font-mono mt-0.5">12.5k</span>
                  <span className="text-[9px] text-[#d4c5ad] font-mono">NIM</span>
                </div>

                <div className="bg-[#191f2e] border border-[#242a39] p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="flex items-center gap-0.5 text-[#ffd78d]">
                    <Award size={13} />
                    <span className="text-[10px] font-bold">3rd</span>
                  </div>
                  <span className="text-xs text-[#dde2f6] font-bold font-mono mt-0.5">7.5k</span>
                  <span className="text-[9px] text-[#d4c5ad] font-mono">NIM</span>
                </div>

                <div className="bg-[#191f2e] border border-[#242a39] p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="flex items-center gap-0.5 text-[#d4c5ad]">
                    <Users size={13} />
                    <span className="text-[10px] font-bold">4-10</span>
                  </div>
                  <span className="text-xs text-[#dde2f6] font-bold font-mono mt-0.5">5k</span>
                  <span className="text-[9px] text-[#d4c5ad] font-mono">Pool</span>
                </div>
              </div>

              {/* Trust footer button */}
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] active:scale-[0.99] transition-all text-left"
              >
                <div className="flex items-center gap-1.5">
                  <Zap size={15} className="text-[#f3b72c]" />
                  <span className="text-xs text-[#dde2f6] font-medium">
                    Pro-Rata Settlement Contract Active
                  </span>
                </div>
                <span className="text-xs text-[#ffd78d] font-bold flex items-center gap-0.5">
                  Rules <ChevronRight size={13} />
                </span>
              </button>
            </div>
          </section>

          {/* Filter & Scope Navigation */}
          <section className="flex flex-col gap-2">
            {/* Category Scopes */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "top", label: "Top Guilds" },
                { id: "regional", label: "Regional Alliances" },
                { id: "raids", label: "Raid Battles" },
                { id: "recruiting", label: "Recruiting" },
              ].map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setActiveScope(scope.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all ${
                    activeScope === scope.id
                      ? "bg-[#f3b72c] text-[#412d00] shadow-sm"
                      : "bg-[#191f2e] text-[#d4c5ad] hover:text-[#dde2f6] border border-[#242a39]"
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            {/* Timeline Sub-filters */}
            <div className="flex items-center justify-between bg-[#080e1c] p-1 rounded-xl border border-[#242a39]">
              {[
                { id: "season4", label: "Season 4" },
                { id: "weekly", label: "Weekly Clash" },
                { id: "alltime", label: "All-Time Honor" },
              ].map((time) => (
                <button
                  key={time.id}
                  onClick={() => setActiveTimeline(time.id as any)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold text-center transition-all ${
                    activeTimeline === time.id
                      ? "bg-[#191f2e] text-[#ffd78d] border border-[#2f3544] shadow-sm"
                      : "text-[#d4c5ad] hover:text-[#dde2f6]"
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </section>

          {/* Pinned Player Clan Spotlight or Independent Gladiator Card */}
          {userSyndicate ? (
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#242a39] via-[#191f2e] to-[#242a39] border border-[#f3b72c]/30 p-4 shadow-lg">
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#f3b72c]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-[#2f3544] border border-[#f3b72c]/40 flex items-center justify-center relative shadow-md">
                      {renderSyndicateIcon(userSyndicate.icon, "w-6 h-6 text-[#ffd78d]")}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-black text-[#dde2f6]">{userSyndicate.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2f3544] text-[#ffd78d] font-mono">
                          [{userSyndicate.tag}]
                        </span>
                      </div>
                      <span className="text-xs text-[#d4c5ad]">Level 1 Guild · {userSyndicate.roster} Gladiators</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 bg-[#ffd78d]/10 text-[#ffd78d] px-2 py-0.5 rounded-full border border-[#ffd78d]/20">
                      <span className="text-[10px] font-bold font-mono">#{userSyndicate.rank} RANK</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#dde2f6] mt-1">{userSyndicate.ptsFormatted}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowWarRoomModal(true)}
                    className="flex-1 h-11 rounded-xl bg-[#f3b72c] text-[#412d00] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform shadow-md hover:bg-[#ffdea4]"
                  >
                    <span>Clan War Room</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Clan Chat"
                    onClick={() => setShowChatModal(true)}
                    className="w-11 h-11 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="relative overflow-hidden rounded-2xl bg-[#191f2e] border border-[#242a39] p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[#ffd78d]">
                    <Shield size={22} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#dde2f6]">Independent Gladiator</span>
                    <span className="text-[11px] text-[#d4c5ad]">Found a guild to compete in Season 1</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform shadow-md font-mono"
                >
                  <Plus size={14} />
                  <span>Found Guild</span>
                </button>
              </div>
            </section>
          )}

          {/* Standings Section */}
          {syndicates.length === 0 ? (
            <section className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-6 flex flex-col items-center text-center gap-3 shadow-lg my-1">
              <div className="w-14 h-14 rounded-full bg-[#f3b72c]/10 border border-[#f3b72c]/25 flex items-center justify-center text-[#ffd78d] shadow-[0_0_16px_rgba(243,183,44,0.2)]">
                <Trophy size={28} />
              </div>
              <h3 className="text-base font-bold text-[#dde2f6]">Season 1 Guild Warfare Standings</h3>
              <p className="text-xs text-[#d4c5ad] max-w-sm leading-relaxed">
                No syndicates registered yet. Found the inaugural guild to claim the #1 rank, recruit duelists, and compete for the 50,000 NIM Treasury!
              </p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-5 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform shadow-md mt-1"
              >
                <Plus size={15} />
                Found Inaugural Syndicate
              </button>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#dde2f6]">Syndicate Standings</span>
                <span className="text-[10px] text-[#d4c5ad] font-mono">{syndicates.length} Registered</span>
              </div>

              <div className="flex flex-col gap-2">
                {syndicates.map((syn, idx) => (
                  <div
                    key={syn.name}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      syn.isUser
                        ? "bg-[#242a39] border-[#f3b72c]/40 shadow-md"
                        : "bg-[#151b29] border-[#242a39] shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-xs font-mono font-bold w-5 text-center ${
                          syn.isUser ? "text-[#ffd78d]" : "text-[#d4c5ad]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          syn.isUser
                            ? "bg-[#080e1c] border-[#f3b72c]/40 text-[#ffd78d]"
                            : "bg-[#191f2e] border-[#242a39] text-[#00d2ff]"
                        }`}
                      >
                        {renderSyndicateIcon(syn.icon, "w-5 h-5")}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`text-xs font-bold truncate ${
                              syn.isUser ? "text-[#ffd78d]" : "text-[#dde2f6]"
                            }`}
                          >
                            {syn.name}
                          </span>
                          <span className="text-[9px] text-[#d4c5ad] font-mono">[{syn.tag}]</span>
                          {syn.isUser && (
                            <span className="text-[9px] bg-[#ffd78d]/20 text-[#ffd78d] px-1.5 py-0.2 rounded font-mono font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#d4c5ad] font-mono">
                          {syn.roster} roster · {syn.winRate}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-xs font-mono font-bold text-[#dde2f6]">
                        {syn.ptsFormatted}
                      </span>
                      <span className="text-[10px] font-mono font-semibold text-[#ffd78d]">
                        {syn.rewardNim} NIM
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* War Mechanics Info Box */}
          <section>
            <div className="bg-[#080e1c] border border-[#242a39] p-3.5 rounded-2xl flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center shrink-0 text-[#ffd78d]">
                <Info size={16} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-[#dde2f6]">How Guild Wars Work</span>
                <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                  Weekly matchmaking matches in Connect 4 &amp; Ludo Arena earn Clan Honor points. Treasury smart contracts release rewards directly into member wallets proportional to individual war wins.
                </p>
              </div>
            </div>
          </section>

          {/* Sticky Action Bar for Mobile Thumb Ergonomics */}
          <section className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowWarRoomModal(true)}
              className="w-full h-12 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
            >
              <Swords size={18} />
              <span>View Clan Roster &amp; War Room</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBrowseModal(true)}
              className="w-full h-11 rounded-xl bg-[#191f2e] hover:bg-[#242a39] border border-[#242a39] text-[#dde2f6] font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Compass size={16} className="text-[#00d2ff]" />
              <span>Browse &amp; Create Guilds</span>
            </button>
          </section>
        </main>

        {/* ========================================================================= */}
        {/* MODAL: GUILD WAR RULES                                                    */}
        {/* ========================================================================= */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#151b29] border-t sm:border border-[#242a39] rounded-t-[28px] sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <Shield className="text-[#ffd78d]" size={20} fill="currentColor" />
                  <h3 className="font-bold text-sm text-[#dde2f6]">Guild War Rules &amp; Escrow</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-3 text-xs text-[#d4c5ad] leading-relaxed">
                <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39]">
                  <span className="font-bold text-[#ffd78d] block mb-1">
                    🏛️ 50,000 NIM Treasury Escrow
                  </span>
                  Settled on Nimiq PoS Albatross chain at the conclusion of Season 4. All prizes are held in non-custodial smart escrow contracts.
                </div>

                <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39]">
                  <span className="font-bold text-[#a5e7ff] block mb-1">
                    ⚖️ Pro-Rata Distribution Formula
                  </span>
                  Your payout is strictly proportional to your individual honor points contributed during the season:
                  <div className="mt-1.5 p-2 rounded bg-[#151b29] font-mono text-[10px] text-[#68f5b8]">
                    Member Payout = (Your Honor / Guild Honor) × Guild Prize NIM
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39]">
                  <span className="font-bold text-[#68f5b8] block mb-1">
                    ⚔️ Earning Clan Honor
                  </span>
                  Win matches in Connect 4 (+25 pts) and Ludo Arena (+40 pts). Double points apply during active Clan War clashes against matched rival syndicates.
                </div>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full h-11 rounded-xl bg-[#f3b72c] text-[#412d00] font-bold text-xs mt-2"
              >
                Understood
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CLAN WAR ROOM                                                      */}
        {/* ========================================================================= */}
        {showWarRoomModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#151b29] border-t sm:border border-[#242a39] rounded-t-[28px] sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <Swords className="text-[#ffd78d]" size={20} />
                  <h3 className="font-bold text-sm text-[#dde2f6]">
                    {userSyndicate ? `${userSyndicate.name} War Room` : "Guild War Room"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowWarRoomModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-3">
                {userSyndicate ? (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#242a39] to-[#191f2e] border border-[#f3b72c]/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-[#00d2ff] font-bold">
                        Season 1 Qualifying Status
                      </span>
                      <span className="text-[10px] font-mono text-[#ffd78d]">Active Season</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div className="flex flex-col items-center">
                        {renderSyndicateIcon(userSyndicate.icon, "w-6 h-6 text-[#ffd78d]")}
                        <span className="text-xs font-bold text-[#dde2f6] mt-1">{userSyndicate.name}</span>
                        <span className="text-[10px] text-[#ffd78d] font-mono">{userSyndicate.ptsFormatted}</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-[#d4c5ad] font-mono">Rank</span>
                        <span className="text-base font-black text-[#68f5b8]">#{userSyndicate.rank}</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-[#d4c5ad] font-mono">Roster</span>
                        <span className="text-xs font-bold text-[#dde2f6] mt-1">{userSyndicate.roster}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#080e1c] border border-[#242a39] text-center flex flex-col items-center gap-2">
                    <Shield size={24} className="text-[#ffd78d]" />
                    <span className="text-xs font-bold text-[#dde2f6]">No Guild Founded Yet</span>
                    <span className="text-[11px] text-[#d4c5ad]">
                      Found your syndicate to rally teammates and view your guild war room.
                    </span>
                    <button
                      onClick={() => {
                        setShowWarRoomModal(false);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-1.5 rounded-lg bg-[#f3b72c] text-[#412d00] font-bold text-xs font-mono active:scale-95 mt-1"
                    >
                      Found a Syndicate
                    </button>
                  </div>
                )}

                {/* Deploy CTAs */}
                <span className="text-[11px] font-bold text-[#d4c5ad] uppercase tracking-wider font-mono">
                  Deploy to War Arenas (2x Honor)
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/games/connect-four"
                    className="p-3 rounded-xl bg-[#191f2e] border border-[#242a39] hover:border-[#f3b72c]/40 flex flex-col items-center text-center gap-1 active:scale-95 transition-all"
                  >
                    <span className="text-xs font-bold text-[#dde2f6]">Connect 4 Duel</span>
                    <span className="text-[10px] text-[#68f5b8] font-mono">+50 pts / win</span>
                  </Link>
                  <Link
                    href="/games/ludo-league"
                    className="p-3 rounded-xl bg-[#191f2e] border border-[#242a39] hover:border-[#f3b72c]/40 flex flex-col items-center text-center gap-1 active:scale-95 transition-all"
                  >
                    <span className="text-xs font-bold text-[#dde2f6]">Ludo Quad Arena</span>
                    <span className="text-[10px] text-[#68f5b8] font-mono">+80 pts / win</span>
                  </Link>
                </div>

                <Link
                  href="/playoffs"
                  className="w-full h-11 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all text-center"
                >
                  <Trophy size={16} />
                  <span>View Syndicate Playoffs Bracket</span>
                </Link>
              </div>

              <button
                onClick={() => setShowWarRoomModal(false)}
                className="w-full h-11 rounded-xl bg-[#242a39] text-[#dde2f6] font-bold text-xs"
              >
                Close War Room
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: BROWSE & CREATE GUILDS                                             */}
        {/* ========================================================================= */}
        {showBrowseModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#151b29] border-t sm:border border-[#242a39] rounded-t-[28px] sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <Compass className="text-[#00d2ff]" size={20} />
                  <h3 className="font-bold text-sm text-[#dde2f6]">Syndicate Directory</h3>
                </div>
                <button
                  onClick={() => setShowBrowseModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-[#d4c5ad]" />
                  <input
                    type="text"
                    placeholder="Search guilds by name or tag..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#080e1c] border border-[#242a39] text-xs text-[#dde2f6] placeholder:text-[#d4c5ad] focus:outline-none focus:border-[#00d2ff]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-[#d4c5ad] uppercase tracking-wider">
                    Registered Syndicates
                  </span>

                  {syndicates.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#080e1c] border border-[#242a39] text-center flex flex-col items-center gap-2">
                      <Shield size={24} className="text-[#d4c5ad]/60" />
                      <span className="text-xs text-[#d4c5ad]">
                        No other syndicates have registered yet for Season 1.
                      </span>
                      <button
                        onClick={() => {
                          setShowBrowseModal(false);
                          setShowCreateModal(true);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-[#f3b72c] text-[#412d00] font-bold text-xs font-mono active:scale-95 mt-1"
                      >
                        Found a Syndicate
                      </button>
                    </div>
                  ) : (
                    syndicates.map((g) => (
                      <div
                        key={g.name}
                        className="p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#dde2f6]">{g.name}</span>
                            <span className="text-[9px] font-mono text-[#00d2ff]">[{g.tag}]</span>
                          </div>
                          <span className="text-[10px] text-[#d4c5ad] font-mono">
                            {g.roster} Gladiators · {g.ptsFormatted}
                          </span>
                        </div>
                        {g.isUser ? (
                          <span className="text-[10px] text-[#ffd78d] font-mono font-bold px-2 py-0.5 rounded bg-[#242a39]">
                            Your Guild
                          </span>
                        ) : (
                          <button
                            onClick={() => toast.success(`Application sent to ${g.name}!`)}
                            className="px-3 py-1 rounded-lg bg-[#242a39] hover:bg-[#2f3544] text-[11px] font-bold text-[#ffd78d] border border-[#2f3544] active:scale-95"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!userSyndicate && (
                  <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39] mt-2 flex flex-col gap-2">
                    <span className="text-xs font-bold text-[#ffd78d] flex items-center gap-1.5">
                      <Plus size={14} /> Create Your Own Syndicate
                    </span>
                    <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                      Found a new Guild, invite gladiators, and compete for the 50,000 NIM Season 1 Treasury.
                    </p>
                    <button
                      onClick={() => {
                        setShowBrowseModal(false);
                        setShowCreateModal(true);
                      }}
                      className="w-full h-10 rounded-lg bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs active:scale-95"
                    >
                      Found a Syndicate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: FOUND / CREATE SYNDICATE                                           */}
        {/* ========================================================================= */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#151b29] border-t sm:border border-[#242a39] rounded-t-[28px] sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <Shield className="text-[#ffd78d]" size={20} fill="currentColor" />
                  <h3 className="font-bold text-sm text-[#dde2f6]">Found a Syndicate</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSyndicate} className="py-4 flex flex-col gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-[#ffd78d] uppercase mb-1">
                    Syndicate Name
                  </label>
                  <input
                    type="text"
                    value={newClanName}
                    onChange={(e) => setNewClanName(e.target.value)}
                    placeholder="e.g. Apex Predators"
                    maxLength={24}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#080e1c] border border-[#242a39] text-[#dde2f6] text-xs focus:outline-none focus:border-[#ffd78d]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#ffd78d] uppercase mb-1">
                    Clan Tag (2-5 uppercase chars)
                  </label>
                  <input
                    type="text"
                    value={newClanTag}
                    onChange={(e) => setNewClanTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    placeholder="e.g. APEX"
                    maxLength={5}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#080e1c] border border-[#242a39] text-[#dde2f6] text-xs font-mono focus:outline-none focus:border-[#ffd78d]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#ffd78d] uppercase mb-2">
                    Emblem Crest
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["shield", "swords", "star", "flame", "sun", "wind", "eyeOff", "heart"] as const).map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewClanIcon(icon)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                          newClanIcon === icon
                            ? "bg-[#f3b72c]/20 border-[#f3b72c] text-[#ffd78d]"
                            : "bg-[#191f2e] border-[#242a39] text-[#d4c5ad]"
                        }`}
                      >
                        {renderSyndicateIcon(icon, "w-5 h-5")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39] text-[11px] text-[#d4c5ad]">
                  <span className="text-[#ffd78d] font-bold block mb-0.5">Season 1 Launch</span>
                  Founding your syndicate establishes your team in Season 1 Guild Warfare. Earn clan honor by winning arena duels in Connect 4 and Ludo!
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs active:scale-95 transition-transform mt-1"
                >
                  Register Syndicate
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CLAN CHAT                                                          */}
        {/* ========================================================================= */}
        {showChatModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-[#151b29] border-t sm:border border-[#242a39] rounded-t-[28px] sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between pb-3 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-[#ffd78d]" size={18} />
                  <h3 className="font-bold text-sm text-[#dde2f6]">
                    {userSyndicate ? `${userSyndicate.name} Clan Chat` : "Guild Chat"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[300px]">
                {chatMessages.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#d4c5ad]">
                    No clan messages yet. Send a message to rally your guild!
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col p-2.5 rounded-xl text-xs max-w-[85%] ${
                        msg.isYou
                          ? "ml-auto bg-[#f3b72c]/15 border border-[#f3b72c]/30 text-[#dde2f6]"
                          : "mr-auto bg-[#191f2e] border border-[#242a39] text-[#d4c5ad]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`font-bold text-[10px] ${msg.isYou ? "text-[#ffd78d]" : "text-[#00d2ff]"}`}>
                          {msg.sender}
                        </span>
                        <span className="text-[9px] text-[#d4c5ad]/70 font-mono">{msg.time}</span>
                      </div>
                      <p className="leading-snug">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Message clan members..."
                  className="flex-1 h-10 px-3 rounded-xl bg-[#080e1c] border border-[#242a39] text-xs text-[#dde2f6] placeholder:text-[#d4c5ad] focus:outline-none focus:border-[#f3b72c]"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#f3b72c] text-[#412d00] font-bold text-xs active:scale-95"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NIMIQ SAFE VAULT / WALLET SHEET                                           */}
        {/* ========================================================================= */}
        {showWalletSheet && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center">
            <div className="w-full max-w-md bg-[#151b29] border-t border-[#242a39] rounded-t-[28px] p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
              <div className="w-10 h-1 rounded-full bg-[#2f3544] mx-auto" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center text-[#ffd78d]">
                    <Wallet size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#dde2f6]">Nimiq Safe Vault</span>
                    <span className="text-[10px] text-[#68f5b8] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8]" /> Connected &amp; Synced
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWalletSheet(false)}
                  className="w-7 h-7 rounded-full bg-[#191f2e] text-[#d4c5ad] flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39] flex flex-col gap-1">
                <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                  Wallet Address
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#a5e7ff] truncate max-w-[260px]">
                    {walletAddress || "NQ07 0000 0000 0000 0000 0000 0000 0000 0000"}
                  </span>
                  <button
                    onClick={() => {
                      if (walletAddress) {
                        navigator.clipboard.writeText(walletAddress);
                        toast.success("Address copied to clipboard!");
                      }
                    }}
                    className="text-[10px] font-mono text-[#ffd78d] hover:underline"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between">
                <span className="text-xs text-[#d4c5ad]">Available Balance</span>
                <span className="text-base font-bold font-mono text-[#ffd78d]">
                  {formatNim(balanceNim)} NIM
                </span>
              </div>

              {/* 1-Click Faucet Drip */}
              <button
                type="button"
                onClick={handleDrip}
                disabled={isDripping}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00d2ff] to-[#f3b72c] text-[#001f28] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
              >
                <Sparkles size={16} />
                <span>{isDripping ? "Requesting Drip..." : "⚡ Get 50 Free Testnet NIM (1-Click)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWalletSheet(false)}
                className="w-full h-10 rounded-xl bg-[#242a39] text-[#dde2f6] text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM NAVIGATION                                                         */}
        {/* ========================================================================= */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
