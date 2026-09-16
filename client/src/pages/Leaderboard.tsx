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
  Sparkles,
  Wallet,
  X,
  Swords,
  Shield,
  Layers,
  Dices,
  RotateCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

interface Gladiator {
  rank: number;
  userId: number;
  name: string;
  avatar?: string | null;
  tier: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: string;
  streak: string;
  isUser?: boolean;
}

function getTierInfo(rating: number) {
  if (rating >= 2200) return { name: "Master", color: "text-[#ffd78d]", bg: "bg-[#ffd78d]/15", border: "border-[#ffd78d]/30" };
  if (rating >= 1800) return { name: "Diamond", color: "text-[#38bdf8]", bg: "bg-[#38bdf8]/15", border: "border-[#38bdf8]/30" };
  if (rating >= 1500) return { name: "Gold", color: "text-[#f3b72c]", bg: "bg-[#f3b72c]/15", border: "border-[#f3b72c]/30" };
  if (rating >= 1200) return { name: "Silver", color: "text-[#94a3b8]", bg: "bg-[#94a3b8]/15", border: "border-[#94a3b8]/30" };
  return { name: "Bronze", color: "text-[#d4c5ad]", bg: "bg-[#d4c5ad]/10", border: "border-[#d4c5ad]/20" };
}

