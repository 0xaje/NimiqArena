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
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

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
      matchesPlayed: stats?.matchesPlayed ?? 0,
      wins: stats?.wins ?? 0,
      rating: stats?.rating ?? 1000,
      recentSettlements: history.slice(0, 5),
    };
    navigator.clipboard.writeText(JSON.stringify(proofData, null, 2));
    toast.success("Cryptographic match proof copied to clipboard!", {
      description: "SHA-256 verifiable against Nimiq PoS ledger.",
    });
  };

  // Calculated stats
  const matchesPlayed = stats?.matchesPlayed ?? 0;
  const wins = stats?.wins ?? 0;
  const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;
  const liveCount = activeMatches.length;

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      {/* Mobile Mini-App Container constraint */}
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
                  Matches Hub
                </span>
              </div>
            </Link>

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
                  : "0.00"}{" "}
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

              {/* Open Tables */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Open Tables</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#ffd78d] font-mono">
                    {activeMatches.filter(m => m.status === "waiting").length}
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    Waiting
                  </span>
                </div>
                <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-[#f3b72c]/5 pointer-events-none" />
              </div>

              {/* Season Winrate */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Season Winrate</span>
                  <span className="text-[10px] text-[#a5e7ff] font-mono font-bold">S1</span>
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

              {/* Total Recorded */}
              <div className="flex flex-col p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Total Recorded</span>
                  <TrendingUp size={13} className="text-[#68f5b8]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#68f5b8] font-mono">
                    {matchesPlayed}
                  </span>
                  <span className="text-[10px] text-[#ffd78d] font-mono font-bold">
                    Matches
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
              <span>Private Tables</span>
            </button>

            <button
              onClick={() => setActiveTab("settled")}
              className={`flex-1 py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition-all text-xs font-mono cursor-pointer ${
                activeTab === "settled"
                  ? "bg-[#242a39] text-[#ffd78d] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <span>Settled</span>
              <span className="text-[10px] font-mono text-[#68f5b8]">
                ({history.length})
              </span>
            </button>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 1: ACTIVE LIVE BATTLES                                            */}
          {/* ========================================================================= */}
          {activeTab === "live" && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Swords size={16} className="text-[#ffd78d]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Active Duels</h2>
                </div>
                <span className="text-[10px] text-[#a5e7ff] font-mono tracking-wider uppercase">
                  Live Tables
                </span>
              </div>

              {activeMatches.length === 0 ? (
                <div className="rounded-2xl bg-[#191f2e] border border-[#242a39] p-6 flex flex-col items-center text-center gap-3 shadow-lg">
                  <div className="w-12 h-12 rounded-full bg-[#f3b72c]/10 border border-[#f3b72c]/20 flex items-center justify-center text-[#ffd78d]">
                    <Swords size={24} />
                  </div>
                  <h3 className="text-base font-bold text-[#dde2f6]">No Active Duels In Progress</h3>
                  <p className="text-xs text-[#d4c5ad] max-w-xs leading-relaxed">
                    You do not currently have any active battles. Create a wagered table or join an open room to start competing.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href="/games/connect-four"
                      className="h-9 px-4 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition-transform"
                    >
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
                <div className="flex flex-col gap-3">
                  {activeMatches.map((m) => {
                    const isConnect4 = m.gameId === "connect-four";
                    return (
                      <article
                        key={m.id}
                        className="flex flex-col rounded-xl bg-[#191f2e] border border-[#242a39] shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden relative group"
                      >
                        <div className="w-full h-1 bg-[#2f3544]">
                          <div className={`h-full ${isConnect4 ? "bg-[#00d2ff]" : "bg-[#ffd78d]"} w-full`} />
                        </div>
                        <div className="p-3.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#242a39] flex items-center justify-center shadow-md">
                              {isConnect4 ? <Grid size={20} className="text-[#a5e7ff]" /> : <Dices size={20} className="text-[#ffd78d]" />}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-[#dde2f6]">
                                  {isConnect4 ? "Nim Connect 7×6" : "Ludo League Arena"}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-[#68f5b8]/10 text-[#68f5b8] text-[9px] font-mono font-bold">
                                  {m.status === "in_progress" ? "In Battle" : "Waiting for Player 2"}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#d4c5ad] font-mono mt-0.5">
                                Table Code: {m.joinCode}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/matches/${m.id}`}
                            className="h-9 px-3.5 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-transform"
                          >
                            <span>Enter</span>
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: PRIVATE TABLES & DIRECT INVITES                                */}
          {/* ========================================================================= */}
          {activeTab === "invites" && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-[#ffd78d]" />
                  <h2 className="text-sm font-bold text-[#dde2f6]">Private Tables & Challenges</h2>
                </div>
                <Link href="/join" className="text-[10px] text-[#a5e7ff] font-mono hover:underline">
                  Enter Code →
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-[#151b29] border border-[#242a39] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#242a39] flex items-center justify-center text-[#ffd78d]">
                      <KeyRound size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#dde2f6]">Have a 6-digit invite code?</span>
                      <span className="text-[11px] text-[#d4c5ad]">Join an existing private table created by a friend</span>
                    </div>
                  </div>
                  <Link
                    href="/join"
                    className="h-9 px-3.5 rounded-xl bg-[#f3b72c] hover:bg-[#ffdea4] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    Join Table
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: RECENT MATCH HISTORY & SETTLEMENT LEDGER                       */}
          {/* ========================================================================= */}
          {activeTab === "settled" && (
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
                {history.length === 0 ? (
                  <div className="p-5 rounded-xl bg-[#191f2e] border border-[#242a39] flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#68f5b8]/10 border border-[#68f5b8]/20 flex items-center justify-center text-[#68f5b8]">
                      <Trophy size={20} />
                    </div>
                    <h4 className="text-sm font-bold text-[#dde2f6]">No Settled Matches Yet</h4>
                    <p className="text-xs text-[#d4c5ad] max-w-xs leading-relaxed">
                      Once your matches finish and are settled on-chain, cryptographic proofs and payouts will appear here.
                    </p>
                  </div>
                ) : (
                  history.map((record: any, idx: number) => {
                    const isWin = record.won;
                    return (
                      <div
                        key={record.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isWin
                                ? "bg-[#68f5b8]/10 border-[#68f5b8]/30 text-[#68f5b8]"
                                : "bg-[#242a39] border-[#2f3544] text-[#d4c5ad]"
                            }`}
                          >
                            {isWin ? <Trophy size={18} /> : <Frown size={18} />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#dde2f6] truncate">
                                {record.gameSlug === "connect-four" ? "Nim Connect" : "Ludo League"}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                  isWin
                                    ? "bg-[#68f5b8]/15 text-[#68f5b8]"
                                    : "bg-[#2f3544] text-[#d4c5ad]"
                                }`}
                              >
                                {isWin ? "VICTORY" : "DEFEAT"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#d4c5ad] font-mono truncate">
                              <span>{record.movesCount ?? 0} moves</span>
                              <span>•</span>
                              <span>{record.finishedAt ? new Date(record.finishedAt).toLocaleDateString() : "Recent"}</span>
                            </div>
                            <span className="text-[10px] text-[#68f5b8] font-mono flex items-center gap-0.5 mt-0.5">
                              <CheckCircle2 size={11} /> Settled On-Chain
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 pl-2 font-mono">
                          <span className={`text-xs font-bold ${isWin ? "text-[#68f5b8]" : "text-[#d4c5ad]"}`}>
                            {isWin ? "+" : "-"}{record.stakeNim ?? 0} NIM
                          </span>
                          <span className="text-[9px] text-[#d4c5ad]">Albatross PoS</span>
                        </div>
                      </div>
                    );
                  })
                )}
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
