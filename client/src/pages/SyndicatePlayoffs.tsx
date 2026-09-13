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
  ExternalLink,
  Award,
  Zap,
  Check,
  Flame,
  X,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default function SyndicatePlayoffs() {
  const [, setLocation] = useLocation();
  const [activeStage, setActiveStage] = useState<"qf" | "semi" | "finals">("semi");
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

  const seedHash = "0x3e8a91f4...c92b8420";

  const handleCopySeed = () => {
    navigator.clipboard.writeText("0x3e8a91f4b209a84f3e1c92b8420e1829");
    toast.success("Consensus Seed Hash copied to clipboard!");
  };

  const handleEnterMatch = () => {
    toast.info("Entering Live Game 3 Decider arena...");
    setLocation("/games/connect-four");
  };

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
                className="inline-flex items-center gap-1.5 text-[#d4c5ad] hover:text-[#ffd78d] transition-colors py-1 text-xs font-mono font-bold uppercase"
              >
                <ArrowLeft size={16} className="text-[#ffd78d]" />
                <span>Clan Syndicate War Room</span>
              </button>
            </Link>

            <div className="bg-[#242a39] border border-[#2f3544] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c] animate-pulse" />
              <span className="text-[10px] font-mono text-[#ffd78d] uppercase font-bold">
                Season 4 Finals
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <h1 className="text-xl font-black text-[#dde2f6] tracking-tight">
              Syndicate Playoffs: Grand Arena Cup
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-[#d4c5ad]">
              <span className="inline-flex items-center gap-1 bg-[#151b29] border border-[#242a39] px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                <span className="text-[#00d2ff] font-bold">LIVE • Semifinals</span>
              </span>
              <span className="text-[#d4c5ad]/70 flex items-center gap-1">
                <span>#</span>
                <span>Block #3,982,500</span>
              </span>
              <span className="text-[#68f5b8] flex items-center gap-0.5 font-bold">
                <ShieldCheck size={13} />
                <span>Albatross Verified</span>
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
                  <span>Non-Custodial Smart Escrow</span>
                </div>
                <div className="text-2xl font-black text-[#ffd78d] flex items-baseline gap-1 mt-0.5 font-mono">
                  100,000 <span className="text-xs font-bold text-[#dde2f6]">NIM</span>
                  <span className="text-xs text-[#d4c5ad] font-normal font-sans">(~$20,000 USD)</span>
                </div>
              </div>

              <div className="bg-[#242a39] border border-[#2f3544] px-2.5 py-1 rounded-lg text-right">
                <span className="block text-[10px] font-mono text-[#68f5b8] font-bold">Safe Vault</span>
                <span className="block text-[9px] font-mono text-[#d4c5ad]">2/3 Quorum</span>
              </div>
            </div>

            {/* Prize Payout Distribution Tiers */}
            <div className="grid grid-cols-3 gap-1 mt-3 pt-2 bg-[#151b29]/90 border border-[#242a39] p-1.5 rounded-xl">
              <div className="flex flex-col items-center text-center py-1">
                <span className="text-[10px] font-mono text-[#ffd78d] flex items-center gap-0.5 font-bold">
                  <Trophy size={11} /> 1st Place
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">50,000 NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">50% Share</span>
              </div>

              <div className="flex flex-col items-center text-center py-1 border-x border-[#242a39]">
                <span className="text-[10px] font-mono text-[#00d2ff] flex items-center gap-0.5 font-bold">
                  <Award size={11} /> 2nd Place
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">25,000 NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">25% Share</span>
              </div>

              <div className="flex flex-col items-center text-center py-1">
                <span className="text-[10px] font-mono text-[#d4c5ad] flex items-center gap-0.5 font-bold">
                  <ShieldCheck size={11} /> 3rd-4th
                </span>
                <span className="text-xs font-black text-[#dde2f6] font-mono mt-0.5">12.5k NIM</span>
                <span className="text-[9px] font-mono text-[#d4c5ad]/70">Each</span>
              </div>
            </div>

            {/* Player Clan Guarantee Callout */}
            <div className="mt-3 bg-[#242a39] border border-[#2f3544] p-2.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f3b72c] animate-ping shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#ffd78d]">
                    Gold Legion [GLDN] In Semifinals
                  </span>
                  <span className="text-[10px] text-[#d4c5ad]">Guaranteed Clan Dividend Pool</span>
                </div>
              </div>
              <span className="text-xs font-black text-[#68f5b8] font-mono bg-[#191f2e] border border-[#242a39] px-2 py-1 rounded-lg">
                +12,500 NIM min
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STAGE NAVIGATION & TOURNAMENT FORMAT SELECTOR                             */}
        {/* ========================================================================= */}
        <section className="px-4 mt-2">
          <div className="flex items-center justify-between pb-1 text-[11px] font-mono">
            <span className="text-[#d4c5ad] uppercase tracking-wider">Tournament Tree</span>
            <span className="text-[#a5e7ff]">Bo3 Series • 8 Elite Clans</span>
          </div>

          {/* Segmented Stage Control */}
          <div className="flex items-center bg-[#151b29] border border-[#242a39] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveStage("qf")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center ${
                activeStage === "qf"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/30 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span>Quarterfinals</span>
              <span className="text-[#68f5b8] flex items-center gap-0.5 text-[9px] font-bold">
                <CheckCircle2 size={11} /> Complete
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage("semi")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center ${
                activeStage === "semi"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/40 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
                Semifinals
              </span>
              <span className="text-[#00d2ff] text-[9px] font-bold">Live Round</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStage("finals")}
              className={`flex-1 py-2 px-1 rounded-lg text-center font-mono text-[11px] transition-all flex flex-col items-center justify-center ${
                activeStage === "finals"
                  ? "bg-[#191f2e] text-[#ffd78d] font-bold border border-[#f3b72c]/30 shadow-md"
                  : "text-[#d4c5ad] hover:bg-[#191f2e]/60"
              }`}
            >
              <span className="flex items-center gap-1">
                <Lock size={11} /> Grand Finals
              </span>
              <span className="text-[#d4c5ad]/70 text-[9px]">Upcoming</span>
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BRACKET ROUND VIEW CONTAINER                                              */}
        {/* ========================================================================= */}
        <section className="px-4 mt-3 flex flex-col gap-3">
          {/* SEMIFINALS VIEW */}
          {activeStage === "semi" && (
            <>
              {/* ROUND HEADER METADATA */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#dde2f6]">Stage 2: Semifinal Duels</span>
                  <span className="bg-[#00d2ff]/15 border border-[#00d2ff]/25 text-[#00d2ff] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    2 Matches
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#d4c5ad]">First to 2 Wins</span>
              </div>

              {/* MATCH A: COMPLETED / FINALIZED */}
              <div className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-3.5 flex flex-col gap-2.5 relative shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#d4c5ad] flex items-center gap-1">
                    <Gamepad2 size={13} className="text-[#a5e7ff]" /> Bracket Slot Alpha
                  </span>
                  <span className="bg-[#151b29] border border-[#242a39] text-[#d4c5ad] text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-[#68f5b8]" /> Finalized (#3,981,990)
                  </span>
                </div>

                {/* Duel Roster Row */}
                <div className="flex flex-col gap-1.5 bg-[#151b29] border border-[#242a39] p-2.5 rounded-xl">
                  {/* Team 1 (Winner) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-xs font-mono text-[#ffd78d] font-bold">
                        #1
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-[#dde2f6] flex items-center gap-1 truncate">
                          Nexus Syndicate
                          <Check size={12} className="text-[#68f5b8]" />
                        </span>
                        <span className="text-[10px] font-mono text-[#d4c5ad]/80">Seed 1 · ELO 2,310</span>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-[#68f5b8] bg-[#68f5b8]/15 border border-[#68f5b8]/20 px-2.5 py-0.5 rounded-md">
                      2
                    </span>
                  </div>

                  <div className="h-[1px] bg-[#242a39] w-full my-0.5" />

                  {/* Team 2 (Defeated) */}
                  <div className="flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#242a39] flex items-center justify-center text-xs font-mono text-[#d4c5ad] font-bold">
                        #4
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-[#dde2f6] truncate">
                          Solaris Knights
                        </span>
                        <span className="text-[10px] font-mono text-[#d4c5ad]/80">Seed 4 · ELO 2,120</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#d4c5ad] bg-[#242a39] px-2.5 py-0.5 rounded-md">
                      1
                    </span>
                  </div>
                </div>

                {/* Series Recap Footer */}
                <div className="flex items-center justify-between text-[10px] font-mono text-[#d4c5ad] pt-0.5">
                  <span>Series: G1 (C4) · G2 (Ludo) · G3 (C4)</span>
                  <a
                    href="https://testnet.nimiq.watch/#/3981990"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00d2ff] hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Escrow Receipt</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* MATCH B: THE ACTIVE DECIDER (YOU ARE PLAYING) */}
              <div className="bg-[#191f2e] border border-[#f3b72c]/40 rounded-2xl p-4 flex flex-col gap-2.5 relative shadow-2xl overflow-hidden">
                {/* Glow Top Accent Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00d2ff] via-[#f3b72c] to-[#00d2ff]" />

                {/* Live Broadcast Badge Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-[#00d2ff]/15 border border-[#00d2ff]/30 text-[#00d2ff] px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-ping" />
                      LIVE: Game 3 Decider
                    </span>
                    <span className="text-[10px] font-mono text-[#d4c5ad]">Series: 1 - 1</span>
                  </div>
                  <span className="bg-[#f3b72c]/15 border border-[#f3b72c]/25 text-[#ffd78d] text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    25,000 NIM Purse
                  </span>
                </div>

                {/* Clan Competitor VS Cards */}
                <div className="grid grid-cols-1 gap-1.5 mt-0.5">
                  {/* Team A (Your Clan) */}
                  <div className="bg-[#242a39] border border-[#f3b72c]/40 p-2.5 rounded-xl flex items-center justify-between relative overflow-hidden shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f3b72c]" />
                    <div className="flex items-center gap-2 pl-1.5">
                      <div className="w-8 h-8 rounded-lg bg-[#f3b72c]/20 border border-[#f3b72c]/40 flex items-center justify-center text-xs font-mono text-[#ffd78d] font-black">
                        #2
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-[#ffd78d]">
                            Gold Legion [GLDN]
                          </span>
                          <span className="bg-[#f3b72c] text-[#412d00] text-[9px] font-mono font-black px-1.5 py-0.2 rounded">
                            YOU
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#d4c5ad]">
                          MVP: Valkyrie (Lead Tactician) · 2,240 ELO
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-[#dde2f6] px-3 py-1 bg-[#151b29] border border-[#242a39] rounded-lg">
                      1
                    </span>
                  </div>

                  {/* Center Match Micro Splitter */}
                  <div className="flex items-center justify-center -my-1 relative z-10">
                    <div className="bg-[#151b29] border border-[#242a39] px-3 py-0.5 rounded-full text-[9px] font-mono text-[#d4c5ad] tracking-wider font-bold shadow-sm">
                      VS TIEBREAKER
                    </div>
                  </div>

                  {/* Team B (Challenger Clan) */}
                  <div className="bg-[#242a39]/70 border border-[#242a39] p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#151b29] border border-[#242a39] flex items-center justify-center text-xs font-mono text-[#d4c5ad] font-bold">
                        #3
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-[#dde2f6]">
                          Cyber Samurai [CYBR]
                        </span>
                        <span className="text-[10px] font-mono text-[#d4c5ad]/80">
                          MVP: Kage_X (Grandmaster) · 2,195 ELO
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-[#d4c5ad] px-3 py-1 bg-[#151b29] border border-[#242a39] rounded-lg">
                      1
                    </span>
                  </div>
                </div>

                {/* Current Sub-game Preview */}
                <div className="bg-[#151b29] border border-[#242a39] p-2.5 rounded-xl flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <Gamepad2 size={18} className="text-[#00d2ff]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dde2f6]">
                        Active Duel: Connect 4 Blitz
                      </span>
                      <span className="text-[10px] font-mono text-[#d4c5ad]">
                        Turn 14 • 12s Shot Clock
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#00d2ff] bg-[#00d2ff]/10 border border-[#00d2ff]/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Eye size={11} />
                    <span>428</span>
                  </span>
                </div>

                {/* Action Button / Commit To Game */}
                <button
                  type="button"
                  onClick={handleEnterMatch}
                  className="w-full h-12 bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] rounded-xl text-xs font-black shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-1"
                >
                  <Swords size={18} />
                  <span>Enter War Room / Spectate Game 3</span>
                </button>
              </div>

              {/* GRAND FINALS / PROJECTION NODE */}
              <div className="bg-[#151b29] border border-[#242a39] rounded-2xl p-3.5 flex flex-col gap-2 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#ffd78d] font-bold flex items-center gap-1.5">
                    <Trophy size={14} />
                    <span>Grand Finals Showdown</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#d4c5ad]">
                    Block #3,983,000 (~18:00 UTC)
                  </span>
                </div>

                <div className="bg-[#191f2e] border border-[#242a39] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#242a39] border border-[#2f3544] flex items-center justify-center text-[#ffd78d]">
                      <Trophy size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dde2f6]">Nexus Syndicate</span>
                      <span className="text-[10px] font-mono text-[#d4c5ad]">
                        Awaiting Semifinal B Winner
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-[#ffd78d] block">
                      50,000 NIM
                    </span>
                    <span className="text-[9px] font-mono text-[#68f5b8] font-bold block">
                      1st Place Purse
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* QUARTERFINALS VIEW */}
          {activeStage === "qf" && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#d4c5ad]">
                <span className="font-bold text-[#dde2f6]">Stage 1: Quarterfinals Complete</span>
                <span>8 Clans · 4 Duels</span>
              </div>

              {/* QF Match 1 */}
              <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono text-[#d4c5ad]">
                  <span>QF Match 1</span>
                  <span className="text-[#68f5b8]">Nexus Syndicate Won 2 - 0</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#dde2f6]">#1 Nexus Syndicate</span>
                  <span className="font-mono text-[#68f5b8] font-bold">2</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#d4c5ad]">
                  <span>#8 Iron Valkyries</span>
                  <span className="font-mono">0</span>
                </div>
              </div>

              {/* QF Match 2 */}
              <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono text-[#d4c5ad]">
                  <span>QF Match 2</span>
                  <span className="text-[#68f5b8]">Solaris Knights Won 2 - 1</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#dde2f6]">#4 Solaris Knights</span>
                  <span className="font-mono text-[#68f5b8] font-bold">2</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#d4c5ad]">
                  <span>#5 Shadow Stalkers</span>
                  <span className="font-mono">1</span>
                </div>
              </div>

              {/* QF Match 3 */}
              <div className="bg-[#191f2e] border border-[#f3b72c]/40 rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono text-[#ffd78d]">
                  <span>QF Match 3 (YOUR CLAN)</span>
                  <span className="text-[#68f5b8]">Gold Legion Won 2 - 0</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#ffd78d]">#2 Gold Legion [YOU]</span>
                  <span className="font-mono text-[#68f5b8] font-bold">2</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#d4c5ad]">
                  <span>#7 Obsidian Dragons</span>
                  <span className="font-mono">0</span>
                </div>
              </div>

              {/* QF Match 4 */}
              <div className="bg-[#191f2e] border border-[#242a39] rounded-xl p-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-mono text-[#d4c5ad]">
                  <span>QF Match 4</span>
                  <span className="text-[#68f5b8]">Cyber Samurai Won 2 - 1</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#dde2f6]">#3 Cyber Samurai</span>
                  <span className="font-mono text-[#68f5b8] font-bold">2</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#d4c5ad]">
                  <span>#6 Quantum Vanguard</span>
                  <span className="font-mono">1</span>
                </div>
              </div>
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
                <span className="text-xs text-[#d4c5ad]">Grand Championship Purse</span>
                <span className="text-3xl font-black text-[#ffd78d] font-mono mt-1">
                  50,000 NIM
                </span>
                <span className="text-[10px] text-[#68f5b8] font-mono mt-0.5">
                  Winner Takes Gold Cup + 50,000 NIM
                </span>
              </div>

              <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#dde2f6]">Nexus Syndicate</span>
                  <span className="text-[10px] font-mono text-[#68f5b8] bg-[#68f5b8]/10 px-1.5 py-0.5 rounded">
                    Qualified (Seed 1)
                  </span>
                </div>
                <div className="flex items-center justify-center -my-1">
                  <span className="text-[10px] font-mono text-[#d4c5ad]/60 italic font-bold">
                    VS
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ffd78d]">
                    Winner of Semifinal B (GLDN vs CYBR)
                  </span>
                  <span className="text-[10px] font-mono text-[#00d2ff] bg-[#00d2ff]/10 px-1.5 py-0.5 rounded">
                    In Progress
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* PROVABLY FAIR & ESCROW RULES CARD                                         */}
        {/* ========================================================================= */}
        <section className="px-4 my-3">
          <div className="bg-[#191f2e] border border-[#242a39] rounded-2xl p-4 flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#dde2f6] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[#68f5b8]" />
                <span>Provably Fair Consensus Escrow</span>
              </span>
              <span className="text-[10px] font-mono text-[#68f5b8] font-bold">Albatross v2</span>
            </div>

            <div className="flex flex-col gap-2 text-xs text-[#d4c5ad]">
              <div className="bg-[#151b29] border border-[#242a39] p-2 rounded-lg font-mono text-[10px] flex items-center justify-between">
                <span className="text-[#d4c5ad]/80">Seed Hash: {seedHash}</span>
                <button
                  type="button"
                  onClick={handleCopySeed}
                  className="text-[#ffd78d] hover:underline font-bold"
                >
                  Block #3,975,000
                </button>
              </div>

              <div className="flex items-start gap-2 pt-0.5">
                <span className="text-xs text-[#00d2ff] shrink-0 font-bold">•</span>
                <span className="text-[11px] leading-relaxed">
                  Bo3 Matchup Sequence: Game 1 (Connect 4 Blitz) · Game 2 (Ludo Speed Duel) · Game 3
                  Tiebreak (Connect 4 Master).
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-xs text-[#68f5b8] shrink-0 font-bold">•</span>
                <span className="text-[11px] leading-relaxed">
                  Smart Contract Escrow dispatches rewards instantly to Clan multi-sig vaults upon 2/3
                  validator confirmation.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STICKY CLAN QUICK ACTION PILL                                             */}
        {/* ========================================================================= */}
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40">
          <div className="bg-[#191f2e]/95 backdrop-blur-md border border-[#f3b72c]/40 rounded-full px-4 py-2 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f3b72c] animate-ping shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#dde2f6]">Game 3 Underway</span>
                <span className="text-[10px] font-mono text-[#ffd78d] font-bold">
                  GLDN Turn Pending (0:12)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRosterModal(true)}
              className="h-8 px-3 bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] rounded-full text-xs font-mono font-bold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span>Roster</span>
              <Users size={14} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CLAN ROSTER MODAL DRAWER                                                  */}
        {/* ========================================================================= */}
        {showRosterModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center">
            <div className="bg-[#151b29] border-t border-[#242a39] w-full max-w-md rounded-t-3xl p-4 space-y-3 pb-8">
              <div className="flex items-center justify-between pb-2 border-b border-[#242a39]">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#ffd78d]" />
                  <span className="text-sm font-black text-[#dde2f6]">Gold Legion Roster</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="w-8 h-8 rounded-full bg-[#191f2e] border border-[#242a39] flex items-center justify-center text-[#d4c5ad]"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-[#191f2e] border border-[#f3b72c]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#ffd78d]">Valkyrie (YOU)</span>
                    <span className="text-[9px] font-mono bg-[#f3b72c] text-[#412d00] font-bold px-1 rounded">
                      LEAD
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#68f5b8]">In Game 3</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between">
                  <span className="text-xs text-[#dde2f6]">Solstice_X</span>
                  <span className="text-xs font-mono text-[#00d2ff]">Game 2 MVP</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between">
                  <span className="text-xs text-[#dde2f6]">AeroStrike</span>
                  <span className="text-xs font-mono text-[#d4c5ad]">Sub 1</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between">
                  <span className="text-xs text-[#dde2f6]">ZephyrKing</span>
                  <span className="text-xs font-mono text-[#d4c5ad]">Sub 2</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="w-full h-10 rounded-xl bg-[#242a39] text-[#dde2f6] text-xs font-bold"
              >
                Close Roster
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
