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

const SYNDICATES: Syndicate[] = [
  {
    rank: 1,
    name: "Nexus Syn.",
    tag: "NXUS",
    leader: "ApexPredator",
    level: 32,
    roster: "50/50",
    points: 58920,
    ptsFormatted: "58,920 pt",
    winRate: "84.2% WR",
    rewardNim: "25,000",
    icon: "star",
  },
  {
    rank: 2,
    name: "Cyber Samurai",
    tag: "CYBR",
    leader: "Ronin",
    level: 29,
    roster: "49/50",
    points: 46180,
    ptsFormatted: "46,180 pt",
    winRate: "81.0% WR",
    rewardNim: "12,500",
    icon: "swords",
  },
  {
    rank: 3,
    name: "Solaris Kts",
    tag: "SLRS",
    leader: "SolarisK",
    level: 27,
    roster: "46/50",
    points: 41800,
    ptsFormatted: "41,800 pt",
    winRate: "78.5% WR",
    rewardNim: "7,500",
    icon: "sun",
  },
  {
    rank: 4,
    name: "Gold Legion",
    tag: "GLDN",
    leader: "Valkyrie",
    level: 24,
    roster: "48/50",
    points: 38450,
    ptsFormatted: "38,450 pts",
    winRate: "76.4% WR",
    rewardNim: "+1,200 NIM",
    icon: "shield",
    isUser: true,
  },
  {
    rank: 5,
    name: "Shadow Stalkers",
    tag: "SHDW",
    leader: "NightBlade",
    level: 22,
    roster: "45/50",
    points: 34200,
    ptsFormatted: "34,200 pts",
    winRate: "73.1% WR",
    rewardNim: "+950 NIM",
    icon: "eyeOff",
  },
  {
    rank: 6,
    name: "Quantum Vanguard",
    tag: "QNTM",
    leader: "Chronos",
    level: 21,
    roster: "50/50",
    points: 31900,
    ptsFormatted: "31,900 pts",
    winRate: "71.8% WR",
    rewardNim: "+800 NIM",
    icon: "wind",
  },
  {
    rank: 7,
    name: "Obsidian Dragons",
    tag: "DRGN",
    leader: "Ignis",
    level: 19,
    roster: "42/50",
    points: 28600,
    ptsFormatted: "28,600 pts",
    winRate: "69.4% WR",
    rewardNim: "+650 NIM",
    icon: "flame",
  },
  {
    rank: 8,
    name: "Iron Valkyries",
    tag: "VALK",
    leader: "Freya",
    level: 18,
    roster: "47/50",
    points: 26100,
    ptsFormatted: "26,100 pts",
    winRate: "68.2% WR",
    rewardNim: "+500 NIM",
    icon: "heart",
  },
];

