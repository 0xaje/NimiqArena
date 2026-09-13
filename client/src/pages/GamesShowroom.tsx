import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { formatNim } from "@shared/game/pot-distribution";
import { toast } from "sonner";
import {
  Wallet,
  Users,
  Play,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Zap,
  Dice5,
  Bell,
  Check,
  Layers,
  Swords,
  ChevronRight,
  X,
  Copy,
  RotateCw,
  Mail,
  Sparkles,
} from "lucide-react";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { ProvablyFairModal } from "@/components/game/ProvablyFairModal";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

type GameCategory = "all" | "board" | "duels" | "multiplayer" | "tournaments";

export default function GamesShowroom() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const {
    address,
    balanceNim,
    isConnected,
    refreshBalance,
    setAddress,
  } = useNimiqWallet();

  const activeMatchesQuery = trpc.match.listActiveMatches.useQuery(
    { limit: 5 },
    { refetchInterval: 5000 }
  );

  const [activeCategory, setActiveCategory] = useState<GameCategory>("all");
  const [isLudoFlowOpen, setIsLudoFlowOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isFairPlayOpen, setIsFairPlayOpen] = useState(false);
  const [notifyModalGame, setNotifyModalGame] = useState<{ id: string; title: string; genre: string } | null>(null);
  const [notifyContact, setNotifyContact] = useState("");
  const [notifiedGames, setNotifiedGames] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nimiq_arena_notified_games");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });
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

  const handleOpenNotify = (gameId: string, title: string, genre: string) => {
    if (notifiedGames[gameId]) {
      setNotifiedGames(prev => {
        const updated = { ...prev, [gameId]: false };
        try {
          localStorage.setItem("nimiq_arena_notified_games", JSON.stringify(updated));
        } catch {}
        toast.info(`Unsubscribed from ${title} alerts.`);
        return updated;
      });
    } else {
      setNotifyModalGame({ id: gameId, title, genre });
    }
  };

  const handleConfirmNotify = () => {
    if (!notifyModalGame) return;
    const { id: gameId, title: gameTitle } = notifyModalGame;
    setNotifiedGames(prev => {
      const updated = { ...prev, [gameId]: true };
      try {
        localStorage.setItem("nimiq_arena_notified_games", JSON.stringify(updated));
        if (notifyContact.trim()) {
          const contacts = JSON.parse(localStorage.getItem("nimiq_arena_notify_contacts") || "{}");
          contacts[gameId] = notifyContact.trim();
          localStorage.setItem("nimiq_arena_notify_contacts", JSON.stringify(contacts));
        }
      } catch {}
      return updated;
    });
    toast.success(`Subscribed to ${gameTitle}!`, {
      description: "You're registered for Season 2 Alpha playtest access + 250 Bonus PTS.",
    });
    setNotifyModalGame(null);
    setNotifyContact("");
  };

  const activeMatches = activeMatchesQuery.data || [];
  const activeCount = activeMatches.length;

  const categories: { id: GameCategory; label: string }[] = [
    { id: "all", label: "All Games" },
    { id: "board", label: "Board Classics" },
    { id: "duels", label: "1v1 Duels" },
    { id: "multiplayer", label: "Multiplayer" },
    { id: "tournaments", label: "Tournaments" },
  ];

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
        <header className="fixed top-0 max-w-md w-full z-40 bg-[#0d1321]/90 backdrop-blur-xl border-b border-[#242a39]/60 shadow-[0_1px_12px_rgba(0,0,0,0.4)] pt-safe">
          <div className="h-16 px-4 flex items-center justify-between">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5">
              <NimiqArenaLogo size={32} />
              <div className="flex flex-col">
                <span className="font-extrabold text-[#ffffff] text-base tracking-tight leading-none">
                  NIMIQ ARENA
                </span>
                <span className="text-[10px] text-[#f3b72c] uppercase tracking-wider font-mono mt-0.5 font-semibold">
                  Games Showroom
                </span>
              </div>
            </div>

            {/* Right: Wallet Balance Pill */}
            <button
              onClick={() => {
                if (isConnected) {
                  setIsWalletSheetOpen(true);
                } else {
                  setIsWalletModalOpen(true);
                }
              }}
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
        </header>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE SHOWROOM CONTENT                                          */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full pt-20 pb-28">
          
          {/* Title & Subtitle Header */}
          <div className="px-4 pt-2 pb-2 flex flex-col gap-1">
            <h1 className="text-2xl font-black text-[#ffffff] tracking-tight">
              Games
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Explore competitive wager titles and casual board battles
            </p>
          </div>

          {/* Horizontal Scrollable Category Filter Chips */}
          <div className="w-full overflow-x-auto no-scrollbar py-2 pl-4 pr-3">
            <div className="flex items-center gap-2 w-max">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`h-9 px-4 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    activeCategory === cat.id
                      ? "bg-[#f3b72c] text-[#412d00] shadow-[0_2px_10px_rgba(243,183,44,0.3)]"
                      : "bg-[#242a39] text-[#94a3b8] hover:text-[#dde2f6] border border-[#2f3544]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* SPOTLIGHT HERO BANNER: LUDO ARENA */}
          {(activeCategory === "all" || activeCategory === "board" || activeCategory === "multiplayer") && (
            <div className="px-4 pt-2 pb-4">
              <div className="relative overflow-hidden rounded-2xl bg-[#151b29] border border-[#2f3544] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)]">
                {/* Media Header */}
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    className="w-full h-full object-cover transform scale-105"
                    alt="Ludo Arena Holographic Neon Board"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKw_LrL3t4ftiAnJt4c6dgdj1JKatecMOtF-UBtGg8vh_Wg45PX2TcC9fm1wDpRMpiNkUHGYjTevtTsDpBPBke91ZGY9CDwnmfndsd8k2Alo5Cyl_BwIVqX4w1J40ooHIsq9XD317l9XSecJQspw8MQdRvS0kWSUgFOkbK-CzBeTu-OKZ-Nq_X0N0Lkpy5N9-M0AATJtwlvpnl1AuU-3j2B3A_xiohO0laGAqOkysoigHozTxKXXibZw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151b29] via-[#151b29]/40 to-transparent" />
                  
                  {/* Live Tag Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md border border-[#2f3544]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
                    <span className="text-[10px] text-[#ffdea4] uppercase font-mono font-bold tracking-wider">
                      Featured Showdown • 2–4 Players
                    </span>
                  </div>
                </div>

                {/* Spotlight Body Content */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-[#dde2f6]">Ludo Arena</h2>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#46d89d]/15 text-[#68f5b8]">
                        <Zap size={13} />
                        <span className="text-[10px] font-mono font-bold uppercase">
                          Instant Payout
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#94a3b8]">
                      Tactical race board game. Roll dice, block opponents, and capture glory.
                    </p>
                  </div>

                  {/* Metric Badges Row */}
                  <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-[#242a39]/60 border border-[#2f3544]">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Avg Match</span>
                      <span className="text-xs text-[#dde2f6] font-bold mt-0.5 font-mono">~6 mins</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Pool Stakes</span>
                      <span className="text-xs text-[#ffd78d] font-bold mt-0.5 font-mono">10–500 NIM</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Active Hubs</span>
                      <span className="text-xs text-[#00d2ff] font-bold mt-0.5 font-mono">
                        {activeCount > 0 ? `${activeCount} Live` : "Open Hub"}
                      </span>
                    </div>
                  </div>

                  {/* Action CTAs */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setIsLudoFlowOpen(true)}
                      className="flex-1 h-12 rounded-xl bg-[#f3b72c] hover:bg-[#ffc107] text-[#412d00] text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] active:scale-[0.98] transition-transform"
                    >
                      <span>Play Now</span>
                      <ArrowRight size={16} />
                    </button>
                    <Link
                      href="/games/ludo-league"
                      className="h-12 px-4 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-bold flex items-center justify-center gap-1.5 border border-[#333948] active:scale-[0.98] transition-transform"
                    >
                      <BookOpen size={15} className="text-[#94a3b8]" />
                      <span>Lobby</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Header: All Titles */}
          <div className="px-4 pt-1 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#dde2f6]">All Titles</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#242a39] text-[10px] font-mono text-[#94a3b8]">
                4
              </span>
            </div>
            <span className="text-[10px] text-[#94a3b8] uppercase font-mono tracking-wider">
              Sorted by Popularity
            </span>
          </div>

          {/* Rich Game Cards Stream */}
          <div className="px-4 flex flex-col gap-3 pb-6">
            
            {/* Card 1: Connect 4 Arena */}
            {(activeCategory === "all" || activeCategory === "duels") && (
              <div className="rounded-2xl bg-[#151b29] border border-[#2f3544] overflow-hidden shadow-lg flex flex-col">
                <div className="relative h-44 w-full overflow-hidden bg-[#080e1c]">
                  <img
                    alt="Nexus Grid Connect 4 Arena"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxRwQEGxOWIBqUVAn5cR2pxF2ZV8-xl1yV2O5TZF3LHoazc6kS41O15mQjVFeBNKFjxB0ErjWTpruI0kZj6BtjER2-glyHfLi6_Ri5gg9UPz4HNbnUCbThtaIY6tivyemqYk4OrXn5VZuvNC3jFZB1Jfo6m05etPCY8plaHCvJUBVo03P-5lgPF1nzEERUzVRaPkxTLGem9sDoSLHhEl7D1cuUaZpPnk5qivDgVdkuGQEvuDMVPTuarA"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151b29] via-[#151b29]/30 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md text-[10px] text-[#00d2ff] font-bold uppercase font-mono">
                      1v1 Duel
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md text-[10px] text-[#ffd78d] font-bold uppercase font-mono">
                      Fast Paced
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md flex items-center gap-1 text-[10px] text-[#dde2f6]">
                    <Users size={12} className="text-[#a5e7ff]" />
                    <span>2 Players</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-[#dde2f6]">Connect NIM Arena</h3>
                    <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
                      Vertical 4-in-a-row alignment showdown. Drop kinetic tokens and outsmart your rival in rapid turns.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Entry Stake</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[10px] text-[#94a3b8]">From</span>
                        <span className="text-xs text-[#ffd78d] font-bold font-mono">10 NIM</span>
                      </div>
                    </div>

                    <Link
                      href="/games/connect-four"
                      className="h-10 px-4 rounded-xl bg-[#f3b72c] text-[#412d00] text-xs font-bold flex items-center gap-1.5 shadow-[0_2px_12px_rgba(243,183,44,0.3)] active:scale-95 transition-transform"
                    >
                      <span>Play 1v1</span>
                      <Play size={13} fill="currentColor" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Ludo Classic Room */}
            {(activeCategory === "all" || activeCategory === "board" || activeCategory === "multiplayer") && (
              <div className="rounded-2xl bg-[#151b29] border border-[#2f3544] p-4 flex flex-col gap-3 shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-xl bg-[#2f3544] flex items-center justify-center p-2.5 text-[#ffd78d] shadow-inner">
                      <Dice5 size={26} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#dde2f6]">Ludo Classic</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#2f3544] text-[9px] text-[#94a3b8] uppercase font-mono font-bold">
                          Board
                        </span>
                      </div>
                      <span className="text-[10px] text-[#a5e7ff] font-mono">
                        Casual • 2–4 Players
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  The timeless 4-token race with friendly or wagered room options. Quick dice rolls and instant vault payouts.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#94a3b8] uppercase font-mono">Stake Size</span>
                    <span className="text-xs text-[#ffd78d] font-bold font-mono mt-0.5">From 10 NIM</span>
                  </div>

                  <Link
                    href="/games/ludo-league"
                    className="h-10 px-4 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <span>Lobby View</span>
                    <ArrowRight size={14} className="text-[#ffd78d]" />
                  </Link>
                </div>
              </div>
            )}

            {/* Card 3: Nexus Tactics (Hex Chess) - In Labs */}
            {(activeCategory === "all" || activeCategory === "tournaments" || activeCategory === "duels") && (
              <div className="rounded-2xl bg-[#151b29]/80 border border-[#2f3544] overflow-hidden shadow-lg flex flex-col">
                <div className="relative h-40 w-full overflow-hidden bg-[#080e1c]">
                  <img
                    alt="Nexus Tactics Hex Chess"
                    className="w-full h-full object-cover opacity-80"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKBH6Tv-cIk7zS9qBT48-YCAW4RbOSaI9bF5wRUDxB2zc4oMkdRbyBOBj9Lc_rukBPtvMxkwN-AEiPwe9UfDFIr6mgXb8unEYKoBIJtKt3tJHDvS6XaM6eaxDKZ0-GdP78-RrX5Rp4IQHo1zAZQAj7BlDh3xw-T8qVndhIRbNYrDE9YdVrbYFAzXAemtroWDvOPnTiO2_-2oOSqzQph1cfMcGdpUwa1lQIyWikoHcg7iz6jRmIznEIVg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151b29] via-[#151b29]/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md text-[10px] text-[#a5e7ff] font-bold uppercase font-mono">
                      Tactical Chess
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#f3b72c]/20 text-[10px] text-[#ffd78d] font-bold uppercase font-mono">
                      Season 2
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-[#080e1c]/85 backdrop-blur-md flex items-center gap-1 text-[10px] text-[#dde2f6]">
                    <Users size={12} className="text-[#a5e7ff]" />
                    <span>2 Players</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-[#dde2f6]">Nexus Tactics</h3>
                    <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
                      Futuristic hexagonal chess. Deploy EMP-Knights, command custom pieces, and capture the enemy king.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[#94a3b8] font-mono">In Development</span>
                    <button
                      onClick={() => handleOpenNotify("nexus-tactics", "Nexus Tactics", "Tactical Chess")}
                      className="h-10 px-4 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
                      {notifiedGames["nexus-tactics"] ? (
                        <>
                          <Check size={14} className="text-[#68f5b8]" />
                          <span className="text-[#68f5b8]">Subscribed</span>
                        </>
                      ) : (
                        <>
                          <Bell size={14} className="text-[#94a3b8]" />
                          <span>Notify Me</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card 4: Dominoes Clash (Coming Soon in Labs) */}
            <div className="rounded-2xl bg-[#151b29]/60 border border-[#2f3544]/80 p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-xl bg-[#242a39] flex items-center justify-center p-2.5 text-[#94a3b8]">
                    <Layers size={24} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#dde2f6]">Dominoes Clash</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#46d89d]/15 text-[9px] text-[#68f5b8] uppercase font-mono font-bold">
                        In Labs
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      Draw & Block • 1v1 Battles
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-[#242a39] text-[9px] text-[#94a3b8] uppercase font-mono">
                  Preview
                </span>
              </div>

              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Draw and block dominoes with direct instant-payout wagers. Community playtests open soon for active tier holders.
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#94a3b8] font-mono">Season 2 Preview</span>
                <button
                  onClick={() => handleOpenNotify("dominoes", "Dominoes Clash", "Draw & Block")}
                  className="h-10 px-4 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  {notifiedGames["dominoes"] ? (
                    <>
                      <Check size={14} className="text-[#68f5b8]" />
                      <span className="text-[#68f5b8]">Subscribed</span>
                    </>
                  ) : (
                    <>
                      <Bell size={14} className="text-[#94a3b8]" />
                      <span>Notify Me</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* FAIR PLAY & ON-CHAIN GUARANTEE BANNER */}
          <div className="px-4 pb-4">
            <div
              onClick={() => setIsFairPlayOpen(true)}
              className="p-4 rounded-2xl bg-[#151b29] border border-[#2f3544] flex items-start gap-3 shadow-md cursor-pointer active:scale-[0.99] transition-all hover:border-[#f3b72c]/40"
            >
              <div className="w-10 h-10 rounded-xl bg-[#242a39] flex items-center justify-center shrink-0 text-[#ffd78d]">
                <ShieldCheck size={22} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#dde2f6] flex items-center gap-1">
                  Fair Play & On-Chain Guarantee
                  <ChevronRight size={13} className="text-[#94a3b8]" />
                </span>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  All matches are verifiably fair via cryptographic SHA-256 state commits and settled directly into your Nimiq Pay wallet.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* FIXED BOTTOM NAVIGATION                                                   */}
        {/* ========================================================================= */}
        <MobileBottomNav activeMatchesCount={activeMatches.length} />

        {/* ========================================================================= */}
        {/* MODAL BOTTOM SHEET: WALLET PREVIEW SHEET                                  */}
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
        />
        <WalletConnectModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          connectedAddress={address}
          connectionMode={typeof window !== "undefined" ? (localStorage.getItem("nimiq_wallet_mode") as any || "none") : "none"}
          onConnected={(addr) => {
            setAddress(addr);
            void refreshBalance();
          }}
          onDisconnected={() => {
            setAddress(null);
          }}
        />
        <ProvablyFairModal
          isOpen={isFairPlayOpen}
          onClose={() => setIsFairPlayOpen(false)}
          matchId="overview"
          stateVersion={1}
          dice={[6, 4]}
        />

        {/* SEASON 2 LAUNCH ALERT MODAL */}
        {notifyModalGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-[#080e1c]/85 backdrop-blur-sm"
              onClick={() => setNotifyModalGame(null)}
            />
            <div className="relative w-full max-w-sm bg-[#1a2130] border border-[#2f3544] rounded-2xl p-5 shadow-2xl z-10 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#f3b72c]/15 border border-[#f3b72c]/30 flex items-center justify-center text-[#f3b72c]">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Season 2 Alpha Pass</h3>
                    <span className="text-[10px] text-[#f3b72c] font-mono uppercase">{notifyModalGame.title}</span>
                  </div>
                </div>
                <button
                  onClick={() => setNotifyModalGame(null)}
                  className="w-7 h-7 rounded-full bg-[#242a39] flex items-center justify-center text-[#94a3b8] hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1321] border border-[#242a39] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#94a3b8] font-mono">EARLY ACCESS PERK</span>
                  <span className="text-[10px] text-[#10b981] font-mono font-bold">+250 PTS REWARD</span>
                </div>
                <p className="text-xs text-[#dde2f6] leading-relaxed">
                  Be the first to battle in <strong className="text-white">{notifyModalGame.title}</strong> ({notifyModalGame.genre}). We'll ping your notification center or email when community playtests open.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-[#94a3b8] uppercase">
                  Email or Telegram (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={notifyContact}
                    onChange={e => setNotifyContact(e.target.value)}
                    placeholder="you@domain.com or @handle"
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-[#0d1321] border border-[#2f3544] text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#f3b72c]"
                  />
                  <Mail size={14} className="absolute right-3 top-3 text-[#64748b]" />
                </div>
                <span className="text-[9px] text-[#64748b]">
                  {address ? `Will link with your connected Nimiq wallet (${address.slice(0, 8)}...)` : "Leave blank to register on this device"}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setNotifyModalGame(null)}
                  className="flex-1 h-10 rounded-xl bg-[#242a39] hover:bg-[#2c3345] text-xs font-semibold text-[#94a3b8]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmNotify}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#f3b72c] to-[#e5a00d] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-[#f3b72c]/20 hover:brightness-110 active:scale-98"
                >
                  <Sparkles size={14} />
                  <span>Notify Me</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
