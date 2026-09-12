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

const DEFAULT_GLADIATORS: Gladiator[] = [
  {
    rank: 1,
    name: "ApexPredator",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9ZsK3RyCi8MpuLcXQodWKW0-8zaglI5nKspwoI4mrffJuHwk0sOLWgHoHtFkfewiPuPAsXSg1b3_ORSsrE-B0gn5UKT3GVIYLLl519CXo0XRX12NaIswX6O6ZjopyXOdGuaFE7SIH8Insy5ulTz96-TF-qhPRXEub4CSen34d1cxnctBBRIX-SmMZt2GwEppzMWX3trnqi2q0pJfbzsEqtTKLZxReouxwoeRlBrYqRmrzrPuLVCjtRg",
    clan: "Apex Clan",
    tier: "Grandmaster",
    elo: 2890,
    winRate: "88.2%",
    streak: "12🔥",
    rewardNim: "10,000 NIM",
    isVerified: true,
  },
  {
    rank: 2,
    name: "KryptoKing",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCk7CBTQaejBAjcDCyz8aTitd3zXfKbCfeiSqD7X_5Wes1kUY44sqyBkyOje1bmGnop7zFk2zy_5qfjdYU9CPsrdRi6QMgjhjJfrEaHdKEIYbm0oAS38wROK87fePLlUVH5RNM1GjocOf6gbDrTIZQ99HP6V2eFe_u0XJrvmIQlHMgS8_OpFNeGUAsOq9EHHpPQuCHq6mV-MJ_aweaPGMPl675ltt8CWIYBVM55sGxfy-5xcDVbpaoAYA",
    clan: "Albatross",
    tier: "Master I",
    elo: 2740,
    winRate: "82.5%",
    streak: "8W",
    rewardNim: "5,000 NIM",
    isVerified: true,
  },
  {
    rank: 3,
    name: "ZeroCool",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAohRylzD0lHvUMraq9tuTjFgIN2JYHj8Jc2sKDSn3VOjYZS-WrEdvqvnZGPD_H2vofvfUge0E2kjVEvqhnjLcs56XpK_OET-7_rz6OG6Bg_rjl1FjdiYP6LNF3WPrWIGZQmG32sRpJJQdhNt-C4raFBlf4y-hui5i5ljqsRNJAxo9wBchoFtgdT-mtDogiWajSlNMMcDBEjWS5YBg-bmVZmR5uJMtINpUAiur7U4tOQtLeD7MivfYHAA",
    clan: "Obsidian",
    tier: "Master II",
    elo: 2610,
    winRate: "80.1%",
    streak: "6W",
    rewardNim: "2,500 NIM",
    isVerified: false,
  },
  {
    rank: 4,
    name: "CyberRonin",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA1JgQWPj5cLO7I7TdF9blVoFkW8sMqhjV-7hk5LbjNHigSsf-5BvrVNHfz5JC1odZ7kHH0OzTyrSYyCQcBmxs_5oJu4JvgAx0o_BQ2pdVMiCbQqNMLS3heoasdNBnactg-NAea96oH9Ddx4i-aSXOeLCD0bYVdZIXfruWcyXo1sYPm4HEBfc1RzvwZRQTrh6fs8PgCGMhrOH9hSVyHD8mGx4FhWvOhmAq5XP-YuWt8QAY4h-9RqCoSMg",
    clan: "Nexus Clan · Master III",
    tier: "Master III",
    elo: 2540,
    winRate: "78.4%",
    streak: "5W streak",
    rewardNim: "+1,200 NIM",
    isVerified: true,
  },
  {
    rank: 5,
    name: "ShadowStalker",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA1n8RwLV2m0Js23y3_PKhxHPSYp_Jsa-8TPKzQXjYdB8E2sVXh7D8J1bnta4nGjyNjxuv7UNwYniuI0p2regte_s0he9AdZLt4T23MhftIffeNcdz0CNrLJ1hGsbv2_BK-pXSdgguBK3b-h2nGM9r1JHDVwuY0Ykfxu6xRib9XOXpWI9WMjJB4vPkfd7wH9OFt0ObxSQt4b-CscWCiLKSKXRKRBcdeWNBBs8zEG_bq-DWryTGh3yolrg",
    clan: "Gold Legion · Diamond I",
    tier: "Diamond I",
    elo: 2495,
    winRate: "76.1%",
    streak: "3W streak",
    rewardNim: "+900 NIM",
    isVerified: false,
  },
  {
    rank: 6,
    name: "NimiqVanguard",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA4rV3acdPk7TJ4TgMsAGIpgNEhmLveW_j4cBtUgmttM03qAZdJuZZyGDzWgtK4XpsQ4uL1loPKG0xjZY9YgW9oqXErBQeU5b_1KsUl0VMCRLoolT_jBfzoaEX_g7xLixwpll-Pnq-DkeSYyyQfuwCWSrEj7BBals4mrPYYC5yvUx7qC9FQ52mngatywpxhSO_mbekVjTZeLCdB0RQC5XqNWNdjUujVJBvwKqqEEgPg8vSHc068Jmhuag",
    clan: "Vanguard · Diamond I",
    tier: "Diamond I",
    elo: 2460,
    winRate: "75.0%",
    streak: "2W streak",
    rewardNim: "+800 NIM",
    isVerified: true,
  },
  {
    rank: 7,
    name: "QuantumDrift",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDRCoqFz7es-FTlKEIxpDgqzK9L2ZrTcrWxO7pnCUKdaIp_D0rU6iEzJJFNpxQLWoXcI2eaP2ynY3QrecdqO-RweKnqY4xKH8AWIsBlcnBCIThdex_1NHPXnMhYqdTtY1qzqjqmSO2G7soh74rW85Ssqc7W7k9gg-H-VTAqP5er_hjfeKU2sBHh3T_rIXAlrXT9q7hDpQKlzEVDHUrsgF2g4DEWqXp8aR2gK3tmsKYptzemaYMb37xLHg",
    clan: "Cyber Samurai · Diamond I",
    tier: "Diamond I",
    elo: 2410,
    winRate: "73.8%",
    streak: "1W streak",
    rewardNim: "+750 NIM",
    isVerified: false,
  },
  {
    rank: 14,
    name: "You (Valkyrie)",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuASNPKsGIGD6gQvqohBQmUi8blTAqUr7-NgCMKp_VJYPo5YbJjI9-jAL8_DcJqWKnI9vrHwL9prsDcyOZMkdOo0YPOVeVGibBNzHHqkB6ik6S5ZN3DH6o_gImYHIzy8cIuIh-q8ddukPP977uCkK8AnxGDjWNKNy97IgjPFf48JvylU6xmcrhdVummG2VSZV2WwSLvulLtKJjkQiEkOp3LVdIbqhXiOveYWRrSB1bFiI8njrQpkro48eg",
    clan: "Gold Legion · Diamond II",
    tier: "Diamond II",
    elo: 2140,
    winRate: "71.4%",
    streak: "+34 today",
    rewardNim: "+450 NIM",
    isVerified: true,
    isUser: true,
  },
  {
    rank: 15,
    name: "SolarisKnight",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDtDBnpWm97XLOGsK_U4Qsu2IKAW81_bRy8HV4p61TTwgROXHTwebHXhleoJb7hVJNezlSrEGM3gBdSV0esXo2XZHvYHP-d2kaA2cNPNWAWRItqtof5hw9JJ6tixZ9KOzRjBywThaLCqODmX0QZcYj1trCd3r-sOpFJtZqIyC60uSv1E3dGndmbltio7tjP33OfHzO51y1rc2CFP-cQAJdXMncV6M2KLbiLspOEoi4c5KNdxRA1jnGorg",
    clan: "Solaris · Diamond II",
    tier: "Diamond II",
    elo: 2122,
    winRate: "69.8%",
    streak: "1L streak",
    rewardNim: "+400 NIM",
    isVerified: false,
  },
];