export default function SyndicateRanks() {
  const { address, balanceNim, refreshBalance } = useNimiqWallet();
  const { nimToUsd, formatUsd } = useNimiqPrice();
  const dripMutation = trpc.payment.requestTestnetDrip.useMutation();
  const walletAddress = address;
  const [activeScope, setActiveScope] = useState<"top" | "regional" | "raids" | "recruiting">("top");
  const [activeTimeline, setActiveTimeline] = useState<"season4" | "weekly" | "alltime">("season4");
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showWarRoomModal, setShowWarRoomModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [isDripping, setIsDripping] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isYou?: boolean }>>([
    { sender: "NimiqGladiator", text: "Guild rally active! We need more wins in Connect NIM and Ludo.", time: "10m ago" },
    { sender: "ZeroCool", text: "Just won 3 straight in Ludo Arena (+180 pts to treasury)", time: "6m ago" },
    { sender: "You", text: "Locking down the Diamond bracket right now. Let's hit top 3!", time: "2m ago", isYou: true },
  ]);

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
        sender: "You (Valkyrie)",
        text: chatMessage.trim(),
        time: "Just now",
        isYou: true,
      },
    ]);
    setChatMessage("");
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

          {/* Pinned Player Clan Spotlight Card ("Gold Legion") */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#242a39] via-[#191f2e] to-[#242a39] border border-[#f3b72c]/30 p-4 shadow-lg">
            {/* Golden Ambient Accent */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-[#f3b72c]/15 rounded-full blur-2xl" />

            <div className="relative z-10 flex flex-col gap-3">
              {/* Top Clan Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Clan Crest */}
                  <div className="w-11 h-11 rounded-xl bg-[#2f3544] border border-[#f3b72c]/40 flex items-center justify-center relative shadow-md">
                    <Shield size={24} className="text-[#ffd78d]" fill="currentColor" />
                    <Swords size={12} className="absolute text-[#0d1321] top-3" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-[#dde2f6]">Gold Legion</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2f3544] text-[#ffd78d] font-mono">
                        GLDN
                      </span>
                    </div>
                    <span className="text-xs text-[#d4c5ad]">Level 24 Clan · 48/50 Gladiators</span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 bg-[#ffd78d]/10 text-[#ffd78d] px-2 py-0.5 rounded-full border border-[#ffd78d]/20">
                    <span className="text-[10px] font-bold font-mono">#4 RANK</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#dde2f6] mt-1">38,450 pts</span>
                </div>
              </div>

              {/* Personal Contribution Bar */}
              <div className="flex flex-col gap-1.5 bg-[#080e1c]/80 border border-[#242a39] p-2.5 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#d4c5ad] flex items-center gap-1">
                    <Award size={13} className="text-[#ffd78d]" /> Top 5 Contributor
                  </span>
                  <span className="text-[#00d2ff] font-mono font-bold">+380 NIM Est. Payout</span>
                </div>

                {/* Progress bar towards next tier */}
                <div className="w-full bg-[#242a39] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#00d2ff] to-[#f3b72c] h-full rounded-full transition-all duration-500"
                    style={{ width: "78%" }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#d4c5ad] font-mono">
                  <span>Your Honor: 1,840 pts</span>
                  <span>War Win Rate: 76.4%</span>
                </div>
              </div>

              {/* CTA Row */}
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

          {/* Top 3 Syndicate Podium */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#dde2f6]">Syndicate High Council</span>
              <span className="text-[10px] text-[#d4c5ad] font-mono">Top Tier Dominance</span>
            </div>

            {/* 3-Column Podium Layout */}
            <div className="grid grid-cols-3 gap-2 items-end pt-4">
              {/* Rank 2: Cyber Samurai (Left) */}
              <div className="flex flex-col items-center bg-[#151b29] border border-[#242a39] rounded-2xl p-2.5 relative shadow-md">
                <div className="absolute -top-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-[#242a39] border border-[#00d2ff]/40 text-[#00d2ff] text-xs font-mono font-bold shadow-md">
                  2
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center mt-2 relative overflow-hidden">
                  <Swords size={22} className="text-[#a5e7ff]" />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] mt-2 text-center truncate w-full">
                  Cyber Samurai
                </span>
                <span className="text-[9px] text-[#a5e7ff] font-mono">[CYBR]</span>
                <span className="text-[10px] text-[#d4c5ad] truncate max-w-full">Ronin</span>
                <div className="w-full bg-[#080e1c] border border-[#242a39] rounded-lg p-1.5 mt-2 flex flex-col items-center">
                  <span className="text-xs text-[#ffd78d] font-bold font-mono">12,500</span>
                  <span className="text-[8px] text-[#d4c5ad] font-mono">NIM</span>
                  <span className="text-[9px] text-[#dde2f6] font-mono font-semibold mt-0.5">
                    46,180 pt
                  </span>
                </div>
              </div>

              {/* Rank 1: Nexus Syndicate (Center - Elevated) */}
              <div className="flex flex-col items-center bg-[#191f2e] border-2 border-[#f3b72c]/50 rounded-2xl p-3 relative shadow-xl transform -translate-y-2">
                <div className="absolute -top-4 flex items-center justify-center w-8 h-8 rounded-full bg-[#f3b72c] text-[#412d00] font-mono font-black shadow-lg">
                  <Trophy size={16} />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#242a39] border border-[#f3b72c]/40 flex items-center justify-center mt-2 relative shadow-lg shadow-[#f3b72c]/20">
                  <Star size={28} className="text-[#ffd78d]" fill="currentColor" />
                </div>
                <span className="text-xs font-black text-[#ffd78d] mt-2 text-center truncate w-full">
                  Nexus Syn.
                </span>
                <span className="text-[9px] text-[#ffdea4] font-mono">[NXUS]</span>
                <span className="text-[10px] text-[#d4c5ad] truncate max-w-full">ApexPredator</span>
                <div className="w-full bg-[#080e1c] border border-[#242a39] rounded-lg p-1.5 mt-2 flex flex-col items-center">
                  <span className="text-sm text-[#ffd78d] font-bold font-mono">25,000</span>
                  <span className="text-[8px] text-[#ffd78d] uppercase font-mono">NIM First Crest</span>
                  <span className="text-[10px] text-[#dde2f6] font-mono font-bold mt-0.5">
                    58,920 pt
                  </span>
                  <span className="text-[9px] text-[#68f5b8] font-mono">84.2% WR</span>
                </div>
              </div>

              {/* Rank 3: Solaris Knights (Right) */}
              <div className="flex flex-col items-center bg-[#151b29] border border-[#242a39] rounded-2xl p-2.5 relative shadow-md">
                <div className="absolute -top-3.5 flex items-center justify-center w-7 h-7 rounded-full bg-[#242a39] border border-[#ffd78d]/40 text-[#ffd78d] text-xs font-mono font-bold shadow-md">
                  3
                </div>
                <div className="w-12 h-12 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center mt-2 relative overflow-hidden">
                  <Sun size={22} className="text-[#ffd78d]" />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] mt-2 text-center truncate w-full">
                  Solaris Kts
                </span>
                <span className="text-[9px] text-[#ffd78d] font-mono">[SLRS]</span>
                <span className="text-[10px] text-[#d4c5ad] truncate max-w-full">SolarisK</span>
                <div className="w-full bg-[#080e1c] border border-[#242a39] rounded-lg p-1.5 mt-2 flex flex-col items-center">
                  <span className="text-xs text-[#ffd78d] font-bold font-mono">7,500</span>
                  <span className="text-[8px] text-[#d4c5ad] font-mono">NIM</span>
                  <span className="text-[9px] text-[#dde2f6] font-mono font-semibold mt-0.5">
                    41,800 pt
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard Table (#4 - #8+) */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#dde2f6]">Contenders Rank (#4 - #10)</span>
              <span className="text-[10px] text-[#00d2ff] font-mono">5,000 NIM Shared Pool</span>
            </div>

            <div className="flex flex-col gap-2">
              {SYNDICATES.slice(3).map((syn) => (
                <div
                  key={syn.name}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    syn.isUser
                      ? "bg-[#242a39] border-[#f3b72c]/40 shadow-md"
                      : "bg-[#151b29] border-[#242a39] shadow-sm hover:border-[#2f3544]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-xs font-mono font-bold w-5 text-center ${
                        syn.isUser ? "text-[#ffd78d]" : "text-[#d4c5ad]"
                      }`}
                    >
                      {syn.rank}
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
                        {syn.isUser ? (
                          <span className="text-[9px] bg-[#ffd78d]/20 text-[#ffd78d] px-1.5 py-0.5 rounded font-mono font-bold">
                            YOU
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#d4c5ad] font-mono">[{syn.tag}]</span>
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
                    <span
                      className={`text-[10px] font-mono font-semibold ${
                        syn.isUser ? "text-[#ffd78d]" : "text-[#d4c5ad]"
                      }`}
                    >
                      {syn.rewardNim}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                  <h3 className="font-bold text-sm text-[#dde2f6]">Gold Legion War Room</h3>
                </div>
                <button
                  onClick={() => setShowWarRoomModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-3">
                {/* Active War Matchup */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#242a39] to-[#191f2e] border border-[#f3b72c]/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#00d2ff] font-bold">
                      Active War Clash
                    </span>
                    <span className="text-[10px] font-mono text-[#ffd78d]">1d 8h remaining</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col items-center">
                      <Shield size={24} className="text-[#ffd78d]" fill="currentColor" />
                      <span className="text-xs font-bold text-[#dde2f6] mt-1">Gold Legion</span>
                      <span className="text-[10px] text-[#ffd78d] font-mono">38,450 pts</span>
                    </div>

                    <span className="text-sm font-black text-[#f3b72c]">VS</span>

                    <div className="flex flex-col items-center">
                      <Swords size={24} className="text-[#00d2ff]" />
                      <span className="text-xs font-bold text-[#dde2f6] mt-1">Cyber Samurai</span>
                      <span className="text-[10px] text-[#00d2ff] font-mono">46,180 pts</span>
                    </div>
                  </div>

                  <div className="w-full bg-[#080e1c] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#f3b72c] h-full" style={{ width: "45%" }} />
                    <div className="bg-[#00d2ff] h-full" style={{ width: "55%" }} />
                  </div>
                </div>

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
                    Actively Recruiting Syndicates
                  </span>

                  {[
                    { name: "Obsidian Dragons", tag: "DRGN", roster: "42/50", minLvl: "LVL 15+" },
                    { name: "Iron Valkyries", tag: "VALK", roster: "47/50", minLvl: "LVL 10+" },
                    { name: "Shadow Stalkers", tag: "SHDW", roster: "45/50", minLvl: "LVL 20+" },
                  ].map((g) => (
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
                          {g.roster} · Min {g.minLvl}
                        </span>
                      </div>
                      <button
                        onClick={() => toast.success(`Application sent to ${g.name}!`)}
                        className="px-3 py-1 rounded-lg bg-[#242a39] hover:bg-[#2f3544] text-[11px] font-bold text-[#ffd78d] border border-[#2f3544] active:scale-95"
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-[#080e1c] border border-[#242a39] mt-2 flex flex-col gap-2">
                  <span className="text-xs font-bold text-[#ffd78d] flex items-center gap-1.5">
                    <Plus size={14} /> Create Your Own Syndicate
                  </span>
                  <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                    Stake a 100 NIM treasury creation bond to found a new Guild and recruit up to 50 gladiators for Season 4.
                  </p>
                  <button
                    onClick={() => {
                      setShowBrowseModal(false);
                      setShowWalletSheet(true);
                      toast.info("Open wallet to fund 100 NIM guild creation bond.");
                    }}
                    className="w-full h-10 rounded-lg bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs active:scale-95"
                  >
                    Found a Syndicate (100 NIM)
                  </button>
                </div>
              </div>
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
                  <h3 className="font-bold text-sm text-[#dde2f6]">Gold Legion Clan Chat</h3>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-4 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[300px]">
                {chatMessages.map((msg, i) => (
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
                ))}
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
