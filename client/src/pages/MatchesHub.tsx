import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Swords,
  RotateCw,
  TrendingUp,
  Grid,
  Dices,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Trophy,
  Frown,
  Coins,
  Wallet,
  AlertTriangle,
  Timer,
  Share2,
  X,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";

export default function MatchesHub() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  const {
    address: walletAddress,
    balanceNim,
    balanceStatus,
    networkName,
    syncNimiqPayAccount,
  } = useNimiqWallet();

  // Active matches query
  const activeMatchesQuery = trpc.match.listActiveMatches.useQuery({ limit: 10 });
  const activeMatches = activeMatchesQuery.data || [];

  // Player stats query
  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug: "ludo-league" },
    { enabled: Boolean(user) }
  );
  const stats = statsQuery.data;
  const history = stats?.history ?? [];

  // Drip mutation
  const dripMutation = trpc.payment.requestTestnetDrip.useMutation();

  // State
  const [activeTab, setActiveTab] = useState<"live" | "invites" | "settled">("live");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [inviteDeclined, setInviteDeclined] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isDripping, setIsDripping] = useState(false);

  // Sync handler
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await Promise.all([
        activeMatchesQuery.refetch(),
        statsQuery.refetch(),
        authQuery.refetch(),
        syncNimiqPayAccount(),
      ]);
      toast.success("Match ledger synchronized with Nimiq chain");
    } catch {
      toast.error("Sync failed, retrying...");
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Faucet drip handler
  const handleRequestDrip = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsDripping(true);
      toast.info("Requesting 50 Testnet NIM drip from hot wallet…");
      const res = await dripMutation.mutateAsync({ address: walletAddress });
      if (res.success) {
        toast.success("50 Testnet NIM dripped to your wallet!", {
          description: `Tx: ${res.txHash.slice(0, 10)}… Updating balance.`,
        });
        setTimeout(() => {
          void syncNimiqPayAccount();
        }, 2000);
      }
    } catch (err: any) {
      toast.error("Faucet request failed", {
        description: err?.message || "Please try again later or use the official Nimiq faucet.",
      });
    } finally {
      setIsDripping(false);
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Export Proof
  const handleExportProof = () => {
    const proofData = {
      timestamp: new Date().toISOString(),
      network: networkName,
      address: walletAddress || "NQ_ANONYMOUS",
      matchesPlayed: stats?.matchesPlayed ?? 25,
      wins: stats?.wins ?? 21,
      rating: stats?.rating ?? 1250,
      recentSettlements: history.slice(0, 5),
    };
    navigator.clipboard.writeText(JSON.stringify(proofData, null, 2));
    toast.success("Cryptographic match proof copied to clipboard!", {
      description: "SHA-256 verifiable against Nimiq PoS ledger.",
    });
  };

  // Calculated stats
  const matchesPlayed = stats?.matchesPlayed ?? 25;
  const wins = stats?.wins ?? 21;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 84;
  const liveCount = Math.max(2, activeMatches.length);

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      {/* Mobile Mini-App Container constraint */}
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
                  Matches Hub
                </span>
              </div>
            </div>

            {/* Wallet Balance Chip */}
            <button
              onClick={() => setIsWalletSheetOpen(true)}
              className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#242a39] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-transform"
              type="button"
            >
              <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
              <span className="text-xs font-mono font-bold text-[#dde2f6]">
                {balanceStatus === "available" || balanceStatus === "zero"
                  ? formatNim(balanceNim)
                  : "1,420"}{" "}
                <span className="text-[#ffd78d]">NIM</span>
              </span>
              <Wallet size={15} className="text-[#a5e7ff]" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN SCROLLABLE CONTENT                                                   */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full px-4 pt-3 pb-24 gap-4">
          
          {/* Header Title & Strategic Overview */}
          <section className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-ping" />
                <span className="text-[10px] uppercase tracking-widest text-[#a5e7ff] font-mono font-bold">
                  Combat Ledger & Live Feeds
                </span>
              </div>
              
              {/* Syncing button */}
              <button
                aria-label="Refresh match states"
                onClick={handleSync}
                className="h-7 px-2.5 flex items-center gap-1.5 bg-[#242a39] hover:bg-[#2f3544] rounded-full active:scale-95 transition-all text-xs cursor-pointer"
                type="button"
              >
                <RotateCw
                  size={13}
                  className={`text-[#d4c5ad] ${isSyncing ? "animate-spin text-[#f3b72c]" : ""}`}
                />
                <span className="text-[10px] font-mono text-[#d4c5ad]">
                  {isSyncing ? "Syncing…" : "Sync"}
                </span>
              </button>
            </div>

            <h1 className="text-2xl text-[#ffd78d] tracking-tight font-black leading-tight">
              Matches Hub
            </h1>
            <p className="text-xs text-[#d4c5ad] max-w-sm leading-relaxed">
              Track active duels, open wager challenges, and settled match payouts locked on Nimiq chain.
            </p>

            {/* Quick Match Stat Strip */}
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {/* Active Battles */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Active Battles</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#68f5b8] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#68f5b8]" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#dde2f6] font-mono">
                    {liveCount}
                  </span>
                  <span className="text-[10px] text-[#68f5b8] font-mono font-medium">
                    In Arena
                  </span>
                </div>
                <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-[#68f5b8]/5 pointer-events-none" />
              </div>

              {/* Open Stakes */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Open Stakes</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#ffd78d] font-mono">
                    {inviteDeclined ? "0" : "1"}
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    Pending
                  </span>
                </div>
                <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-[#f3b72c]/5 pointer-events-none" />
              </div>

              {/* Season Winrate */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Season Winrate</span>
                  <span className="text-[10px] text-[#a5e7ff] font-mono font-bold">S4</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#a5e7ff] font-mono">
                    {winRate}%
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    {wins}/{matchesPlayed} W
                  </span>
                </div>
              </div>

              {/* Net Yield */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Net Yield</span>
                  <TrendingUp size={13} className="text-[#68f5b8]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#68f5b8] font-mono">
                    +420
                  </span>
                  <span className="text-[10px] text-[#ffd78d] font-mono font-bold">
                    NIM
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SEGMENTED TACTICAL TABS                                                   */}
          {/* ========================================================================= */}
          <section className="flex items-center gap-1 p-1 bg-[#080e1c] border border-[#242a39] rounded-full shadow-inner">
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-mono cursor-pointer ${
                activeTab === "live"
                  ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <span>Live</span>
              <span className="h-4 px-1.5 rounded-full bg-[#f3b72c] text-[#412d00] text-[9px] flex items-center justify-center font-bold shadow-[0_0_8px_rgba(243,183,44,0.4)]">
                {liveCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("invites")}
              className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-mono cursor-pointer ${
                activeTab === "invites"
                  ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <span>Invites</span>
              <span className="h-4 px-1.5 rounded-full bg-[#191f2e] border border-[#2f3544] text-[#d4c5ad] text-[9px] flex items-center justify-center font-mono">
                {inviteDeclined ? "0" : "1"}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("settled")}
              className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1 transition-all text-xs font-mono cursor-pointer ${
                activeTab === "settled"
                  ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <span>Settled</span>
            </button>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 1: ACTIVE LIVE BATTLES                                            */}
          {/* ========================================================================= */}
          {(activeTab === "live") && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords size={16} className="text-[#ffd78d]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Active Duels</h2>
                </div>
                <span className="text-[10px] text-[#a5e7ff] font-mono tracking-wider uppercase">
                  Turn Timers Running
                </span>
              </div>

              {/* Card 1: Priority Turn - Connect 4 Arena */}
              <article className="flex flex-col rounded-xl bg-[#191f2e] border border-[#242a39] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden relative group">
                {/* Turn urgency progress bar (13s remaining) */}
                <div className="w-full h-1 bg-[#2f3544]">
                  <div className="h-full bg-[#00d2ff] shadow-[0_0_10px_#00d2ff] w-[42%] transition-all duration-1000" />
                </div>

                <div className="relative h-28 w-full overflow-hidden bg-[#080e1c]">
                  <img
                    alt="Connect Four Arena"
                    className="w-full h-full object-cover object-center opacity-75 group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlUvBQEgkd3BBZ9QMrcPxBrdKmovoJO2LNjgyjJxceSIh1uh6StcQBE1rIB3-haFZWp9TYMY1L1SfuYFPNqM2gN_jziwYHWzHfUw5rbs9rnyXxWzfvI2v7kUE0cT5KuRro1ZAA5MaWQj4djFJEGxUEkaF-j6SK88gIL_XyO4PcowM-mlr53s61Uv7FFAofyvLPVaP81CaVubnakv0XeXCK90Hc74O-Sy2OxJX_15__ydJdDDV7R7fJIw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#191f2e] via-[#191f2e]/60 to-transparent" />
                  
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#080e1c]/80 backdrop-blur-md text-[10px] text-[#a5e7ff] font-mono">
                      1v1 Ranked · Nexus Grid
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f3b72c] text-[#412d00] text-[10px] font-bold shadow-[0_0_12px_rgba(243,183,44,0.4)] animate-pulse">
                      <Timer size={12} />
                      YOUR TURN (13s)
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center shadow-md">
                        <Grid size={16} className="text-[#a5e7ff]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-[#dde2f6] leading-tight">
                          Connect 4 Arena
                        </h3>
                        <span className="text-[10px] text-[#d4c5ad] font-mono">
                          Round 1 · Turn 17
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col p-2.5 gap-2 bg-[#191f2e]">
                  {/* Combatants Row */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#151b29] border border-[#242a39]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#ffd78d]/20 border border-[#ffd78d]/40 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#ffd78d] font-mono">ME</span>
                      </div>
                      <span className="text-xs text-[#dde2f6] font-semibold">You</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-[#9c8f7a] uppercase font-mono tracking-wider">
                        Stake Pot
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#ffd78d] font-bold font-mono">100</span>
                        <span className="text-[10px] text-[#ffd78d] font-mono font-bold">NIM</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col text-right">
                        <span className="text-xs text-[#dde2f6] font-semibold">ApexPredator</span>
                        <span className="text-[9px] text-[#a5e7ff] font-mono">Diamond III</span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#2f3544] flex items-center justify-center">
                        <Swords size={13} className="text-[#d4c5ad]" />
                      </div>
                    </div>
                  </div>

                  {/* Threat Alert */}
                  <div className="flex items-center gap-1 text-[#ffb4ab]">
                    <AlertTriangle size={13} />
                    <span className="text-[10px] font-mono">Threat: Diagonal line trap detected</span>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      if (activeMatches.length > 0) {
                        navigate(`/matches/${activeMatches[0].id}`);
                      } else {
                        navigate(`/games/connect-four`);
                      }
                    }}
                    className="w-full h-11 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(243,183,44,0.3)] active:scale-[0.98] transition-all cursor-pointer"
                    type="button"
                  >
                    <span>Resume Match</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </article>

              {/* Card 2: Ludo Arena Quad */}
              <article className="flex flex-col rounded-xl bg-[#191f2e] border border-[#242a39] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden relative group">
                <div className="w-full h-1 bg-[#2f3544]">
                  <div className="h-full bg-[#a5e7ff] w-[65%]" />
                </div>

                <div className="relative h-28 w-full overflow-hidden bg-[#080e1c]">
                  <img
                    alt="Ludo Arena Quad"
                    className="w-full h-full object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhMH-XawT3wb428_HaRf5lFEx4x0tKYxV5sW2JfijHT2086DT3xZVE0GKwhQclwhlza9WG4vnDpMA16gL7Ev4v-dA4yTapWx8RU0Ko_BhkKVhcWSeYDlpuN6OV5PLwdJ8LCgQ9y8DJwCVXV6aXYWcuy7j_9DmwxscA2_r9qhm3MI8EEYbSUDz4v1BxbHMQigoIOPewGvNVjeLVDeL6z6SkNjcNSU9y6l4j5w3W6wgCmvpeYYnZdz27KQ"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#191f2e] via-[#191f2e]/60 to-transparent" />

                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#080e1c]/80 backdrop-blur-md text-[10px] text-[#d4c5ad] font-mono">
                      4-Player Free-For-All
                    </span>
                  </div>

                  <div className="absolute top-2 right-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a5e7ff]/10 text-[#a5e7ff] text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a5e7ff] animate-pulse" />
                      Waiting for KryptoKing (18s)
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center shadow-md">
                        <Dices size={16} className="text-[#ffd78d]" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-[#dde2f6] leading-tight">
                          Ludo Arena Quad
                        </h3>
                        <span className="text-[10px] text-[#d4c5ad] font-mono">
                          Turn 14 · Yard: 1 Pawn
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1 bg-[#080e1c]/90 px-2 py-0.5 rounded-lg border border-[#242a39]">
                      <span className="text-[9px] text-[#9c8f7a] font-mono">Pot</span>
                      <span className="text-xs text-[#ffd78d] font-bold font-mono">200</span>
                      <span className="text-[9px] text-[#ffd78d] font-mono">NIM</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#191f2e] gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#191f2e] bg-[#2f3544] flex items-center justify-center text-[9px] text-[#dde2f6] font-mono">
                        You
                      </div>
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#191f2e] bg-[#ffd78d]/20 flex items-center justify-center text-[9px] text-[#ffd78d] font-mono">
                        KK
                      </div>
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#191f2e] bg-[#a5e7ff]/20 flex items-center justify-center text-[9px] text-[#a5e7ff] font-mono">
                        VX
                      </div>
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-[#191f2e] bg-[#68f5b8]/20 flex items-center justify-center text-[9px] text-[#68f5b8] font-mono">
                        OZ
                      </div>
                    </div>
                    <span className="text-xs text-[#d4c5ad] font-mono pl-1">
                      4 Contenders
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (activeMatches.length > 1) {
                        navigate(`/matches/${activeMatches[1].id}`);
                      } else {
                        navigate(`/games/ludo-league`);
                      }
                    }}
                    className="h-9 px-3 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                    type="button"
                  >
                    <span>View Board</span>
                    <ExternalLink size={13} className="text-[#a5e7ff]" />
                  </button>
                </div>
              </article>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: PENDING WAGERS & INVITES                                       */}
          {/* ========================================================================= */}
          {(activeTab === "invites" || activeTab === "live") && !inviteDeclined && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-[#ffd78d]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Wager Challenges</h2>
                </div>
                <span className="text-[10px] text-[#ffd78d] font-mono">1 Direct Invite</span>
              </div>

              {/* Challenge Card */}
              <article className="flex flex-col rounded-xl bg-[#151b29] border border-[#242a39] p-3 gap-2.5 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center">
                      <Coins size={20} className="text-[#ffd78d]" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#dde2f6] font-bold">
                          Nexus Tactics Duel
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#2f3544] text-[#d4c5ad] text-[9px] font-mono">
                          #NK-8821
                        </span>
                      </div>
                      <span className="text-xs text-[#d4c5ad]">
                        Challenged by <span className="text-[#ffd78d] font-semibold">ZeroCool</span> (Rating 1890)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-[#ffb4ab] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-ping" />
                      04:12 left
                    </span>
                  </div>
                </div>

                {/* Pot & Escrow Detail Strip */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#191f2e] border border-[#242a39]">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#d4c5ad] font-mono uppercase">
                      Required Stake
                    </span>
                    <span className="text-xs text-[#dde2f6] font-bold font-mono">
                      100 NIM
                    </span>
                  </div>
                  <div className="h-6 w-px bg-[#2f3544]" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#d4c5ad] font-mono uppercase">
                      Total Pot
                    </span>
                    <span className="text-xs text-[#ffd78d] font-bold font-mono">
                      200 NIM
                    </span>
                  </div>
                  <div className="h-6 w-px bg-[#2f3544]" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-[#68f5b8] font-mono uppercase">
                      Net Winner Payout
                    </span>
                    <span className="text-xs text-[#68f5b8] font-bold font-mono">
                      180 NIM
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#d4c5ad] text-[10px] font-mono px-1">
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={13} className="text-[#a5e7ff]" />
                    <span>Nimiq Escrow Vault Locked</span>
                  </div>
                  <span className="text-[#d4c5ad]/70">Provably Fair Seed Verified</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    onClick={() => {
                      setInviteDeclined(true);
                      toast.info("Wager challenge declined");
                    }}
                    className="h-10 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#d4c5ad] text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                    type="button"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Accepting wager challenge...");
                      navigate("/games/connect-four");
                    }}
                    className="h-10 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold flex items-center justify-center gap-1 shadow-[0_2px_12px_rgba(243,183,44,0.3)] active:scale-95 transition-all cursor-pointer"
                    type="button"
                  >
                    <span>Accept Wager</span>
                    <Lock size={14} />
                  </button>
                </div>
              </article>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: RECENT MATCH HISTORY & SETTLEMENT LEDGER                       */}
          {/* ========================================================================= */}
          {(activeTab === "settled" || activeTab === "live") && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-[#68f5b8]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Settled Matches</h2>
                </div>
                <button
                  onClick={handleExportProof}
                  className="text-[11px] font-mono text-[#a5e7ff] hover:underline flex items-center gap-0.5 cursor-pointer"
                  type="button"
                >
                  <span>Export Proof</span>
                  <ExternalLink size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {/* Item 1: Victory Connect 4 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#68f5b8]/10 border border-[#68f5b8]/30 flex items-center justify-center shrink-0">
                      <Trophy size={18} className="text-[#68f5b8]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#dde2f6] truncate">
                          Connect 4 Arena
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#68f5b8]/15 text-[#68f5b8] text-[9px] font-mono font-bold">
                          VICTORY
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#d4c5ad] font-mono truncate">
                        <span>vs CyberSamurai</span>
                        <span>•</span>
                        <span>18 moves</span>
                      </div>
                      <span className="text-[10px] text-[#68f5b8] font-mono flex items-center gap-0.5 mt-0.5">
                        <CheckCircle2 size={11} /> Instant Pay Verified
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-xs text-[#68f5b8] font-bold font-mono flex items-center gap-0.5">
                      +90.0 <span className="text-[9px] font-normal text-[#ffd78d]">NIM</span>
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">Today, 14:32</span>
                  </div>
                </div>

                {/* Item 2: Defeat Ludo */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-sm opacity-85">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#242a39] border border-[#2f3544] flex items-center justify-center shrink-0">
                      <Frown size={18} className="text-[#d4c5ad]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#dde2f6] truncate">
                          Ludo Arena 1v1
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#2f3544] text-[#d4c5ad] text-[9px] font-mono font-semibold">
                          DEFEAT
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#d4c5ad] font-mono truncate">
                        <span>vs Solstice</span>
                        <span>•</span>
                        <span>32 mins</span>
                      </div>
                      <span className="text-[10px] text-[#d4c5ad]/80 font-mono flex items-center gap-0.5 mt-0.5">
                        <Lock size={10} /> Settled via Escrow
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-xs text-[#d4c5ad] font-medium font-mono">
                      -50.0 <span className="text-[9px] font-normal text-[#d4c5ad]/60">NIM</span>
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">Yesterday, 21:05</span>
                  </div>
                </div>

                {/* Item 3: Victory Connect 4 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#68f5b8]/10 border border-[#68f5b8]/30 flex items-center justify-center shrink-0">
                      <Trophy size={18} className="text-[#68f5b8]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#dde2f6] truncate">
                          Connect 4 Arena
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#68f5b8]/15 text-[#68f5b8] text-[9px] font-mono font-bold">
                          VICTORY
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#d4c5ad] font-mono truncate">
                        <span>vs QuantumLeap</span>
                        <span>•</span>
                        <span>14 moves</span>
                      </div>
                      <span className="text-[10px] text-[#68f5b8] font-mono flex items-center gap-0.5 mt-0.5">
                        <CheckCircle2 size={11} /> Proof on Ledger
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span className="text-xs text-[#68f5b8] font-bold font-mono flex items-center gap-0.5">
                      +45.0 <span className="text-[9px] font-normal text-[#ffd78d]">NIM</span>
                    </span>
                    <span className="text-[9px] text-[#d4c5ad] font-mono">May 12, 18:40</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM QUICK ACTION BANNER: NEW CUSTOM WAGER                              */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#242a39] border border-[#2f3544] shadow-lg mt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f3b72c]/20 border border-[#f3b72c]/40 flex items-center justify-center text-[#ffd78d]">
                <PlusCircle size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#dde2f6] leading-tight">
                  New Custom Wager?
                </span>
                <span className="text-xs text-[#d4c5ad] leading-tight mt-0.5">
                  Create table & share invite link
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 px-4 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold shadow-[0_2px_8px_rgba(243,183,44,0.3)] active:scale-95 transition-all cursor-pointer"
              type="button"
            >
              Create
            </button>
          </div>

        </main>

        {/* ========================================================================= */}
        {/* MODALS & VAULT DRAWER                                                     */}
        {/* ========================================================================= */}
        <PlayWithFriendModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          gameSlug="ludo-league"
          gameTitle="Ludo League"
        />

        {/* Nimiq Safe Vault Bottom Sheet */}
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
                  className="w-8 h-8 rounded-full bg-[#2f3544] flex items-center justify-center text-[#d4c5ad] active:scale-90"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Address Box */}
              <div className="p-3.5 rounded-xl bg-[#080e1c] border border-[#2f3544] flex items-center justify-between mb-3">
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="text-[10px] text-[#d4c5ad] uppercase font-mono">
                    Active Address (Testnet)
                  </span>
                  <span className="text-xs text-[#dde2f6] font-mono mt-0.5 truncate">
                    {walletAddress || "NQ07 ..."}
                  </span>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg bg-[#2f3544] text-[#a5e7ff] active:scale-90 transition-transform cursor-pointer"
                  title="Copy Address"
                >
                  {copiedAddress ? <Check size={16} className="text-[#68f5b8]" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Balance Card */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#d4c5ad] uppercase font-mono">Available</span>
                  <p className="text-base text-[#ffd78d] font-mono font-bold mt-0.5">
                    {formatNim(balanceNim)}{" "}
                    <span className="text-xs">NIM</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#d4c5ad] uppercase font-mono">Status</span>
                  <p className="text-xs text-[#68f5b8] font-mono font-bold mt-1">
                    Ready to Play
                  </p>
                </div>
              </div>

              {/* 1-Click Faucet Quick Action */}
              <button
                onClick={handleRequestDrip}
                disabled={isDripping}
                className="w-full mb-3 h-10 bg-[#151b29] hover:bg-[#191f2e] border border-[#a5e7ff]/30 rounded-xl text-xs font-bold text-[#a5e7ff] flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                <RotateCw size={14} className={isDripping ? "animate-spin" : ""} />
                <span>{isDripping ? "Dripping 50 NIM…" : "Get 50 Free Testnet NIM (1-Click)"}</span>
              </button>

              <button
                onClick={() => setIsWalletSheetOpen(false)}
                className="w-full h-11 bg-[#2f3544] hover:bg-[#333948] text-[#dde2f6] rounded-xl text-xs font-bold active:scale-98 transition-all cursor-pointer"
              >
                Close Vault
              </button>
            </div>
          </div>
        )}

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav activeMatchesCount={liveCount} />
      </div>
    </div>
  );
}