export default function Leaderboard() {
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const { balanceNim, balanceStatus } = useNimiqWallet();

  const [category, setCategory] = useState<"global" | "c4" | "ludo" | "streaks">("global");
  const [timeframe, setTimeframe] = useState<"season" | "weekly" | "all">("season");
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Queries
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({
    gameSlug: category === "c4" ? "connect-four" : "ludo-league",
    limit: 20,
  });

  const serverStandings = leaderboardQuery.data || [];

  // Top 3 for Podium
  const rank1 = DEFAULT_GLADIATORS.find((g) => g.rank === 1)!;
  const rank2 = DEFAULT_GLADIATORS.find((g) => g.rank === 2)!;
  const rank3 = DEFAULT_GLADIATORS.find((g) => g.rank === 3)!;

  // List below podium (4 to 15)
  const roster = DEFAULT_GLADIATORS.filter((g) => g.rank >= 4);

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      {/* Mobile Mini-App Container Constraint */}
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        
        {/* ========================================================================= */}
        {/* FIXED APP HEADER                                                          */}
        {/* ========================================================================= */}
        <header className="sticky top-0 inset-x-0 z-40 bg-[#0d1321]/90 backdrop-blur-xl border-b border-[#242a39] pt-safe shadow-sm">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#f3b72c]/40 flex items-center justify-center bg-[#191f2e]">
                <img
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida/AEtjO1X_SEKkH_ei8ODz8gUMrl0X_UrXhtg4pdYeHJ7fpZEFwzYsY6x_OXMzm2c0kYB-y4CLDd0oVD0NDSwRxV9XVNucimIN9qNoRNfl65Ojaz6sf7dYDYsdQ0oz9rrsmw4dNv_wcudv-yE8D2P2-b2L5jQ7mRfM28LeclhEAIg0i4d3K1sG6fmemSFnWSDCW5iUeYg_jkd-F18QXTod1fOZxgsojaMfvS9MiiXrbKsYZ05rem4Va3ra26FYmS4F"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#ffd78d] tracking-tight leading-none">
                  NIMIQ ARENA
                </span>
                <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                  Arena Home
                </span>
              </div>
            </div>

            {/* Wallet Balance Pill */}
            <div className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#242a39] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
              <span className="text-xs font-mono font-bold text-[#dde2f6]">
                {balanceStatus === "available" || balanceStatus === "zero"
                  ? formatNim(balanceNim)
                  : "1,420"}{" "}
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
          
          {/* Season Championship Banner & Hero Pool */}
          <section className="flex flex-col">
            {/* Badge / Status Seam */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#242a39] border border-[#2f3544]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] animate-pulse" />
                <span className="text-[10px] text-[#ffd78d] uppercase tracking-wider font-mono font-bold">
                  Season 4 · Obsidian Arena
                </span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#151b29] border border-[#242a39] text-[#a5e7ff]">
                <Timer size={12} className="text-[#a5e7ff]" />
                <span className="text-[10px] tracking-tight font-mono">4d 18h 32m left</span>
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
                        Season 4 Escrow Pool
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-[#ffd78d] tracking-tight font-mono">
                        25,000
                      </span>
                      <span className="text-sm font-bold text-[#ffd78d] font-mono">NIM</span>
                      <span className="text-[10px] text-[#d4c5ad] font-mono ml-1">
                        (~$5,250 USD)
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

          {/* Player's Sticky / Pinned Rank Bar (Valkyrie - #14) */}
          <section className="relative overflow-hidden rounded-xl bg-[#242a39] border border-[#2f3544] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            {/* Glow Seam */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd78d]/50 to-transparent" />

            <div className="flex items-center justify-between mb-2">
              {/* Rank & Avatar Spec */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#080e1c] text-[#ffd78d] font-mono text-xs font-bold border border-[#ffd78d]/30">
                  #14
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
                      You ({user?.name || "Valkyrie"})
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#191f2e] text-[#ffd78d] text-[9px] uppercase font-mono font-bold">
                      Gold Legion
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-xs font-bold text-[#00d2ff]">2,140 ELO</span>
                    <span className="text-[10px] text-[#68f5b8] flex items-center font-medium">
                      <TrendingUp size={11} className="mr-0.5" /> +34 today
                    </span>
                  </div>
                </div>
              </div>

              {/* Reward & Winrate Pill */}
              <div className="flex flex-col items-end shrink-0">
                <div className="px-2 py-0.5 rounded-full bg-[#ffd78d]/10 border border-[#ffd78d]/30 flex items-center gap-1 font-mono">
                  <Sparkles size={11} className="text-[#ffd78d]" />
                  <span className="text-xs font-bold text-[#ffd78d]">+450 NIM</span>
                </div>
                <span className="text-[10px] text-[#d4c5ad] font-mono mt-1">71.4% WR (248W)</span>
              </div>
            </div>

            {/* Tier Progress Slider to Master Tier */}
            <div className="mt-2 pt-2 bg-[#080e1c]/60 -mx-3 px-3 rounded-b-lg border-t border-[#2f3544]">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="text-[#d4c5ad] flex items-center gap-1">
                  <span className="text-[#00d2ff] font-bold">Diamond II</span>
                  <span>· 2,140 / 2,400 ELO</span>
                </span>
                <span className="text-[#ffd78d] font-semibold">260 ELO to Master</span>
              </div>
              {/* Progress Bar Track */}
              <div className="w-full h-1.5 rounded-full bg-[#080e1c] overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#00d2ff] to-[#f3b72c] rounded-full"
                  style={{ width: "74%" }}
                />
              </div>
            </div>
          </section>

          {/* Top 3 Podium Showcase (Visual Champions) */}
          <section className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Crown size={16} className="text-[#ffd78d]" />
                <h2 className="text-sm font-bold text-[#dde2f6]">Top Gladiators</h2>
              </div>
              <span className="text-[11px] text-[#d4c5ad] font-mono">
                Tier: Grandmaster & Master I
              </span>
            </div>

            {/* Podium Stacking (Asymmetric 3-Column Display) */}
            <div className="grid grid-cols-3 gap-2 items-end">
              {/* Rank #2 (Silver Contender) */}
              <div className="flex flex-col items-center bg-[#191f2e] border border-[#242a39] rounded-xl p-2.5 pt-3 relative shadow-md">
                <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#2f3544] text-[#a5e7ff] flex items-center justify-center text-xs font-mono font-bold shadow">
                  2
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-sm border border-[#a5e7ff]/30">
                  <img
                    alt={rank2.name}
                    className="w-full h-full object-cover"
                    src={rank2.avatar}
                  />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">
                  {rank2.name}
                </span>
                <span className="text-[10px] text-[#a5e7ff] font-mono font-semibold">
                  {rank2.tier}
                </span>
                <span className="text-xs text-[#dde2f6] font-mono font-medium mt-0.5">
                  {rank2.elo} ELO
                </span>
                <div className="mt-2 w-full py-1 bg-[#242a39] rounded text-center">
                  <span className="text-[10px] text-[#a5e7ff] font-mono font-bold">
                    {rank2.rewardNim}
                  </span>
                </div>
              </div>

              {/* Rank #1 (Gold Champion) - Highest Elevation */}
              <div className="flex flex-col items-center bg-[#242a39] border border-[#ffd78d]/40 rounded-xl p-3 pt-4 relative shadow-xl transform -translate-y-2">
                {/* Floating Crown Insignia */}
                <div className="absolute -top-4 w-8 h-8 rounded-full bg-[#f3b72c] text-[#412d00] flex items-center justify-center font-bold shadow-lg">
                  <Crown size={18} />
                </div>
                <div className="w-16 h-16 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-[0_0_16px_rgba(243,183,44,0.3)] border-2 border-[#ffd78d]">
                  <img
                    alt={rank1.name}
                    className="w-full h-full object-cover"
                    src={rank1.avatar}
                  />
                </div>
                <span className="text-sm font-bold text-[#ffd78d] truncate w-full text-center">
                  {rank1.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-[#dde2f6] font-mono font-bold">
                    {rank1.tier}
                  </span>
                  <span className="px-1 rounded bg-[#ffb4ab]/20 text-[#ffb4ab] text-[9px] font-mono font-bold">
                    {rank1.streak}
                  </span>
                </div>
                <span className="text-xs text-[#ffd78d] font-mono font-bold mt-0.5">
                  {rank1.elo} ELO
                </span>
                <span className="text-[9px] text-[#d4c5ad] font-mono">
                  {rank1.winRate} · 410W
                </span>
                <div className="mt-2 w-full py-1.5 bg-[#f3b72c] rounded-lg text-center shadow-md">
                  <span className="text-xs text-[#412d00] font-mono font-bold tracking-tight">
                    {rank1.rewardNim}
                  </span>
                </div>
              </div>

              {/* Rank #3 (Bronze Contender) */}
              <div className="flex flex-col items-center bg-[#191f2e] border border-[#242a39] rounded-xl p-2.5 pt-3 relative shadow-md">
                <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#242a39] border border-[#2f3544] text-[#ffd78d] flex items-center justify-center text-xs font-mono font-bold shadow">
                  3
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden mb-1.5 bg-[#2f3544] mt-1 shadow-sm border border-[#ffd78d]/30">
                  <img
                    alt={rank3.name}
                    className="w-full h-full object-cover"
                    src={rank3.avatar}
                  />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] truncate w-full text-center">
                  {rank3.name}
                </span>
                <span className="text-[10px] text-[#d4c5ad] font-mono font-semibold">
                  {rank3.tier}
                </span>
                <span className="text-xs text-[#dde2f6] font-mono font-medium mt-0.5">
                  {rank3.elo} ELO
                </span>
                <div className="mt-2 w-full py-1 bg-[#242a39] rounded text-center">
                  <span className="text-[10px] text-[#ffd78d] font-mono font-bold">
                    {rank3.rewardNim}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard Ranked List (#4 through #15) */}
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
