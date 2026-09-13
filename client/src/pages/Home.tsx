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
import { useNimiqPrice } from "@/lib/nimiq-price";

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
    if (priceUsd && priceUsd > 0) {
      const rawNim = usd / priceUsd;
      if (rawNim >= 1000) {
        return Math.round(rawNim / 100) * 100;
      }
      return Math.max(10, Math.round(rawNim));
    }
    return usd * 2500;
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

  const activeMatches = activeMatchesQuery.data || [];
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
        <main className="flex-1 flex flex-col w-full pt-20 pb-28 px-4">
          
          {/* SECTION 1: NIMIQ ARENA PLATFORM HERO */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#f3b72c]" />
                <span className="text-[11px] uppercase tracking-widest text-[#ffd78d] font-bold font-mono">
                  Web3 Gaming Arcade
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#151b29] border border-[#242a39]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] animate-pulse" />
                <span className="text-[10px] text-[#68f5b8] font-mono font-bold">ALBATROSS PoS</span>
              </div>
            </div>

            {/* Apple Arcade / Console Style Flagship Launcher Card */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#1c2333] via-[#151b29] to-[#0d1321] border border-[#f3b72c]/30 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col">
              {/* Media Container with Cyber Gradients */}
              <div className="relative w-full h-64 overflow-hidden bg-[#0a0f1d]">
                <img
                  className="w-full h-full object-cover scale-105 transition-transform duration-700 hover:scale-110 opacity-75"
                  alt="Nimiq Arena Cyber Web3 Arcade Showcase"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZuABU9HEKvn6QmmNqTQOLN6DIHNcLlY0_SIt8Re7OVzHRmSfe2ft_9dd3Jid8RymZzUctXUhwjSXK-4usymr5Q_7oZ_ZbkSJqMi3kJIwdhoMstQnHnVfebmBgdcCz_SOgnUvuledCRdzrNY7RR2pUas7XTTXd_JuINRku8ppQOUYgOgyS_qq4xHlx_wqlsHawKPH0iBka0pIkkSwbqNpBVT5G5aUyK0hWQD_Zu75BwH_nYUBhRlw8sQ"
                />
                {/* Scrim Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#151b29] via-[#151b29]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#080e1c]/80 via-transparent to-transparent" />

                {/* Floating Badges */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080e1c]/85 border border-[#2f3544] backdrop-blur-md shadow-md">
                    <Zap size={12} className="text-[#f3b72c]" />
                    <span className="text-[10px] text-[#dde2f6] font-mono font-semibold">Instant Escrow</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-[#f3b72c]/20 border border-[#f3b72c]/40 backdrop-blur-md">
                    <span className="text-[10px] text-[#ffd78d] font-mono font-bold tracking-wide">
                      90% WINNER POT
                    </span>
                  </div>
                </div>

                {/* Cover Details */}
                <div className="absolute bottom-3 inset-x-3 flex flex-col gap-1.5">
                  <div className="inline-flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full bg-[#242a39]/90 border border-[#3b4356] backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c]" />
                    <span className="text-[10px] text-[#ffdea4] uppercase tracking-wider font-mono font-semibold">
                      Non-Custodial Micro-Stakes
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-[#ffffff] tracking-tight flex items-center gap-2">
                    Nimiq Arena
                  </h1>
                  <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
                    The honest Web3 matchroom. Real-time multiplayer board games backed by cryptographic smart escrow and instant NIM payouts.
                  </p>
                </div>
              </div>

              {/* Card Action Deck */}
              <div className="p-3.5 bg-[#151b29] flex items-center justify-between gap-3 border-t border-[#242a39]">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                    Live Market Rate
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    <span className="text-xs text-[#ffd78d] font-bold font-mono">
                      1 NIM ≈ {formatUsd(priceUsd)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const el = document.getElementById("choose-your-game");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="h-11 px-5 flex items-center justify-center gap-2 bg-gradient-to-r from-[#f3b72c] to-[#e5a00d] hover:brightness-110 text-[#191f2e] rounded-xl text-xs font-black shadow-[0_4px_20px_-2px_rgba(243,183,44,0.4)] active:scale-95 transition-all"
                >
                  <span>CHOOSE A GAME</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2: CHOOSE YOUR GAME */}
          <section id="choose-your-game" className="mb-6 scroll-mt-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-[#dde2f6] tracking-tight">
                  Choose Your Game
                </h2>
                <span className="text-xs text-[#94a3b8]">Direct instant-wager titles</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Game Card 1: Ludo */}
              <div className="bg-[#191f2e] border border-[#2f3544] p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[#2f3544] flex-shrink-0 relative overflow-hidden flex items-center justify-center shadow-inner">
                    <img
                      className="w-full h-full object-cover"
                      alt="Ludo Token 3D"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkTvJ9uzBhh7kyzsasy-vXXornODY7DMCcSZaQPvNUhJ6ZYYUlx6gJ0gHP7DQf_xMi1StB3Iam-30FhREOTt9_uavfbrSVq_WRnzAwajTB4LcBxbxRJwoNlZ-1v1IqvTHruoGmc498cH6fR26VgMUWOm1wgUlQEpflPbqTpp7jcs1EtThpIqys8gj35Uytz9DsJJobs-2BBZvxf98xZZueXafL_AVVqel7cjIB4S9JbGTrSs4zmUBeCg"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#dde2f6] text-sm truncate">
                        Ludo Classic
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#2f3544] text-[#a5e7ff] text-[10px] font-bold font-mono">
                        2–4P
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
                      Classic tactical race board game
                    </p>
                  </div>
                </div>

                <Link
                  href="/games/ludo-league"
                  className="h-10 px-4 flex-shrink-0 bg-[#2f3544] hover:bg-[#3b4356] text-[#dde2f6] hover:text-[#ffd78d] rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span>Play</span>
                  <Play size={13} fill="currentColor" />
                </Link>
              </div>

              {/* Game Card 2: Connect 4 */}
              <div className="bg-[#191f2e] border border-[#2f3544] p-3 rounded-2xl shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-[#2f3544] flex-shrink-0 relative overflow-hidden flex items-center justify-center shadow-inner">
                    <img
                      className="w-full h-full object-cover"
                      alt="Connect 4 Grid 3D"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm8Od4RcOx9iRzCyQLZsYOjftOIctc0ZlwKjc8wf2W9DFfzeP_MaWj-vVqznduGf-PG-j-0MHVZabJtqdE26RDmJ8HEluuNsmnH_2QoPwiqb7NP47LiL3tHdg8f_PBW7Kddj6Wbv_N5j06DqJMbhfYMFyDyjTcCl2UbUoNanQHoHzAFwtbzo7T-Yu7Bl3TV4jBVDF5waShdneBu7WgDs-2o-FXSJSlXaNr56DBu2NjK_gkm_aoJBvHLg"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#dde2f6] text-sm truncate">
                        Connect NIM
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-[#2f3544] text-[#ffd78d] text-[10px] font-bold font-mono">
                        1v1
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
                      Vertical alignment showdown
                    </p>
                  </div>
                </div>

                <Link
                  href="/games/connect-four"
                  className="h-10 px-4 flex-shrink-0 bg-[#2f3544] hover:bg-[#3b4356] text-[#dde2f6] hover:text-[#ffd78d] rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span>Play</span>
                  <Play size={13} fill="currentColor" />
                </Link>
              </div>
            </div>
          </section>

          {/* SECTION 3: QUICK PLAY MATCHMAKER */}
          <section className="mb-6">
            <div className="p-4 rounded-2xl bg-[#151b29] border border-[#2f3544] shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#dde2f6]">Quick Play</span>
                  <span className="text-xs text-[#94a3b8]">Select game & stake to enter matchmaking</span>
                </div>
                <Zap size={20} className="text-[#f3b72c]" />
              </div>

              {/* Game Selector Toggle */}
              <div className="grid grid-cols-2 gap-2 mt-3 mb-2 p-1 rounded-xl bg-[#080e1c] border border-[#242a39]">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPlayGame("ludo-league");
                    setSheetGameTitle("Ludo Blitz");
                  }}
                  className={`h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold font-mono transition-all active:scale-95 ${
                    quickPlayGame === "ludo-league"
                      ? "bg-[#f3b72c] text-[#412d00] shadow-[0_0_12px_rgba(243,183,44,0.4)]"
                      : "text-[#d4c5ad] hover:text-[#dde2f6]"
                  }`}
                >
                  <span className="text-sm">🎲</span>
                  <span>Ludo Blitz</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPlayGame("connect-four");
                    setSheetGameTitle("Connect 4 NIM");
                  }}
                  className={`h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold font-mono transition-all active:scale-95 ${
                    quickPlayGame === "connect-four"
                      ? "bg-[#00d2ff] text-[#003543] shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                      : "text-[#d4c5ad] hover:text-[#dde2f6]"
                  }`}
                >
                  <span className="text-sm">🔴</span>
                  <span>Connect 4</span>
                </button>
              </div>

              {/* Stake Chips Selector (USD Denominations with live NIM conversion) */}
              <div className="grid grid-cols-4 gap-2 my-2.5">
                {USD_STAKES.map((usd) => {
                  const nimEquivalent = calculateNimFromUsd(usd);
                  const isSelected = selectedUsdStake === usd;
                  return (
                    <button
                      key={usd}
                      type="button"
                      onClick={() => {
                        setSelectedUsdStake(usd);
                        setSelectedStake(nimEquivalent);
                      }}
                      className={`h-13 py-1.5 rounded-xl flex flex-col items-center justify-center font-mono transition-all active:scale-95 ${
                        isSelected
                          ? "bg-[#f3b72c] text-[#412d00] font-bold shadow-[0_0_16px_rgba(243,183,44,0.35)]"
                          : "bg-[#191f2e] text-[#d4c5ad] border border-[#2f3544] hover:border-[#4f4534]"
                      }`}
                    >
                      <span className="text-sm font-black">${usd}</span>
                      <span
                        className={`text-[9px] font-semibold leading-none mt-0.5 ${
                          isSelected ? "text-[#412d00]/80" : "text-[#94a3b8]"
                        }`}
                      >
                        ~{formatNim(nimEquivalent)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Primary Action CTA */}
              <button
                onClick={() => {
                  const currentNim = calculateNimFromUsd(selectedUsdStake);
                  openWagerConfirmation(
                    quickPlayGame === "connect-four" ? "Connect 4 NIM" : "Ludo Blitz",
                    currentNim
                  );
                }}
                className="w-full h-12 rounded-xl bg-[#f3b72c] text-[#412d00] text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(243,183,44,0.3)] active:scale-98 transition-all"
              >
                <Play size={16} fill="currentColor" />
                <span>
                  Enter Matchmaking (${selectedUsdStake} · ~{formatNim(calculateNimFromUsd(selectedUsdStake))} NIM)
                </span>
              </button>
            </div>
          </section>

          {/* SECTION 4: LIVE NOW (Real Authoritative Directory) */}
          <section className="mb-6" id="live-matches">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#dde2f6] tracking-tight">
                  Live Now
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#00d2ff]/15 text-[#00d2ff] text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff] animate-pulse" />
                  <span>{activeMatches.length} ACTIVE</span>
                </span>
              </div>
              <Link href="/games/ludo-league" className="text-xs text-[#a5e7ff] hover:underline font-mono">
                See all
              </Link>
            </div>

            {activeMatches.length > 0 ? (
              <div className="flex flex-col gap-2">
                {activeMatches.map((match: any) => (
                  <div
                    key={match.id}
                    className="bg-[#191f2e] border border-[#2f3544] p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#dde2f6]">
                          {match.gameSlug === "ludo-league" ? "Ludo Arena" : "Connect NIM"}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-mono">
                          · v{match.stateVersion || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#94a3b8] truncate max-w-[140px]">
                          Table #{match.joinCode}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#4f4534]" />
                        <span className="text-xs text-[#ffd78d] font-mono font-bold">
                          {match.stakeNim ? `${match.stakeNim * 2} NIM POT` : "FREE PLAY"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/matches/${match.id}`}
                      className="h-9 px-3 flex-shrink-0 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#a5e7ff] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Eye size={13} />
                      <span>Watch</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#151b29] border border-[#2f3544] rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                <Swords size={28} className="text-[#94a3b8] mb-2 opacity-50" />
                <span className="text-xs font-bold text-[#dde2f6]">
                  No Active Public Tables
                </span>
                <span className="text-[11px] text-[#94a3b8] mt-1 max-w-[240px]">
                  Be the gladiator to open a table and challenge rivals for the prize pot!
                </span>
                <button
                  onClick={() => setIsLudoFlowOpen(true)}
                  className="mt-3 h-8 px-4 bg-[#242a39] hover:bg-[#2f3544] text-[#ffd78d] text-xs font-bold rounded-lg border border-[#f3b72c]/30"
                >
                  Create Match Table
                </button>
              </div>
            )}
          </section>

          {/* SECTION 5: TOP ARENA CHAMPIONS (Real Authoritative Ranks) */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-[#dde2f6] tracking-tight">
                  Top Arena Champions
                </h2>
                <span className="text-xs text-[#94a3b8]">Global competitive leaderboards</span>
              </div>
              <Link
                href="/leaderboard"
                className="text-xs text-[#ffd78d] hover:underline flex items-center gap-0.5 font-mono"
              >
                <span>Ranks</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            <div className="bg-[#151b29] border border-[#2f3544] rounded-2xl p-2 flex flex-col gap-1 shadow-lg">
              {topChampions.length > 0 ? (
                topChampions.map((player: any, idx: number) => (
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
                        <div className="w-9 h-9 rounded-full bg-[#2f3544] overflow-hidden flex items-center justify-center text-xs font-bold text-[#ffd78d]">
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
                <div className="p-4 text-center">
                  <Trophy size={24} className="text-[#ffd78d] mx-auto mb-1 opacity-60" />
                  <span className="text-xs font-bold text-[#dde2f6] block">
                    Season 02 Leaderboard Initializing
                  </span>
                  <span className="text-[11px] text-[#94a3b8] mt-0.5 block">
                    Compete in ranked matches to establish your glory!
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* QUICK ACCESS ACTION STRIP: WALLET & VAULT STATUS */}
          <section className="mb-4">
            <button
              onClick={() => {
                if (isConnected) {
                  setIsWalletSheetOpen(true);
                } else {
                  setIsWalletModalOpen(true);
                }
              }}
              className="w-full p-3.5 rounded-2xl bg-[#191f2e] border border-[#2f3544] flex items-center justify-between active:bg-[#242a39] transition-colors shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00d2ff]/10 flex items-center justify-center text-[#00d2ff]">
                  <Wallet size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                    {isConnected ? "Connected Nimiq Wallet" : "Connect Nimiq Wallet"}
                  </span>
                  <span className="text-xs text-[#dde2f6] font-mono font-semibold">
                    {shortAddress}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[#ffd78d]">
                <span className="text-xs font-mono font-bold">
                  {balanceNim != null ? formatNim(balanceNim) : "0"} NIM
                </span>
                <ChevronRight size={16} />
              </div>
            </button>
          </section>
        </main>

        {/* ========================================================================= */}
        {/* FIXED BOTTOM NAVIGATION                                                   */}
        {/* ========================================================================= */}
        <MobileBottomNav activeMatchesCount={activeMatches.length} />

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
                    Stake & Match
                  </span>
                  <h3 className="text-base font-bold text-[#dde2f6]">
                    Confirm Entry: {sheetGameTitle}
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
              <div className="bg-[#080e1c] p-3.5 rounded-xl mb-3 flex flex-col gap-2 border border-[#2f3544]">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Your Stake</span>
                  <span className="text-[#ffd78d] font-mono font-bold">
                    {sheetStake} NIM
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Available Balance</span>
                  <span className="text-[#dde2f6] font-mono">
                    {balanceNim != null ? formatNim(balanceNim) : "0"} NIM
                  </span>
                </div>
                <div className="h-px bg-[#2f3544] my-0.5" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Total Match Pot</span>
                  <span className="text-[#a5e7ff] font-mono font-bold">
                    {sheetStake * 2} NIM
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#68f5b8] font-semibold">1st Place Payout (90%)</span>
                  <span className="text-[#68f5b8] font-mono font-bold">
                    {(sheetStake * 2 * 0.9).toFixed(1)} NIM
                  </span>
                </div>
              </div>

              {/* Pot Distribution Breakdown */}
              <div className="p-2.5 rounded-xl bg-[#191f2e] mb-4 flex items-center justify-between text-[11px] text-[#94a3b8] border border-[#2f3544]">
                <span>Allocation:</span>
                <span className="text-[#dde2f6] font-mono font-semibold">
                  90% Winner · 5–7% Builder · 2% Referrer · 1% Charity
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmWagerAndLaunch}
                  className="w-full h-12 bg-[#f3b72c] hover:bg-[#ffc107] text-[#412d00] rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.4)] active:scale-98 transition-all"
                >
                  <Wallet size={16} />
                  <span>Deposit Escrow & Start Battle</span>
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
