import React, { useState } from "react";
import { Link } from "wouter";
import {
  Trophy,
  Crown,
  Medal,
  Timer,
  ChevronRight,
  TrendingUp,
  Diamond,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Users,
  RotateCw,
  Sparkles,
  Wallet,
  X,
  Swords,
  Shield,
  Layers,
  Award,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

interface Gladiator {
  rank: number;
  name: string;
  avatar: string;
  clan: string;
  tier: string;
  elo: number;
  winRate: string;
  streak: string;
  rewardNim: string;
  isVerified?: boolean;
  isUser?: boolean;
}

export default function Leaderboard() {
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { nimToUsd, formatUsd } = useNimiqPrice();

  const { balanceNim, balanceStatus } = useNimiqWallet();

  const [category, setCategory] = useState<"global" | "c4" | "ludo" | "streaks">("global");
  const [timeframe, setTimeframe] = useState<"season" | "weekly" | "all">("season");
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Queries
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: category === "c4" ? "connect-four" : "ludo-league",
    limit: 20,
  });

  const userStatsQuery = trpc.auth.stats.useQuery(
    { gameSlug: category === "c4" ? "connect-four" : "ludo-league" },
    { enabled: Boolean(user) }
  );

  const serverStandings = leaderboardQuery.data || [];
  const userStats = userStatsQuery.data;

  // Map server standings to Gladiator objects
  const gladiators: Gladiator[] = serverStandings.map((item, idx) => ({
    rank: idx + 1,
    name: item.userName,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9ZsK3RyCi8MpuLcXQodWKW0-8zaglI5nKspwoI4mrffJuHwk0sOLWgHoHtFkfewiPuPAsXSg1b3_ORSsrE-B0gn5UKT3GVIYLLl519CXo0XRX12NaIswX6O6ZjopyXOdGuaFE7SIH8Insy5ulTz96-TF-qhPRXEub4CSen34d1cxnctBBRIX-SmMZt2GwEppzMWX3trnqi2q0pJfbzsEqtTKLZxReouxwoeRlBrYqRmrzrPuLVCjtRg",
    clan: item.rating >= 2000 ? "Grandmaster" : item.rating >= 1600 ? "Master" : item.rating >= 1300 ? "Gold Legion" : "Challenger",
    tier: item.rating >= 2000 ? "Grandmaster" : item.rating >= 1600 ? "Master I" : item.rating >= 1300 ? "Gold Tier" : "Challenger",
    elo: item.rating,
    winRate: `${item.winRate}%`,
    streak: `${item.currentStreak || 0}W`,
    rewardNim: idx === 0 ? "10,000 NIM" : idx === 1 ? "5,000 NIM" : idx === 2 ? "2,500 NIM" : "+500 NIM",
    isUser: user?.id === item.userId,
    isVerified: true,
  }));

  const rank1 = gladiators[0] || null;
  const rank2 = gladiators[1] || null;
  const rank3 = gladiators[2] || null;
  const roster = gladiators.slice(3);

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      {/* Mobile Mini-App Container Constraint */}
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        
        {/* ========================================================================= */}
        {/* FIXED APP HEADER                                                          */}
        {/* ========================================================================= */}
        <header className="sticky top-0 inset-x-0 z-40 bg-[#0d1321]/90 backdrop-blur-xl border-b border-[#242a39] pt-safe shadow-sm">
          <div className="h-16 px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <NimiqArenaLogo size={32} />
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#ffd78d] tracking-tight leading-none">
                  NIMIQ ARENA
                </span>
                <span className="text-[10px] text-[#f3b72c] uppercase tracking-wider font-mono font-semibold">
                  Arena Leaderboard
                </span>
              </div>
            </Link>

            {/* Wallet Balance Pill */}
            <div className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#242a39] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
              <span className="text-xs font-mono font-bold text-[#dde2f6]">
                {balanceStatus === "available" || balanceStatus === "zero"
                  ? formatNim(balanceNim)
                  : "0.00"}{" "}
                <span className="text-[#ffd78d]">NIM</span>
              </span>
              <Wallet size={15} className="text-[#a5e7ff]" />
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN CONTENT                                                              */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full px-4 pt-3 pb-24 gap-4">
          {/* DUAL RANKS SEGMENTED SWITCHER */}
          <div className="flex items-center p-1 rounded-xl bg-[#151b29] border border-[#242a39] mb-1">
            <div className="flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all bg-[#f3b72c] text-[#412d00] shadow">
              <Swords size={14} />
              <span>Gladiators (Solo)</span>
            </div>
            <Link
              href="/syndicates"
              className="flex-1 py-2 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all text-[#d4c5ad] hover:text-[#dde2f6]"
            >
              <Shield size={14} />
              <span>Syndicates (Guilds)</span>
            </Link>
          </div>

          {/* Season Championship Banner & Hero Pool */}
          <section className="flex flex-col">
            {/* Badge / Status Seam */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#242a39] border border-[#2f3544]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] animate-pulse" />
                <span className="text-[10px] text-[#ffd78d] uppercase tracking-wider font-mono font-bold">
                  Season 1 · Gladiator Arena
                </span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#151b29] border border-[#242a39] text-[#a5e7ff]">
                <Timer size={12} className="text-[#a5e7ff]" />
                <span className="text-[10px] tracking-tight font-mono">Season Active</span>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-3">
              <h1 className="text-2xl font-black text-[#dde2f6] tracking-tight leading-tight">
                Gladiator Ranks
              </h1>
              <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                Compete for the 25,000 NIM seasonal reward pool settled directly on-chain.
              </p>
            </div>

            {/* Seasonal Prize Pool Card (Bento Glass Spec) */}
            <div className="relative overflow-hidden rounded-xl bg-[#191f2e] border border-[#242a39] p-3.5 shadow-xl">
              {/* Background Ambient Aura */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#f3b72c]/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#00d2ff]/10 blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Medal size={16} className="text-[#ffd78d]" />
                      <span className="text-[10px] uppercase tracking-widest text-[#d4c5ad] font-mono font-semibold">
                        Season 1 Escrow Pool
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#ffd78d] tracking-tight font-mono">
                        25,000
                      </span>
                      <span className="text-sm font-bold text-[#ffd78d] font-mono">NIM</span>
                      <span className="text-[10px] text-[#d4c5ad] font-mono ml-1">
                        (~{formatUsd(nimToUsd(25000))})
                      </span>
                    </div>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[#ffd78d] shadow-md">
                    <Trophy size={24} />
                  </div>
                </div>

                {/* Tiered Prize Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1 bg-[#080e1c]/60 border border-[#242a39] rounded-lg p-2.5">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#ffd78d] font-mono font-semibold flex items-center gap-0.5">
                      <Crown size={11} /> 1st Place
                    </span>
                    <span className="text-sm font-bold text-[#dde2f6] font-mono mt-0.5">
                      10,000
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">NIM</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#a5e7ff] font-mono font-semibold flex items-center gap-0.5">
                      <Medal size={11} /> 2nd Place
                    </span>
                    <span className="text-sm font-bold text-[#dde2f6] font-mono mt-0.5">
                      5,000
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">NIM</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#68f5b8] font-mono font-semibold flex items-center gap-0.5">
                      <Users size={11} /> Top 100
                    </span>
                    <span className="text-sm font-bold text-[#dde2f6] font-mono mt-0.5">
                      10,000
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">Shared Pool</span>
                  </div>
                </div>

                {/* Escrow Guarantee Pill */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-1.5 text-[#68f5b8]">
                    <ShieldCheck size={14} />
                    <span className="text-[11px] font-mono font-medium tracking-tight">
                      Smart Escrow Guaranteed · Instant Payouts
                    </span>
                  </div>
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex items-center gap-0.5 text-[#d4c5ad] hover:text-[#ffd78d] transition-colors text-[11px] font-mono cursor-pointer"
                  >
                    <span>Rules</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Filter & Mode Segmented Navigation */}
          <section className="flex flex-col gap-2">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "global", label: "Global Ranked" },
                { id: "c4", label: "Connect 4" },
                { id: "ludo", label: "Ludo Arena" },
                { id: "streaks", label: "Win Streaks 🔥" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                    category === tab.id
                      ? "bg-[#f3b72c] text-[#412d00] font-bold shadow-sm"
                      : "bg-[#191f2e] border border-[#242a39] text-[#d4c5ad] hover:text-[#dde2f6]"
                  }`}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeframe Filter Toggle */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex p-0.5 rounded-lg bg-[#151b29] border border-[#242a39]">
                {[
                  { id: "season", label: "Season 4" },
                  { id: "weekly", label: "Weekly Cup" },
                  { id: "all", label: "All-Time" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                      timeframe === tf.id
                        ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-sm"
                        : "text-[#d4c5ad] hover:text-[#dde2f6]"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[#d4c5ad] font-mono text-[11px]">
                <RotateCw size={11} className="text-[#68f5b8]" />
                <span>Synced block #3,981,204</span>
              </div>
            </div>
          </section>

          {/* Player's Sticky / Pinned Rank Bar */}
          {(() => {
            const userRankIndex = gladiators.findIndex((g) => g.isUser);
            const userRating = userStats?.rating ?? 1000;
            const userMatches = userStats?.matchesPlayed ?? 0;
            const userWins = userStats?.wins ?? 0;
            const userLosses = Math.max(0, userMatches - userWins);
            const userWinRate = userMatches > 0 ? ((userWins / userMatches) * 100).toFixed(1) : "0.0";

            return (
              <section className="relative overflow-hidden rounded-xl bg-[#242a39] border border-[#2f3544] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd78d]/50 to-transparent" />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center px-2 h-7 rounded-lg bg-[#080e1c] text-[#ffd78d] font-mono text-xs font-bold border border-[#ffd78d]/30">
                      {userRankIndex >= 0 ? `#${userRankIndex + 1}` : "—"}
                    </div>
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#2f3544] border border-[#00d2ff]/40">
                        <img
                          alt="Player Avatar"
                          className="w-full h-full object-cover"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDh9CxSqvSoieZnpvfo6LABiFJx9wX85JFEEPGmDo2Of7pFErBgmjFiqVOCzYVeQBvrWSt_w2UJxW_M31WeHnzJNJ78udkUKezYxJ8M05nbhNRYpXkUpAX1Bnm_qn5F-eHgWQSznuESY2lUs3JqpgF_7tC-DaMm-mCNfJh_V0LctQBUeYaV5_Zc8ctXULqrVMioxJS8hMiPHNwq0M9AZ53VOuQJNjsAgilBybQJKQq12p5P8oIlzXsyPQ"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00d2ff] flex items-center justify-center shadow-md">
                        <Diamond size={10} className="text-[#003543] font-bold" />
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#dde2f6] truncate">
                          You ({user?.name || "Player"})
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#191f2e] text-[#ffd78d] text-[9px] uppercase font-mono font-bold">
                          {userRankIndex >= 0 ? "Contender" : "Unranked"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono">
                        <span className="text-xs font-bold text-[#00d2ff]">{userRating} ELO</span>
                        <span className="text-[10px] text-[#68f5b8] flex items-center font-medium">
                          {userMatches > 0 ? `${userWins}W / ${userLosses}L` : "No matches yet"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <div className="px-2 py-0.5 rounded-full bg-[#ffd78d]/10 border border-[#ffd78d]/30 flex items-center gap-1 font-mono">
                      <Sparkles size={11} className="text-[#ffd78d]" />
                      <span className="text-xs font-bold text-[#ffd78d]">
                        {userRankIndex >= 0 ? gladiators[userRankIndex].rewardNim : "—"}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#d4c5ad] font-mono mt-1">{userWinRate}% WR</span>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Top 3 Podium Showcase or Empty State */}
          {gladiators.length === 0 ? (
            <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-6 flex flex-col items-center text-center gap-3 shadow-lg">
              <div className="w-14 h-14 rounded-full bg-[#f3b72c]/10 border border-[#f3b72c]/20 flex items-center justify-center text-[#ffd78d]">
                <Trophy size={28} />
              </div>
              <h3 className="text-base font-bold text-[#dde2f6]">Season 1 Podium Awaiting Champions</h3>
              <p className="text-xs text-[#d4c5ad] max-w-sm leading-relaxed">
                Be the first gladiator to claim the #1 rank and compete for the 25,000 NIM prize pool. Win your first ranked duel to enter the board!
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Link
                  href="/games/connect-four"
                  className="h-9 px-4 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Swords size={14} />
                  Play Nim Connect
                </Link>
                <Link
                  href="/games/ludo-league"
                  className="h-9 px-4 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  Play Ludo League
                </Link>
              </div>
            </div>
          ) : (
            <section className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Crown size={16} className="text-[#ffd78d]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Top Gladiators</h2>
                </div>
                <span className="text-[11px] text-[#d4c5ad] font-mono">
                  Live Seasonal Ranks
                </span>
              </div>

              {/* Podium Stacking */}
              <div className="grid grid-cols-3 gap-2 items-end">
                {/* Rank #2 */}
                {rank2 ? (
                  <div className="flex flex-col items-center bg-[#191f2e] border border-[#242a39] rounded-xl p-2.5 pt-3 relative shadow-md">
                    <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#2f3544] text-[#a5e7ff] flex items-center justify-center text-xs font-mono font-bold shadow">
                      2
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-sm border border-[#a5e7ff]/30">
                      <img alt={rank2.name} className="w-full h-full object-cover" src={rank2.avatar} />
                    </div>
                    <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">{rank2.name}</span>
                    <span className="text-[10px] text-[#a5e7ff] font-mono font-semibold">{rank2.tier}</span>
                    <span className="text-xs text-[#dde2f6] font-mono font-medium mt-0.5">{rank2.elo} ELO</span>
                    <div className="mt-2 w-full py-1 bg-[#242a39] rounded text-center">
                      <span className="text-[10px] text-[#a5e7ff] font-mono font-bold">{rank2.rewardNim}</span>
                    </div>
                  </div>
                ) : <div />}

                {/* Rank #1 */}
                {rank1 ? (
                  <div className="flex flex-col items-center bg-[#242a39] border border-[#ffd78d]/40 rounded-xl p-3 pt-4 relative shadow-xl transform -translate-y-2">
                    <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#f3b72c] text-[#412d00] flex items-center justify-center font-bold shadow-lg">
                      <Crown size={18} />
                    </div>
                    <div className="w-16 h-16 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-[0_0_16px_rgba(243,183,44,0.3)] border-2 border-[#ffd78d]">
                      <img alt={rank1.name} className="w-full h-full object-cover" src={rank1.avatar} />
                    </div>
                    <span className="text-sm font-bold text-[#ffd78d] truncate w-full text-center">{rank1.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-[#dde2f6] font-mono font-bold">{rank1.tier}</span>
                      <span className="px-1 rounded bg-[#ffb4ab]/20 text-[#ffb4ab] text-[9px] font-mono font-bold">{rank1.streak}</span>
                    </div>
                    <span className="text-xs text-[#ffd78d] font-mono font-bold mt-0.5">{rank1.elo} ELO</span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">{rank1.winRate}</span>
                    <div className="mt-2 w-full py-1.5 bg-[#f3b72c] rounded-lg text-center shadow-md">
                      <span className="text-xs text-[#412d00] font-mono font-bold tracking-tight">{rank1.rewardNim}</span>
                    </div>
                  </div>
                ) : <div />}

                {/* Rank #3 */}
                {rank3 ? (
                  <div className="flex flex-col items-center bg-[#191f2e] border border-[#242a39] rounded-xl p-2.5 pt-3 relative shadow-md">
                    <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#2f3544] text-[#ffd78d] flex items-center justify-center text-xs font-mono font-bold shadow">
                      3
                    </div>
                    <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-sm border border-[#ffd78d]/30">
                      <img alt={rank3.name} className="w-full h-full object-cover" src={rank3.avatar} />
                    </div>
                    <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">{rank3.name}</span>
                    <span className="text-[10px] text-[#d4c5ad] font-mono font-semibold">{rank3.tier}</span>
                    <span className="text-xs text-[#dde2f6] font-mono font-medium mt-0.5">{rank3.elo} ELO</span>
                    <div className="mt-2 w-full py-1 bg-[#242a39] rounded text-center">
                      <span className="text-[10px] text-[#ffd78d] font-mono font-bold">{rank3.rewardNim}</span>
                    </div>
                  </div>
                ) : <div />}
              </div>
            </section>
          )}

          {/* Leaderboard Ranked List (#4 through #50) */}
          {roster.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1 mb-0.5 text-[10px] font-mono text-[#d4c5ad] uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center">Rank</span>
                  <span>Gladiator</span>
                </div>
                <div className="flex items-center gap-6">
                  <span>Win Rate</span>
                  <span className="text-right w-16">ELO / Pool</span>
                </div>
              </div>

            {/* List items */}
            {roster.map((glad, idx) => {
              // Insert the collapsed indicator right before user (#14)
              const showCollapsedBefore = glad.rank === 14;

              return (
                <React.Fragment key={`glad-${glad.rank}`}>
                  {showCollapsedBefore && (
                    <div className="flex items-center justify-center py-1 text-[#d4c5ad]/70 text-[11px] font-mono gap-1">
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                      <span className="mx-1">6 players between Rank 8 and 13</span>
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                      <span className="w-1 h-1 rounded-full bg-[#2f3544]" />
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl shadow-sm transition-all ${
                      glad.isUser
                        ? "bg-[#242a39] border border-[#ffd78d]/40 shadow-md relative overflow-hidden"
                        : "bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39]"
                    }`}
                  >
                    {glad.isUser && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ffd78d]" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0 pl-1">
                      <span
                        className={`w-6 text-center text-xs font-mono font-bold ${
                          glad.isUser ? "text-[#ffd78d]" : "text-[#d4c5ad]"
                        }`}
                      >
                        {glad.rank}
                      </span>
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2f3544]">
                          <img
                            alt={glad.name}
                            className="w-full h-full object-cover"
                            src={glad.avatar}
                          />
                        </div>
                        {glad.isUser && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ffd78d] ring-2 ring-[#242a39]" />
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs font-semibold truncate ${
                              glad.isUser ? "text-[#ffd78d] font-bold" : "text-[#dde2f6]"
                            }`}
                          >
                            {glad.name}
                          </span>
                          {glad.isUser ? (
                            <span className="px-1 rounded bg-[#ffd78d]/20 text-[#ffd78d] text-[9px] font-mono font-bold">
                              YOU
                            </span>
                          ) : glad.isVerified ? (
                            <CheckCircle2 size={12} className="text-[#a5e7ff]" />
                          ) : null}
                        </div>
                        <span className="text-[10px] text-[#d4c5ad] font-mono truncate">
                          {glad.clan}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-mono font-medium text-[#68f5b8]">
                          {glad.winRate}
                        </span>
                        <span className="text-[9px] font-mono text-[#d4c5ad]">
                          {glad.streak}
                        </span>
                      </div>
                      <div className="flex flex-col items-end w-16 font-mono">
                        <span className="text-xs font-bold text-[#dde2f6]">
                          {glad.elo}
                        </span>
                        <span className="text-[10px] text-[#ffd78d] font-semibold">
                          {glad.rewardNim}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </section>
          )}

          {/* Seasonal Tier Division Roadmap Teaser */}
          <section className="p-3.5 rounded-xl bg-[#151b29] border border-[#242a39]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers size={16} className="text-[#a5e7ff]" />
                <h3 className="text-xs font-bold text-[#dde2f6]">
                  Seasonal Division Roadmap
                </h3>
              </div>
              <span className="text-[11px] text-[#a5e7ff] font-mono font-semibold">
                Your Standing: Top 3.2%
              </span>
            </div>

            {/* Compact Visual Ladder Flow */}
            <div className="grid grid-cols-5 gap-1.5 mb-2.5 text-center font-mono">
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#191f2e] border border-[#242a39] opacity-60">
                <span className="text-[9px] text-[#d4c5ad]">GOLD</span>
                <Shield size={14} className="text-[#4f4534] my-0.5" />
                <span className="text-[9px] text-[#d4c5ad]">1,400+</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#191f2e] border border-[#242a39] opacity-70">
                <span className="text-[9px] text-[#d4c5ad]">PLATINUM</span>
                <Shield size={14} className="text-[#a5e7ff] my-0.5" />
                <span className="text-[9px] text-[#d4c5ad]">1,800+</span>
              </div>
              {/* Active Diamond (Highlighted) */}
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#242a39] border border-[#ffd78d]/50 shadow-md">
                <span className="text-[9px] text-[#ffd78d] font-bold">DIAMOND</span>
                <Diamond size={14} className="text-[#ffd78d] my-0.5 fill-current" />
                <span className="text-[9px] text-[#ffd78d] font-bold">YOU #14</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#191f2e] border border-[#242a39]">
                <span className="text-[9px] text-[#d4c5ad]">MASTER</span>
                <Sparkles size={14} className="text-[#d4c5ad] my-0.5" />
                <span className="text-[9px] text-[#d4c5ad]">2,400+</span>
              </div>
              <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#191f2e] border border-[#242a39]">
                <span className="text-[9px] text-[#ffd78d]">G-MASTER</span>
                <Crown size={14} className="text-[#ffd78d] my-0.5" />
                <span className="text-[9px] text-[#d4c5ad]">Top 50</span>
              </div>
            </div>

            {/* Division Tooltip / Escrow Guarantee Notice */}
            <div className="flex items-start gap-2 pt-1 text-[#d4c5ad]">
              <ShieldCheck size={14} className="text-[#ffd78d] shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono leading-snug">
                Instant NIM reward payouts to non-custodial wallet upon season finale. Minimum 20 ranked matches required for eligibility.
              </p>
            </div>
          </section>

        </main>

        {/* ========================================================================= */}
        {/* RULES MODAL                                                               */}
        {/* ========================================================================= */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080e1c]/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#242a39] border border-[#333948] rounded-2xl p-5 shadow-2xl relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-[#ffd78d]" />
                  <h3 className="text-sm font-bold text-[#dde2f6]">Season 4 Rules & Rewards</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-7 h-7 rounded-full bg-[#2f3544] flex items-center justify-center text-[#d4c5ad] active:scale-90"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#d4c5ad] font-mono leading-relaxed">
                <p>
                  • <strong className="text-[#ffd78d]">Escrow Prize Pool:</strong> 25,000 NIM is pre-locked in the smart escrow contract for automated end-of-season distribution.
                </p>
                <p>
                  • <strong className="text-[#a5e7ff]">Rating Calculation:</strong> Official competitive Elo (K=32) calculated authoritatively on every verified match.
                </p>
                <p>
                  • <strong className="text-[#68f5b8]">Eligibility:</strong> A minimum of 20 ranked matches must be completed during Season 4 to qualify for prize pool share.
                </p>
                <p>
                  • <strong className="text-[#dde2f6]">Instant Payout:</strong> Payouts disburse directly on-chain to your registered Nimiq address upon season finale with zero claim gas fee.
                </p>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full mt-4 h-10 rounded-xl bg-[#f3b72c] text-[#412d00] font-bold text-xs active:scale-95 transition-transform cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