export default function Leaderboard() {
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { nimToUsd, formatUsd } = useNimiqPrice();
  const { balanceNim, balanceStatus } = useNimiqWallet();

  const [category, setCategory] = useState<"global" | "c4" | "ludo" | "streaks">("global");
  const [timeframe, setTimeframe] = useState<"season" | "all">("season");
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Queries
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: category === "c4" ? "connect-four" : category === "ludo" ? "ludo-league" : undefined,
    limit: 50,
  });

  const userStatsQuery = trpc.auth.stats.useQuery(
    { gameSlug: category === "c4" ? "connect-four" : "ludo-league" },
    { enabled: Boolean(user) }
  );

  const serverStandings = leaderboardQuery.data || [];
  const userStats = userStatsQuery.data;

  // Map server standings to Gladiator objects
  const gladiators: Gladiator[] = (category === "streaks"
    ? [...serverStandings].sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
    : serverStandings
  ).map((item, idx) => {
    const tier = getTierInfo(item.rating).name;
    return {
      rank: idx + 1,
      userId: item.userId,
      name: item.userName,
      avatar: (item as any).avatar || null,
      tier,
      elo: item.rating,
      wins: item.wins,
      losses: item.losses,
      winRate: `${item.winRate}%`,
      streak: `${item.currentStreak || 0}W`,
      isUser: user?.id === item.userId,
    };
  });

  const rank1 = gladiators[0] || null;
  const rank2 = gladiators[1] || null;
  const rank3 = gladiators[2] || null;
  const roster = gladiators.slice(3);

  // User stats summary
  const userRankIndex = gladiators.findIndex((g) => g.isUser);
  const userRating = userStats?.rating ?? 1000;
  const userMatches = userStats?.matchesPlayed ?? 0;
  const userWins = userStats?.wins ?? 0;
  const userLosses = Math.max(0, userMatches - userWins);
  const userWinRate = userMatches > 0 ? ((userWins / userMatches) * 100).toFixed(1) : "0.0";
  const userTier = getTierInfo(userRating);

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
                  Leaderboard
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
        <main className="flex-1 flex flex-col w-full px-4 pt-3 pb-24 gap-3.5">
          
          {/* SEASON 1 RANKED DUEL STANDINGS */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e2638] via-[#151b29] to-[#1e2638] border border-[#ffd78d]/30 p-4 shadow-xl">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#f3b72c]/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-[#38bdf8]/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f3b72c]/20 border border-[#f3b72c]/40 flex items-center justify-center text-[#ffd78d]">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#d4c5ad] font-mono font-bold">
                      Competitive Elo Ladder
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-[#ffd78d] font-mono">Season 1 Genesis</span>
                      <span className="text-[10px] text-[#68f5b8] font-mono font-bold">
                        • {gladiators.length} Contenders
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowRulesModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#242a39] hover:bg-[#2f3544] border border-[#333948] text-[#d4c5ad] hover:text-[#ffd78d] text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                  type="button"
                >
                  <span>Tier Rules</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Instant 3-Tier Division Strip */}
              <div className="grid grid-cols-3 gap-2 bg-[#080e1c]/60 border border-[#242a39] rounded-xl p-2 text-center font-mono">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-[#ffd78d] font-bold flex items-center gap-0.5">
                    <Crown size={10} /> Master Tier
                  </span>
                  <span className="text-xs font-black text-[#dde2f6] mt-0.5">2,200+ ELO</span>
                </div>
                <div className="flex flex-col items-center border-x border-[#242a39]">
                  <span className="text-[9px] text-[#38bdf8] font-bold flex items-center gap-0.5">
                    <Medal size={10} /> Diamond Tier
                  </span>
                  <span className="text-xs font-black text-[#dde2f6] mt-0.5">1,800+ ELO</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-[#f3b72c] font-bold flex items-center gap-0.5">
                    <ShieldCheck size={10} /> Gold Tier
                  </span>
                  <span className="text-xs font-black text-[#dde2f6] mt-0.5">1,500+ ELO</span>
                </div>
              </div>
            </div>
          </section>

          {/* GAME SELECTOR & TIMEFRAME SWITCHERS */}
          <section className="flex flex-col gap-2">
            {/* Game Mode Filters */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#151b29] border border-[#242a39]">
              {[
                { id: "global", label: "All Games", icon: Trophy },
                { id: "c4", label: "Connect 4", icon: Swords },
                { id: "ludo", label: "Ludo League", icon: Dices },
                { id: "streaks", label: "Streaks 🔥", icon: Flame },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = category === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCategory(tab.id as any)}
                    className={`py-2 px-1 rounded-lg text-xs font-bold font-mono flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#f3b72c] text-[#412d00] shadow-md"
                        : "text-[#94a3b8] hover:text-[#dde2f6] hover:bg-[#1e2638]"
                    }`}
                    type="button"
                  >
                    <Icon size={14} />
                    <span className="text-[11px] truncate w-full text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Timeframe Toggle (Season 1 vs All-Time) */}
            <div className="flex items-center justify-between px-1">
              <div className="flex p-0.5 rounded-lg bg-[#151b29] border border-[#242a39]">
                {[
                  { id: "season", label: "Season 1 (Active)" },
                  { id: "all", label: "All-Time" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id as any)}
                    className={`px-3 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
                      timeframe === tf.id
                        ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-sm"
                        : "text-[#94a3b8] hover:text-[#dde2f6]"
                    }`}
                    type="button"
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#68f5b8]">
                <ShieldCheck size={13} />
                <span>Verified Elo</span>
              </div>
            </div>
          </section>

          {/* YOUR PERSONAL STANDING CARD */}
          <section className="relative overflow-hidden rounded-xl bg-[#191f2e] border border-[#2f3544] p-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#080e1c] text-[#ffd78d] font-mono text-xs font-bold border border-[#ffd78d]/30 shrink-0">
                  {userRankIndex >= 0 ? `#${userRankIndex + 1}` : "—"}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#dde2f6] truncate">
                      {user?.name || "Player (You)"}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-bold ${userTier.bg} ${userTier.color} border ${userTier.border}`}>
                      {userTier.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                    <span className="font-bold text-[#38bdf8]">{userRating} ELO</span>
                    <span className="text-[#94a3b8]">
                      {userMatches > 0 ? `${userWins}W · ${userLosses}L (${userWinRate}%)` : "0 matches"}
                    </span>
                  </div>
                </div>
              </div>

              {userMatches === 0 ? (
                <Link
                  href="/games/connect-four"
                  className="px-2.5 py-1 rounded-lg bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-[10px] font-mono font-bold active:scale-95 transition-transform"
                >
                  Play Match
                </Link>
              ) : (
                <div className="flex flex-col items-end shrink-0 font-mono">
                  <span className="text-[10px] text-[#94a3b8] uppercase">Streak</span>
                  <span className="text-xs font-bold text-[#68f5b8]">
                    {userRankIndex >= 0 ? gladiators[userRankIndex].streak : "0W"}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* TOP 3 PODIUM OR EMPTY STATE */}
          {gladiators.length === 0 ? (
            <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-6 flex flex-col items-center text-center gap-3 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-[#f3b72c]/10 border border-[#f3b72c]/20 flex items-center justify-center text-[#ffd78d]">
                <Trophy size={24} />
              </div>
              <h3 className="text-sm font-bold text-[#dde2f6]">Leaderboard Awaiting Champions</h3>
              <p className="text-xs text-[#94a3b8] max-w-xs leading-relaxed">
                Win your first ranked duel to claim the #1 spot on the Season 1 leaderboard!
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Link
                  href="/games/connect-four"
                  className="h-8 px-3 rounded-lg bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Swords size={13} />
                  Connect 4
                </Link>
                <Link
                  href="/games/ludo-league"
                  className="h-8 px-3 rounded-lg bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Dices size={13} />
                  Ludo League
                </Link>
              </div>
            </div>
          ) : (
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Crown size={15} className="text-[#ffd78d]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#dde2f6]">
                    Top Contenders
                  </h2>
                </div>
                <span className="text-[10px] text-[#94a3b8] font-mono">
                  {gladiators.length} Players Ranked
                </span>
              </div>

              {/* PODIUM CARDS */}
              <div className="grid grid-cols-3 gap-2 items-end pt-2">
                {/* Rank #2 (Silver) */}
                {rank2 ? (
                  <div className="flex flex-col items-center bg-[#191f2e] border border-[#a5e7ff]/30 rounded-xl p-2.5 pt-3 relative shadow-md">
                    <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#a5e7ff]/50 text-[#a5e7ff] flex items-center justify-center text-xs font-mono font-bold shadow">
                      2
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#242a39] border border-[#a5e7ff]/40 flex items-center justify-center text-[#a5e7ff] font-bold font-mono text-xs mb-1">
                      {rank2.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">{rank2.name}</span>
                    <span className="text-[10px] text-[#38bdf8] font-mono font-semibold">{rank2.elo} ELO</span>
                    <span className="text-[9px] text-[#94a3b8] font-mono">{rank2.winRate} WR</span>
                    <div className="mt-1.5 w-full py-0.5 bg-[#242a39] rounded text-center">
                      <span className="text-[9px] text-[#a5e7ff] font-mono font-bold">{rank2.tier}</span>
                    </div>
                  </div>
                ) : <div />}

                {/* Rank #1 (Gold Champion) */}
                {rank1 ? (
                  <div className="flex flex-col items-center bg-[#242a39] border-2 border-[#ffd78d] rounded-xl p-3 pt-3.5 relative shadow-xl transform -translate-y-2">
                    <div className="absolute -top-3.5 w-7 h-7 rounded-full bg-[#f3b72c] text-[#412d00] flex items-center justify-center font-bold shadow-lg">
                      <Crown size={16} />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#191f2e] border-2 border-[#ffd78d] flex items-center justify-center text-[#ffd78d] font-bold font-mono text-sm mb-1 shadow-[0_0_12px_rgba(243,183,44,0.3)]">
                      {rank1.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-[#ffd78d] truncate w-full text-center">{rank1.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px] text-[#ffd78d] font-mono font-bold">{rank1.elo} ELO</span>
                      <span className="px-1 rounded bg-[#ffb4ab]/20 text-[#ffb4ab] text-[8px] font-mono font-bold">{rank1.streak}</span>
                    </div>
                    <span className="text-[9px] text-[#94a3b8] font-mono">{rank1.winRate} WR</span>
                    <div className="mt-1.5 w-full py-1 bg-[#f3b72c] rounded-md text-center shadow-md">
                      <span className="text-[10px] text-[#412d00] font-mono font-bold">{rank1.tier} Champion</span>
                    </div>
                  </div>
                ) : <div />}

                {/* Rank #3 (Bronze) */}
                {rank3 ? (
                  <div className="flex flex-col items-center bg-[#191f2e] border border-[#d4c5ad]/30 rounded-xl p-2.5 pt-3 relative shadow-md">
                    <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#d4c5ad]/50 text-[#d4c5ad] flex items-center justify-center text-xs font-mono font-bold shadow">
                      3
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#242a39] border border-[#d4c5ad]/40 flex items-center justify-center text-[#d4c5ad] font-bold font-mono text-xs mb-1">
                      {rank3.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">{rank3.name}</span>
                    <span className="text-[10px] text-[#d4c5ad] font-mono font-semibold">{rank3.elo} ELO</span>
                    <span className="text-[9px] text-[#94a3b8] font-mono">{rank3.winRate} WR</span>
                    <div className="mt-1.5 w-full py-0.5 bg-[#242a39] rounded text-center">
                      <span className="text-[9px] text-[#ffd78d] font-mono font-bold">{rank3.tier}</span>
                    </div>
                  </div>
                ) : <div />}
              </div>

              {/* ROSTER TABLE LIST (#4+) */}
              {roster.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between px-3 text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center">#</span>
                      <span>Gladiator</span>
                    </div>
                    <div className="flex items-center gap-5">
                      <span>Win Rate</span>
                      <span className="w-14 text-right">Rating</span>
                    </div>
                  </div>

                  {roster.map((glad) => (
                    <div
                      key={`glad-${glad.rank}-${glad.userId}`}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                        glad.isUser
                          ? "bg-[#242a39] border-[#ffd78d]/50 shadow-md"
                          : "bg-[#191f2e] border-[#242a39] hover:bg-[#1e2638]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-5 text-center text-xs font-mono font-bold ${glad.isUser ? "text-[#ffd78d]" : "text-[#94a3b8]"}`}>
                          {glad.rank}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[11px] font-bold font-mono text-[#dde2f6] shrink-0">
                          {glad.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${glad.isUser ? "text-[#ffd78d]" : "text-[#dde2f6]"}`}>
                              {glad.name}
                            </span>
                            {glad.isUser && (
                              <span className="px-1 rounded bg-[#ffd78d]/20 text-[#ffd78d] text-[8px] font-mono font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#94a3b8] font-mono">
                            {glad.tier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 shrink-0 font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-[11px] font-medium text-[#68f5b8]">{glad.winRate}</span>
                          <span className="text-[9px] text-[#94a3b8]">{glad.streak}</span>
                        </div>
                        <div className="flex flex-col items-end w-16">
                          <span className="text-xs font-bold text-[#dde2f6]">{glad.elo}</span>
                          <span className="text-[9px] text-[#00d2ff] font-semibold">{glad.tier}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* DYNAMIC DIVISION LADDER (DATA-DRIVEN) */}
          <section className="p-3.5 rounded-xl bg-[#151b29] border border-[#242a39]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Layers size={15} className="text-[#38bdf8]" />
                <h3 className="text-xs font-bold text-[#dde2f6]">
                  Rating Divisions
                </h3>
              </div>
              <span className="text-[10px] text-[#38bdf8] font-mono font-semibold">
                Your Tier: {userTier.name}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center font-mono">
              {[
                { name: "BRONZE", min: "<1200", isCurrent: userTier.name === "Bronze" },
                { name: "SILVER", min: "1200+", isCurrent: userTier.name === "Silver" },
                { name: "GOLD", min: "1500+", isCurrent: userTier.name === "Gold" },
                { name: "DIAMOND", min: "1800+", isCurrent: userTier.name === "Diamond" },
                { name: "MASTER", min: "2200+", isCurrent: userTier.name === "Master" },
              ].map((division) => (
                <div
                  key={division.name}
                  className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                    division.isCurrent
                      ? "bg-[#242a39] border-[#ffd78d]/60 shadow-md text-[#ffd78d]"
                      : "bg-[#191f2e] border-[#242a39] text-[#94a3b8] opacity-70"
                  }`}
                >
                  <span className="text-[8px] font-bold">{division.name}</span>
                  <span className="text-[9px] mt-0.5">{division.min}</span>
                  {division.isCurrent && (
                    <span className="text-[8px] font-bold text-[#ffd78d] mt-0.5">YOU</span>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* ========================================================================= */}
        {/* ELO RATING & DIVISION TIERS MODAL                                         */}
        {/* ========================================================================= */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080e1c]/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#1e2638] border border-[#333948] rounded-2xl p-5 shadow-2xl relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-[#ffd78d]" />
                  <h3 className="text-sm font-bold text-[#dde2f6]">Competitive Tier Divisions</h3>
                </div>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-7 h-7 rounded-full bg-[#2f3544] flex items-center justify-center text-[#d4c5ad] hover:text-[#dde2f6] active:scale-90 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#d4c5ad] font-mono leading-relaxed">
                <div className="p-2.5 rounded-xl bg-[#0d1321] border border-[#242a39] space-y-1.5">
                  <div className="flex justify-between text-[#ffd78d] font-bold">
                    <span>👑 Master Tier</span>
                    <span>2,200+ ELO</span>
                  </div>
                  <div className="flex justify-between text-[#38bdf8] font-bold">
                    <span>💎 Diamond Tier</span>
                    <span>1,800+ ELO</span>
                  </div>
                  <div className="flex justify-between text-[#f3b72c] font-bold">
                    <span>🛡️ Gold Tier</span>
                    <span>1,500+ ELO</span>
                  </div>
                  <div className="flex justify-between text-[#94a3b8] font-bold">
                    <span>⚔️ Silver Tier</span>
                    <span>1,200+ ELO</span>
                  </div>
                  <div className="flex justify-between text-[#d4c5ad]">
                    <span>🥉 Bronze Division</span>
                    <span>1,000+ ELO</span>
                  </div>
                </div>

                <p>
                  • <strong className="text-[#dde2f6]">Dynamic K-Factor:</strong> Every match calculates official rating adjustments based on the relative Elo gap between opponents.
                </p>
                <p>
                  • <strong className="text-[#dde2f6]">Server-Authoritative:</strong> Ratings are committed directly to database records on match completion to guarantee fair play.
                </p>
              </div>

              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full mt-4 h-10 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs active:scale-95 transition-transform cursor-pointer"
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
