import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Gem,
  Gift,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Flame,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { ArenaPatronVault } from "@/components/staking/ArenaPatronVault";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

type EarnTab = "all" | "vault" | "referrals" | "rewards";

export default function Earn() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { priceUsd, isLive, nimToUsd, formatUsd } = useNimiqPrice();

  const [activeTab, setActiveTab] = useState<EarnTab>("all");

  const isClaimed = Boolean((user as any)?.welcomeClaimed);
  const points = (user as any)?.points ?? (isClaimed ? 1000 : 0);
  const estPointsUsd = (points * 0.001).toFixed(2); // 1,000 pts = $1.00 USD benchmark

  const claimRewardMutation = trpc.auth.claimWelcomeReward.useMutation();

  async function handleClaimWelcome() {
    try {
      const res = await claimRewardMutation.mutateAsync();
      await utils.auth.me.invalidate();
      await utils.auth.getReferralStats.invalidate();
      toast.success("Welcome Gift Claimed!", {
        description: res.message || "+1,000 Arena Points added to your balance!",
      });
    } catch (err) {
      toast.error("Claim failed", {
        description: err instanceof Error ? err.message : "Try again later",
      });
    }
  }

  return (
    <div className="max-w-md w-full mx-auto min-h-screen bg-[#0d1321] text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif] pb-24 pt-safe relative selection:bg-[#e5a00d] selection:text-black">
      {/* TOP CYBER APP BAR */}
      <header className="sticky top-0 z-40 bg-[#0d1321]/90 backdrop-blur-xl border-b border-[#242a39] px-4 py-3 flex items-center justify-between shadow-sm">
        <Link
          href="/"
          className="w-9 h-9 rounded-xl bg-[#171d2b] border border-[#2c3345] flex items-center justify-center text-[#94a3b8] hover:text-white hover:border-[#f3b72c]/40 transition-colors active:scale-95"
        >
          <ArrowLeft size={17} />
        </Link>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#f3b72c]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#dde2f6]">
              Rewards Hub
            </span>
          </div>
          <span className="text-[10px] text-[#94a3b8] font-mono">Season 1 Yield</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#151b29] border border-[#2f3544]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          <span className="text-[10px] text-[#dde2f6] font-mono font-medium">
            {user?.name ? user.name.slice(0, 10) : "Guest"}
          </span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 px-4 pt-4 flex flex-col gap-4">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#1c2438] via-[#151b29] to-[#0d1321] border border-[#2f3544] p-5 shadow-lg">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#f3b72c]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3b72c]/15 border border-[#f3b72c]/30 text-[#f3b72c] text-[10px] font-bold font-mono uppercase tracking-wider">
                <Flame size={12} />
                Protocol Incentives
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#171d2b] border border-[#2c3345] text-[#94a3b8] text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                1 NIM ≈ {formatUsd(priceUsd)}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Play, Stake & <span className="text-[#f3b72c]">Earn.</span>
              </h1>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Claim 1,000 welcome points, earn 2% lifetime commissions on referred wins, and stake in the Patron Vault for PoS yield.
              </p>
            </div>

            {/* BALANCE CAPSULE */}
            <div className="mt-1 p-3 rounded-xl bg-[#080d17]/80 border border-[#242a39] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f3b72c]/15 border border-[#f3b72c]/30 flex items-center justify-center text-[#f3b72c]">
                  <Sparkles size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#94a3b8] font-mono uppercase tracking-wider">
                    Arena Balance
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {points.toLocaleString()} <span className="text-[11px] text-[#f3b72c]">PTS</span>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#94a3b8] font-mono block">EST. VALUE</span>
                <span className="text-xs font-mono font-bold text-[#10b981]">
                  ≈ ${estPointsUsd} USD
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* WELCOME REWARD ACTION CARD */}
        <section
          className={`rounded-2xl p-4 border transition-all shadow-md ${
            isClaimed
              ? "bg-[#10b981]/5 border-[#10b981]/30"
              : "bg-gradient-to-r from-[#1b2233] to-[#151b29] border-[#f3b72c]/40"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isClaimed
                    ? "bg-[#10b981]/15 border-[#10b981]/30 text-[#10b981]"
                    : "bg-[#f3b72c]/15 border-[#f3b72c]/30 text-[#f3b72c]"
                }`}
              >
                <Gift size={22} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                    Welcome Gift
                  </span>
                  {isClaimed && (
                    <span className="px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] text-[9px] font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isClaimed ? "1,000 Points Credited" : "Claim 1,000 Welcome Points"}
                </h3>
                <p className="text-[11px] text-[#94a3b8]">
                  {isClaimed
                    ? "Unlocked for tournaments and beta privileges."
                    : "Free for all new players entering the arena."}
                </p>
              </div>
            </div>
          </div>

          {!isClaimed && (
            <button
              onClick={handleClaimWelcome}
              disabled={claimRewardMutation.isPending}
              className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-[#f3b72c] to-[#e5a00d] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#f3b72c]/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Gift size={16} />
              {claimRewardMutation.isPending ? "Claiming..." : "Claim +1,000 Points Now"}
            </button>
          )}
        </section>

        {/* SECTION FILTER TABS */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#151b29] border border-[#242a39] overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "All Hubs" },
              { id: "vault", label: "Patron Vault" },
              { id: "referrals", label: "Referral Pass" },
              { id: "rewards", label: "Pot Rules" },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[75px] py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all text-center ${
                activeTab === tab.id
                  ? "bg-[#242a39] text-white shadow-sm border border-[#2f3544]"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. ARENA PATRON VAULT & STAKING */}
        {(activeTab === "all" || activeTab === "vault") && (
          <section id="vault" className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Coins size={14} className="text-[#f3b72c]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dde2f6]">
                  Patron Vault & Staking
                </h2>
              </div>
              <span className="text-[10px] text-[#10b981] font-mono font-bold">
                6.0% - 8.0% APY
              </span>
            </div>
            <ArenaPatronVault />
          </section>
        )}

        {/* 2. REFERRAL & COMMISSIONS */}
        {(activeTab === "all" || activeTab === "referrals") && (
          <section id="referrals" className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-[#38bdf8]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dde2f6]">
                  Referral Commissions
                </h2>
              </div>
              <span className="text-[10px] text-[#38bdf8] font-mono font-bold">
                2% Lifetime
              </span>
            </div>
            <ReferralCard />
          </section>
        )}

        {/* 3. WAYS TO EARN (CYBER GRID) */}
        {(activeTab === "all" || activeTab === "rewards") && (
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Trophy size={14} className="text-[#f3b72c]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dde2f6]">
                  Protocol Reward Streams
                </h2>
              </div>
              <span className="text-[10px] text-[#94a3b8] font-mono">Verified PoS</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Box 1 */}
              <div className="p-3.5 rounded-xl bg-[#151b29]/80 border border-[#242a39] flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#f3b72c]/15 flex items-center justify-center text-[#f3b72c]">
                    <Trophy size={16} />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#f3b72c]/15 text-[#f3b72c] text-[9px] font-mono font-bold">
                    90% ESCROW
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Winner Prize Pot</h4>
                  <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                    Match winners receive 90% of the entire table escrow pot deposited directly to wallet.
                  </p>
                </div>
              </div>

              {/* Box 2 */}
              <div className="p-3.5 rounded-xl bg-[#151b29]/80 border border-[#242a39] flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#10b981]/15 flex items-center justify-center text-[#10b981]">
                    <Coins size={16} />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] text-[9px] font-mono font-bold">
                    6-8% APY
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Patron Staking</h4>
                  <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                    Stake NIM in the Patron Vault to earn PoS rewards plus monthly match fee dividend share.
                  </p>
                </div>
              </div>

              {/* Box 3 */}
              <div className="p-3.5 rounded-xl bg-[#151b29]/80 border border-[#242a39] flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 flex items-center justify-center text-[#38bdf8]">
                    <Users size={16} />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] text-[9px] font-mono font-bold">
                    2% COMMISSION
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Referral Royalties</h4>
                  <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                    Earn 2% of every win your invited friends take home, credited automatically in NIM.
                  </p>
                </div>
              </div>

              {/* Box 4 */}
              <div className="p-3.5 rounded-xl bg-[#151b29]/80 border border-[#242a39] flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#c084fc]/15 flex items-center justify-center text-[#c084fc]">
                    <Gem size={16} />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#c084fc]/15 text-[#c084fc] text-[9px] font-mono font-bold">
                    SEASON POOLS
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Gladiator Tiers</h4>
                  <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                    Climb Elo ratings into Gold, Diamond, and Grandmaster to claim seasonal leaderboard pools.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ON-CHAIN TRUST BADGE */}
        <div className="p-3.5 rounded-xl bg-[#151b29]/60 border border-[#242a39] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center text-[#94a3b8] shrink-0">
            <ShieldCheck size={18} className="text-[#10b981]" />
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            All pot calculations, escrow holds, and dividend payouts are cryptographically secured on the Nimiq Proof-of-Stake blockchain.
          </p>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileBottomNav />
    </div>
  );
}
