import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Trophy,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Swords,
  Users,
  Gamepad2,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default function SyndicatePlayoffs() {
  const [, setLocation] = useLocation();
  const [activeStage, setActiveStage] = useState<"qf" | "semi" | "finals">("qf");

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl relative">
        {/* ========================================================================= */}
        {/* TOP BRACKET BREADCRUMB & ESCROW AUDIT BAR                                 */}
        {/* ========================================================================= */}
        <section className="px-4 pt-4 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Link href="/syndicates">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[#d4c5ad] hover:text-[#ffd78d] transition-colors py-1 text-xs font-mono font-bold uppercase cursor-pointer"
              >
                <ArrowLeft size={16} className="text-[#ffd78d]" />
                <span>Guild Standings</span>
              </button>
            </Link>

            <div className="bg-[#242a39] border border-[#2f3544] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
              <span className="text-[10px] font-mono text-[#00d2ff] uppercase font-bold">
                Season 1 Playoffs
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl font-black text-[#dde2f6] tracking-tight">
              Syndicate Playoffs: Grand Arena Cup
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-[#d4c5ad]">
              <span className="inline-flex items-center gap-1 bg-[#151b29] border border-[#242a39] px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#f3b72c]" />
                <span className="text-[#ffd78d] font-bold">QUALIFIERS • In Progress</span>
              </span>
              <span className="text-[#68f5b8] flex items-center gap-0.5 font-bold">
                <ShieldCheck size={13} />
                <span>Albatross Smart Escrow Verified</span>
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRIZE POOL ESCROW & CLAN PAYOUT GUARANTEE CARD                            */}
        {/* ========================================================================= */}
        <section className="px-4 my-2">
          <div className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-4 shadow-lg relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#f3b72c]/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Stake Counter */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-1.5 text-[#d4c5ad] text-[10px] font-mono uppercase tracking-wider font-bold">
                  <Lock size={13} className="text-[#f3b72c]" />
                  <span>Championship Escrow Treasury</span>
                </div>
                <div className="text-2xl font-black text-[#ffd78d] flex items-baseline gap-1 mt-0.5 font-mono">
                  50,000 <span className="text-xs font-bold text-[#dde2f6]">NIM</span>
                  <span className="text-xs text-[#d4c5ad] font-normal font-sans">(~$10,000 USD)</span>
                </div>
              </div>

              <div className="bg-[#242a39] border border-[#2f3544] px-2.5 py-1 rounded-lg text-right">
                <span className="block text-[10px] font-mono text-[#68f5b8] font-bold">Smart Escrow</span>
                <span className="block text-[9px] font-mono text-[#d4c5ad]">On-Chain Locked</span>
              </div>
            </div>

            {/* Prize Payout Distribution Tiers */}
            <div className="grid grid-cols-3 gap-1 mt-3 pt-2 bg-[#151b29]/90 border border-[#242a39] p-1.5 rounded-xl">
              <div className="flex flex-col items-center text-center py-1">
                <span className="text-[10px] font-mono text-[#ffd78d] flex items-center gap-0.5 font-bold">
                  <Trophy size={11} /> 1st Place
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">25,000 NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">50% Share</span>
              </div>

              <div className="flex flex-col items-center text-center py-1 border-x border-[#242a39]">
                <span className="text-[10px] font-mono text-[#00d2ff] flex items-center gap-0.5 font-bold">
                  <Award size={11} /> 2nd Place
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">15,000 NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">30% Share</span>
              </div>

              <div className="flex flex-col items-center text-center py-1">
                <span className="text-[10px] font-mono text-[#d4c5ad] flex items-center gap-0.5 font-bold">
                  <ShieldCheck size={11} /> 3rd-4th
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">5,000 NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">Each</span>
              </div>
            </div>

            {/* Qualification Banner */}
            <div className="mt-3 bg-[#242a39] border border-[#2f3544] p-2.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#ffd78d] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#dde2f6]">
                    Top 8 Guilds Qualify for Live Bracket
                  </span>
                  <span className="text-[10px] text-[#d4c5ad]">Earn points by winning matches with guildmates</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STAGE NAVIGATION                                                          */}
        {/* ========================================================================= */}
        <section className="px-4 mt-2">
          <div className="flex items-center justify-between pb-1 text-[11px] font-mono">
            <span className="text-[#d4c5ad] uppercase tracking-wider">Tournament Tree</span>
            <span className="text-[#a5e7ff]">Bo3 Series • 8 Verified Guilds</span>
          </div>

          {/* Segmented Stage Control */}
          <div className="flex items-center bg-[#151b29] border border-[#242a39] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveStage("qf")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeStage === "qf"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/30 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span>Quarterfinals</span>
              <span className="text-[#f3b72c] text-[9px] font-bold">Round 1</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage("semi")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeStage === "semi"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/40 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span>Semifinals</span>
              <span className="text-[#d4c5ad]/70 text-[9px]">Round 2</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage("finals")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center cursor-pointer ${
                activeStage === "finals"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/30 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span className="flex items-center gap-1">
                <Lock size={11} /> Grand Finals
              </span>
              <span className="text-[#d4c5ad]/70 text-[9px]">Championship</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BRACKET ROUND VIEW CONTAINER                                              */}
        {/* ========================================================================= */}
        <section className="px-4 mt-3 flex flex-col gap-3">
          {/* QUARTERFINALS VIEW */}
          {activeStage === "qf" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dde2f6]">Stage 1: Quarterfinal Seedings</span>
                <span className="text-[10px] font-mono text-[#00d2ff]">Top 8 Qualifying Standings</span>
              </div>

              {[
                { match: 1, seedA: 1, seedB: 8 },
                { match: 2, seedA: 4, seedB: 5 },
                { match: 3, seedA: 2, seedB: 7 },
                { match: 4, seedA: 3, seedB: 6 },
              ].map((m) => (
                <div key={m.match} className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#d4c5ad]">
                    <span className="flex items-center gap-1">
                      <Gamepad2 size={12} className="text-[#a5e7ff]" /> QF Match #{m.match}
                    </span>
                    <span className="text-[#ffd78d]">Awaiting Qualifiers</span>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-[#151b29] border border-[#242a39] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#242a39] text-[#ffd78d] text-xs font-mono font-bold flex items-center justify-center">
                          #{m.seedA}
                        </span>
                        <span className="text-xs font-medium text-[#d4c5ad]">Seed #{m.seedA} Syndicate</span>
                      </div>
                      <span className="text-xs font-mono text-[#d4c5ad]/60">—</span>
                    </div>

                    <div className="h-[1px] bg-[#242a39] w-full" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#242a39] text-[#ffd78d] text-xs font-mono font-bold flex items-center justify-center">
                          #{m.seedB}
                        </span>
                        <span className="text-xs font-medium text-[#d4c5ad]">Seed #{m.seedB} Syndicate</span>
                      </div>
                      <span className="text-xs font-mono text-[#d4c5ad]/60">—</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SEMIFINALS VIEW */}
          {activeStage === "semi" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dde2f6]">Stage 2: Semifinal Duels</span>
                <span className="text-[10px] font-mono text-[#d4c5ad]">First to 2 Wins</span>
              </div>

              {[
                { name: "Semifinal Alpha", winnerA: "Winner QF 1", winnerB: "Winner QF 2" },
                { name: "Semifinal Beta", winnerA: "Winner QF 3", winnerB: "Winner QF 4" },
              ].map((s) => (
                <div key={s.name} className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-3.5 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-[#00d2ff] font-bold">{s.name}</span>
                  <div className="p-3 rounded-xl bg-[#151b29] border border-[#242a39] flex flex-col gap-2 text-xs text-[#d4c5ad]">
                    <div className="flex justify-between items-center">
                      <span>{s.winnerA}</span>
                      <span className="font-mono text-[#d4c5ad]/50">—</span>
                    </div>
                    <div className="h-[1px] bg-[#242a39] w-full" />
                    <div className="flex justify-between items-center">
                      <span>{s.winnerB}</span>
                      <span className="font-mono text-[#d4c5ad]/50">—</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRAND FINALS VIEW */}
          {activeStage === "finals" && (
            <div className="bg-[#191f2e] border border-[#f3b72c]/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#242a39] pb-2">
                <span className="text-sm font-black text-[#ffd78d] flex items-center gap-1.5">
                  <Trophy size={16} /> Grand Arena Finals
                </span>
                <span className="text-[10px] font-mono bg-[#f3b72c]/15 text-[#ffd78d] px-2 py-0.5 rounded-full font-bold">
                  Bo3 Championship
                </span>
              </div>

              <div className="flex flex-col items-center text-center py-2">
                <span className="text-xs text-[#d4c5ad]">Championship Purse</span>
                <span className="text-3xl font-black text-[#ffd78d] font-mono mt-1">
                  25,000 NIM
                </span>
                <span className="text-[10px] text-[#68f5b8] font-mono mt-0.5">
                  Winner Takes Gold Cup + 25,000 NIM
                </span>
              </div>

              <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-[#d4c5ad]">
                  <span>Winner of Semifinal Alpha</span>
                  <span className="font-mono">—</span>
                </div>
                <div className="flex items-center justify-center -my-1">
                  <span className="text-[10px] font-mono text-[#ffd78d] italic font-bold">VS</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#d4c5ad]">
                  <span>Winner of Semifinal Beta</span>
                  <span className="font-mono">—</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* HOW TO EARN QUALIFIER POINTS                                              */}
        {/* ========================================================================= */}
        <section className="px-4 my-3">
          <div className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-4 flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#dde2f6] flex items-center gap-1.5">
                <Swords size={16} className="text-[#ffd78d]" />
                <span>Earn Qualification Honor</span>
              </span>
              <span className="text-[10px] font-mono text-[#68f5b8]">Live Arena Duels</span>
            </div>

            <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
              Every ranked match won by guild members adds points to your syndicate's qualifying score. The top 8 syndicates advance directly to the Playoff Bracket.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <Link
                href="/games/ludo-league"
                className="p-3 rounded-xl bg-[#151b29] border border-[#242a39] hover:border-[#f3b72c]/40 flex flex-col items-center text-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-[#dde2f6]">Ludo Arena</span>
                <span className="text-[10px] text-[#68f5b8] font-mono">+40 pts / win</span>
              </Link>
              <Link
                href="/games/connect-four"
                className="p-3 rounded-xl bg-[#151b29] border border-[#242a39] hover:border-[#f3b72c]/40 flex flex-col items-center text-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-[#dde2f6]">Connect 4 Duel</span>
                <span className="text-[10px] text-[#68f5b8] font-mono">+25 pts / win</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
