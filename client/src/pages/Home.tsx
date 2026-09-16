import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { formatNim } from "@shared/game/pot-distribution";
import { toast } from "sonner";
import {
  Wallet,
  Users,
  Eye,
  Swords,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Trophy,
  Zap,
  ArrowRight,
  ShieldCheck,
  X,
  Play,
  RotateCw,
  Plus,
} from "lucide-react";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { IdentityRegistrationModal } from "@/components/profile/IdentityRegistrationModal";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";
import { useNimiqPrice, DEFAULT_NIM_USD_PRICE } from "@/lib/nimiq-price";

export default function Home() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const {
    address,
    balanceNim,
    isConnected,
    isInsideNimiqPay,
    refreshBalance,
    setAddress,
  } = useNimiqWallet();

  // Authoritative data queries
  const ludoQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
  const connect4Query = trpc.game.getBySlug.useQuery({ slug: "connect-four" });
  const activeMatchesQuery = trpc.match.listActiveMatches.useQuery({ limit: 5 }, { refetchInterval: 5000 });
  const leaderboardQuery = trpc.leaderboard.getTop.useQuery({ limit: 3 });

  const [connectionMode, setConnectionMode] = useState<any>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("nimiq_wallet_mode") || "none") : "none"
  );
  const { priceUsd, formatUsd } = useNimiqPrice();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Interactive UI state
  const [quickPlayGame, setQuickPlayGame] = useState<"ludo-league" | "connect-four">("ludo-league");
  const [selectedUsdStake, setSelectedUsdStake] = useState<number>(10);
  const USD_STAKES = [10, 50, 100, 500];

  const calculateNimFromUsd = (usd: number): number => {
    // priceUsd comes from useNimiqPrice, seeded with its own DEFAULT_NIM_USD_PRICE
    // before any fetch resolves, so it's never actually 0 here — this used to
    // guard that with a *second*, different hardcoded rate (2500 NIM/$1, vs.
    // the price module's ~2573), a fallback-behind-a-fallback that could never
    // run and would have disagreed with the real one if it ever did.
    const rate = priceUsd > 0 ? priceUsd : DEFAULT_NIM_USD_PRICE;
    const rawNim = usd / rate;
    if (rawNim >= 1000) {
      return Math.round(rawNim / 100) * 100;
    }
    return Math.max(10, Math.round(rawNim));
  };

  const [selectedStake, setSelectedStake] = useState<number>(() => calculateNimFromUsd(10));
  const [isLudoFlowOpen, setIsLudoFlowOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isWagerSheetOpen, setIsWagerSheetOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [sheetGameTitle, setSheetGameTitle] = useState("Ludo Blitz");
  const [sheetStake, setSheetStake] = useState(50);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isDripping, setIsDripping] = useState(false);

  const requestDrip = trpc.payment.requestTestnetDrip.useMutation();

  const handleCopyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    toast.success("Wallet Address Copied!");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleRequestDrip = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsDripping(true);
      toast.info("Requesting 50 Testnet NIM drip from hot wallet…");
      const res = await requestDrip.mutateAsync({ address });
      if (res.success) {
        toast.success("50 Testnet NIM Received!", {
          description: `Tx: ${res.txHash.slice(0, 10)}… Checking balance.`,
        });
        setTimeout(() => {
          void refreshBalance();
        }, 2500);
      } else {
        toast.info("Direct drip standby", {
          description: res.message || "Opening official Nimiq faucet…",
        });
        if (res.fallbackUrl) {
          window.open(res.fallbackUrl, "_blank");
        }
      }
    } catch (err: any) {
      toast.error("Faucet request failed", {
        description: err instanceof Error ? err.message : "Visit official faucet.",
      });
      window.open("https://testnet.nimiq.watch/#faucet", "_blank");
    } finally {
      setIsDripping(false);
    }
  };

  const openWagerConfirmation = (gameTitle: string, stake: number) => {
    setSheetGameTitle(gameTitle);
    setSheetStake(stake);
    setIsWagerSheetOpen(true);
  };

  const confirmWagerAndLaunch = () => {
    setIsWagerSheetOpen(false);
    setIsLudoFlowOpen(true);
  };

  const activeMatches = activeMatchesQuery.data?.matches || [];
  // The query above is capped at 5 rows for the preview list; this is the
  // real system-wide count, not that page size.
  const totalActiveMatches = activeMatchesQuery.data?.totalCount ?? activeMatches.length;
  const topChampions = leaderboardQuery.data || [];

  // Short formatted address e.g. NQ07 ···· 32F1
  const shortAddress = address
    ? `${address.slice(0, 4)} ···· ${address.slice(-4)}`
    : "Not Connected";

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Mobile-Only App Container */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-[#0d1321] flex flex-col relative shadow-2xl border-x border-[#1e2638]/40">
        
        {/* ========================================================================= */}
        {/* TOP FIXED APP HEADER                                                      */}
        {/* ========================================================================= */}
        <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
          <div className="max-w-md mx-auto w-full pointer-events-auto bg-[#0d1321]/85 backdrop-blur-xl border-b border-[#242a39]/80 shadow-[0_1px_12px_rgba(0,0,0,0.4)] pt-safe">
            <div className="h-16 px-4 flex items-center justify-between">
              
              {/* Left: Brand Identity Emblem */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <NimiqArenaLogo size={32} />
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#ffdea4] tracking-tight leading-none group-hover:text-white transition-colors">
                    NIMIQ ARENA
                  </span>
                  <span className="text-[10px] text-[#ffd78d] uppercase tracking-wider font-mono mt-0.5">
                    Web3 Matchroom
                  </span>
                </div>
              </Link>

              {/* Right: Wallet Balance Pill */}
              <button
                onClick={() => setIsWalletSheetOpen(true)}
                className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#2f3544] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-transform"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-[#22c55e] shadow-[0_0_8px_#22c55e]"
                      : "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]"
                  }`}
                />
                <span className="text-xs font-semibold text-[#dde2f6]">
                  {balanceNim != null ? formatNim(balanceNim) : "0"}{" "}
                  <span className="text-[#ffd78d] font-bold">NIM</span>
                </span>
                <Wallet size={15} className="text-[#a5e7ff]" />
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE CONTENT AREA                                              */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full pt-20 pb-28 px-4 space-y-5">
          
          {/* SECTION 1: CLEAN ARCADE HERO */}
          <section className="text-center pt-1 pb-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#191f2e] border border-[#f3b72c]/30 text-[#ffd78d] text-[11px] font-mono font-bold uppercase tracking-wider mb-2.5">
              <Sparkles size={12} className="text-[#f3b72c]" />
              <span>Instant On-Chain Arena</span>
            </div>
            <h1 className="text-3xl font-black text-[#ffffff] tracking-tight">
              STAKE · PLAY · WIN
            </h1>
            <p className="text-xs text-[#94a3b8] mt-1 max-w-xs mx-auto">
              Real-time 1v1 board game duels with instant non-custodial payouts.
            </p>
          </section>

          {/* SECTION 2: THE 2 MAIN FLAGSHIP GAMES */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#ffd78d]">
                Featured Games
              </span>
              <span className="text-[10px] text-[#94a3b8] font-mono">2 Games Active</span>
            </div>

            {/* Connect 4 Card */}
            <Link
              href="/games/connect-four"
              className="block group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c2333] via-[#151b29] to-[#0d1321] border border-[#f3b72c]/30 hover:border-[#f3b72c]/60 p-4 shadow-xl active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[#242a39] flex-shrink-0 flex items-center justify-center border border-[#f3b72c]/30 text-2xl shadow-[0_0_16px_rgba(243,183,44,0.2)] group-hover:scale-105 transition-transform">
                    🔴
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#dde2f6] group-hover:text-white transition-colors truncate">
                        Connect 4 Blitz
                      </h3>
                      <span className="px-1.5 py-0.5 rounded bg-[#f3b72c]/20 text-[#ffd78d] text-[9px] font-bold font-mono">
                        1v1 DUEL
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Fast 4-in-a-row tactical grid showdown
                    </p>
                  </div>
                </div>

                <div className="h-10 px-4 flex-shrink-0 bg-[#f3b72c] group-hover:bg-[#ffdea4] text-[#412d00] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_4px_16px_rgba(243,183,44,0.3)] transition-colors">
                  <span>PLAY</span>
                  <Play size={13} fill="currentColor" />
                </div>
              </div>
            </Link>

            {/* Ludo Card */}
            <Link
              href="/games/ludo-league"
              className="block group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c2333] via-[#151b29] to-[#0d1321] border border-[#00d2ff]/30 hover:border-[#00d2ff]/60 p-4 shadow-xl active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[#242a39] flex-shrink-0 flex items-center justify-center border border-[#00d2ff]/30 text-2xl shadow-[0_0_16px_rgba(0,210,255,0.2)] group-hover:scale-105 transition-transform">
                    🎲
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#dde2f6] group-hover:text-white transition-colors truncate">
                        Ludo League
                      </h3>
                      <span className="px-1.5 py-0.5 rounded bg-[#00d2ff]/20 text-[#00d2ff] text-[9px] font-bold font-mono">
                        2-4P RACE
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Strategic token race &amp; capture board game
                    </p>
                  </div>
                </div>

                <div className="h-10 px-4 flex-shrink-0 bg-[#00d2ff] group-hover:bg-[#a5e7ff] text-[#003543] rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,210,255,0.3)] transition-colors">
                  <span>PLAY</span>
                  <Play size={13} fill="currentColor" />
                </div>
              </div>
            </Link>
          </section>

          {/* SECTION 3: LIVE ARENA RADAR */}
          <section id="live-matches">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-[#dde2f6]">
                  Live Battles
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff] text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] animate-pulse" />
                  <span>{totalActiveMatches} ACTIVE</span>
                </span>
              </div>
              <Link href="/games/ludo-league" className="text-xs text-[#a5e7ff] hover:underline font-mono">
                View all
              </Link>
            </div>

            {activeMatches.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeMatches.map((match: any) => (
                  <div
                    key={match.id}
                    className="bg-[#151b29] border border-[#2f3544] p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#dde2f6]">
                          {match.gameSlug === "ludo-league" ? "🎲 Ludo Arena" : "🔴 Connect 4"}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">
                          Table #{match.joinCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#ffd78d] font-mono font-bold">
                          {match.stakeNim ? `${match.stakeNim * 2} NIM POT` : "FREE PLAY"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/matches/${match.id}`}
                      className="h-8 px-3 flex-shrink-0 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#a5e7ff] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Eye size={13} />
                      <span>Watch</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#151b29] border border-[#242a39] rounded-2xl p-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#191f2e] flex items-center justify-center text-[#94a3b8]">
                    <Swords size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#dde2f6] block">
                      Arena Ready
                    </span>
                    <span className="text-[11px] text-[#94a3b8] block">
                      Create a room or match with players
                    </span>
                  </div>
                </div>
                <Link
                  href="/games/connect-four"
                  className="h-8 px-3.5 bg-[#242a39] hover:bg-[#2f3544] text-[#ffd78d] text-xs font-bold rounded-xl border border-[#f3b72c]/30 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Host</span>
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 4: TOP ARENA CHAMPIONS */}
          <section>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#dde2f6]">
                Top Champions
              </span>
              <Link
                href="/leaderboard"
                className="text-xs text-[#ffd78d] hover:underline flex items-center gap-0.5 font-mono"
              >
                <span>Full Ranks</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            <div className="bg-[#151b29] border border-[#242a39] rounded-2xl p-2 flex flex-col gap-1 shadow-lg">
              {topChampions.length > 0 ? (
                topChampions.slice(0, 3).map((player: any, idx: number) => (
                  <div
                    key={player.id || idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#191f2e]/60 hover:bg-[#191f2e] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 text-center text-xs font-mono font-bold ${
                          idx === 0
                            ? "text-[#ffd78d]"
                            : idx === 1
                            ? "text-[#a5e7ff]"
                            : "text-[#94a3b8]"
                        }`}
                      >
                        0{idx + 1}
                      </div>
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-[#242a39] overflow-hidden flex items-center justify-center text-xs font-bold text-[#ffd78d]">
                          {(player.name || player.username || "P").slice(0, 1).toUpperCase()}
                        </div>
                        {idx === 0 && (
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#f3b72c] text-[#412d00] text-[8px] flex items-center justify-center font-bold">
                            ★
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#dde2f6]">
                          {player.name || player.username || `Player #${player.id || idx + 1}`}
                        </span>
                        <span className="text-[10px] text-[#68f5b8] font-mono">
                          {player.wins || 0} Wins · Elo {player.rating || 1000}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono font-bold text-[#ffd78d]">
                        {player.matchesPlayed > 0
                          ? `${Math.round(((player.wins || 0) / player.matchesPlayed) * 100)}%`
                          : "100%"}
                      </span>
                      <span className="text-[9px] text-[#94a3b8] uppercase font-mono">
                        Win Rate
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center">
                  <Trophy size={20} className="text-[#ffd78d] mx-auto mb-1 opacity-60" />
                  <span className="text-xs font-bold text-[#dde2f6] block">
                    Season 1 Active
                  </span>
                  <span className="text-[10px] text-[#94a3b8] mt-0.5 block">
                    Play matches to enter the leaderboard
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 5: ARCADE TRUST BADGES */}
          <section className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] text-center flex flex-col items-center gap-1">
              <Zap size={16} className="text-[#f3b72c]" />
              <span className="text-[10px] font-bold font-mono text-[#dde2f6]">Instant</span>
              <span className="text-[9px] text-[#94a3b8] leading-tight">Fast Payouts</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] text-center flex flex-col items-center gap-1">
              <ShieldCheck size={16} className="text-[#68f5b8]" />
              <span className="text-[10px] font-bold font-mono text-[#dde2f6]">Safe Pots</span>
              <span className="text-[9px] text-[#94a3b8] leading-tight">Secure Play</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] text-center flex flex-col items-center gap-1">
              <Sparkles size={16} className="text-[#00d2ff]" />
              <span className="text-[10px] font-bold font-mono text-[#dde2f6]">Fair Play</span>
              <span className="text-[9px] text-[#94a3b8] leading-tight">100% Random</span>
            </div>
          </section>
        </main>

        {/* ========================================================================= */}
        {/* FIXED BOTTOM NAVIGATION                                                   */}
        {/* ========================================================================= */}
        <MobileBottomNav activeMatchesCount={totalActiveMatches} />

        {/* ========================================================================= */}
        {/* MODAL BOTTOM SHEET 1: WAGER CONFIRMATION SHEET                            */}
        {/* ========================================================================= */}
        {isWagerSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-[#080e1c]/80 backdrop-blur-sm"
              onClick={() => setIsWagerSheetOpen(false)}
            />
            {/* Sheet Container */}
            <div className="relative w-full max-w-md bg-[#242a39] rounded-t-3xl p-5 shadow-2xl z-10 border-t border-[#333948] animate-in slide-in-from-bottom duration-200">
              {/* Handle */}
              <div className="w-12 h-1 bg-[#4f4534] rounded-full mx-auto mb-4" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#ffd78d] uppercase font-mono font-bold tracking-wider">
                    Match Entry
                  </span>
                  <h3 className="text-base font-bold text-[#dde2f6]">
                    {sheetGameTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setIsWagerSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#2f3544] flex items-center justify-center text-[#94a3b8] active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stake Summary Card */}
              <div className="bg-[#080e1c] p-3.5 rounded-xl mb-4 flex flex-col gap-2 border border-[#2f3544]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Your Entry</span>
                  <span className="text-[#ffd78d] font-mono font-bold">
                    {formatNim(sheetStake)} NIM
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Balance</span>
                  <span className="text-[#dde2f6] font-mono">
                    {balanceNim != null ? formatNim(balanceNim) : "0"} NIM
                  </span>
                </div>
                <div className="h-px bg-[#2f3544] my-0.5" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Total Match Pot</span>
                  <span className="text-[#a5e7ff] font-mono font-bold">
                    {formatNim(sheetStake * 2)} NIM
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#68f5b8] font-semibold">Winner Takes (90%)</span>
                  <span className="text-[#68f5b8] font-mono font-bold">
                    +{formatNim(sheetStake * 2 * 0.9)} NIM
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmWagerAndLaunch}
                  className="w-full h-12 bg-[#f3b72c] hover:bg-[#ffc107] text-[#412d00] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.4)] active:scale-98 transition-all"
                >
                  <Play size={16} className="fill-current" />
                  <span>Start Match</span>
                </button>
                <button
                  onClick={() => setIsWagerSheetOpen(false)}
                  className="w-full h-10 bg-transparent text-[#94a3b8] hover:text-[#dde2f6] text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL BOTTOM SHEET 2: WALLET PREVIEW SHEET                                */}
        {/* ========================================================================= */}
        {isWalletSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="absolute inset-0 bg-[#080e1c]/80 backdrop-blur-sm"
              onClick={() => setIsWalletSheetOpen(false)}
            />
            <div className="relative w-full max-w-md bg-[#242a39] rounded-t-3xl p-5 shadow-2xl z-10 border-t border-[#333948] animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1 bg-[#4f4534] rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]" />
                  <h3 className="text-base font-bold text-[#dde2f6]">Nimiq Safe Vault</h3>
                </div>
                <button
                  onClick={() => setIsWalletSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#2f3544] flex items-center justify-center text-[#94a3b8] active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Address Box */}
              <div className="p-3.5 rounded-xl bg-[#080e1c] border border-[#2f3544] flex items-center justify-between mb-3">
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                    Active Address (Testnet)
                  </span>
                  <span className="text-xs text-[#dde2f6] font-mono mt-0.5 truncate">
                    {address || "NQ07 ..."}
                  </span>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg bg-[#2f3544] text-[#a5e7ff] active:scale-90 transition-transform"
                  title="Copy Address"
                >
                  {copiedAddress ? <Check size={16} className="text-[#22c55e]" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Balance Card */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">Available</span>
                  <p className="text-base text-[#ffd78d] font-mono font-bold mt-0.5">
                    {balanceNim != null ? formatNim(balanceNim) : "0"}{" "}
                    <span className="text-xs">NIM</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">Status</span>
                  <p className="text-xs text-[#68f5b8] font-mono font-bold mt-1">
                    Ready to Play
                  </p>
                </div>
              </div>

              {/* 1-Click Faucet Quick Action */}
              <button
                onClick={handleRequestDrip}
                disabled={isDripping}
                className="w-full mb-3 h-10 bg-[#1e293b] hover:bg-[#334155] border border-[#38bdf8]/30 rounded-xl text-xs font-bold text-[#38bdf8] flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <RotateCw size={14} className={isDripping ? "animate-spin" : ""} />
                <span>{isDripping ? "Dripping 50 NIM…" : "Get 50 Free Testnet NIM (1-Click)"}</span>
              </button>

              <button
                onClick={() => setIsWalletSheetOpen(false)}
                className="w-full h-11 bg-[#2f3544] hover:bg-[#3b4356] text-[#dde2f6] rounded-xl text-xs font-bold active:scale-98 transition-all"
              >
                Close Vault
              </button>
            </div>
          </div>
        )}

        {/* Existing Functional Modals */}
        <LudoEntryFlowModal
          isOpen={isLudoFlowOpen}
          onClose={() => setIsLudoFlowOpen(false)}
          defaultStake={sheetStake}
          gameSlug={quickPlayGame}
        />
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          connectedAddress={address}
          connectionMode={connectionMode}
          onConnected={async (addr, mode) => {
            setAddress(addr);
            setConnectionMode(mode);
            void refreshBalance();
            try {
              const challengeRes = await utils.client.auth.requestChallenge.query();
              const loginRes = await loginWithNimiq.mutateAsync({
                address: addr,
                challenge: challengeRes.challenge,
              });
              if (loginRes?.token) {
                sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
                localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
              }
              await utils.auth.me.invalidate();
              toast.success("Signed in with Nimiq Wallet", {
                description: `Session bound to ${addr.slice(0, 8)}...`,
              });
            } catch (e) {
              console.warn("[Auth] Failed to sync session with wallet:", e);
            }
          }}
          onDisconnected={async () => {
            setAddress(null);
            setConnectionMode("none");
            try {
              await logoutMutation.mutateAsync();
              void utils.auth.me.invalidate();
              toast.info("Wallet Disconnected", {
                description: "Returned to guest session.",
              });
            } catch (e) {
              console.warn("[Auth] Logout error:", e);
            }
          }}
        />
        <IdentityRegistrationModal
          isOpen={isIdentityModalOpen}
          onClose={() => setIsIdentityModalOpen(false)}
          currentName={user?.name}
          currentAvatar={(user as any)?.avatar}
          walletAddress={address || (user as any)?.walletAddress}
        />
      </div>
    </div>
  );
}
