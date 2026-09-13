import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ChevronLeft,
  Copy,
  Check,
  Dices,
  Grid,
  KeyRound,
  PlusCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Coins,
  Wallet,
  ArrowRight,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { formatNim } from "@shared/game/pot-distribution";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

export default function JoinMatch() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createWageredMatch = trpc.match.createWageredMatch.useMutation();
  const join = trpc.match.joinByCode.useMutation();

  const {
    address,
    balanceNim,
    balanceStatus,
    isConnected,
  } = useNimiqWallet();

  const { nimToUsd, formatUsd } = useNimiqPrice();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [matchMode, setMatchMode] = useState<"free" | "wager">("free");
  const [selectedStake, setSelectedStake] = useState<number>(10);
  const [selectedGame, setSelectedGame] = useState<"ludo-league" | "connect-four">("connect-four");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
    isWagered?: boolean;
    stakeNim?: number;
  } | null>(null);

  const matchStatusQuery = trpc.match.getById.useQuery(
    { id: createdMatch?.id || "" },
    {
      enabled: Boolean(createdMatch?.id),
      refetchInterval: 1200,
    }
  );

  useEffect(() => {
    if (createdMatch && matchStatusQuery.data) {
      if (matchStatusQuery.data.status === "in_progress") {
        toast.success("Opponent joined the table!", {
          description: "Entering game arena now…",
        });
        navigate(`/matches/${createdMatch.id}`);
      }
    }
  }, [createdMatch, matchStatusQuery.data, navigate]);

  const user = authQuery.data;

  // Auto-fill from URL query param if present (?code=ABC123XYZ)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get("code") || params.get("joinCode");
      const isAutoJoin = params.get("autoJoin") === "true";
      if (codeFromUrl) {
        const clean = codeFromUrl.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
        setJoinCode(clean);
        setActiveTab("join");

        if (isAutoJoin) {
          toast.info("Dual-play assistant: Joining as Player 2…");
          void (async () => {
            try {
              const loginRes = await guestLogin.mutateAsync({
                name: "Player 2 (Judge Tester)",
                newIdentity: true,
              });
              if (loginRes.token) {
                sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
              }
              await utils.auth.me.invalidate();
              const result = await join.mutateAsync({ joinCode: clean });
              toast.success("Joined match as Player 2!", {
                description: "Entering arena table now…",
              });
              navigate(`/matches/${result.id}`);
            } catch (err) {
              toast.error("Auto-join failed", {
                description: err instanceof Error ? err.message : "Please join manually.",
              });
            }
          })();
        } else {
          toast.info("Invite code detected from link", { description: `Code: ${clean}` });
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  async function ensureSession() {
    if (!user) {
      toast.info("Initializing guest session…");
      const loginRes = await guestLogin.mutateAsync({
        name: "Player 1 (Host)",
      });
      if (loginRes.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
        localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
      }
      await utils.auth.me.invalidate();
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await ensureSession();

      if (matchMode === "wager") {
        toast.info(`Setting up ${selectedStake} NIM Wager Table…`);
        const res = await createWageredMatch.mutateAsync({
          gameSlug: selectedGame,
          stakeNim: selectedStake,
        });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: true,
          stakeNim: selectedStake,
        });
        toast.success("Wagered Room Created!", {
          description: `Share code ${res.joinCode} with your opponent.`,
        });
      } else {
        toast.info("Generating Private Invite Table…");
        const res = await createChallenge.mutateAsync({
          gameSlug: selectedGame,
        });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: false,
        });
        toast.success("Private Room Ready!", {
          description: `Share code ${res.joinCode} with your friend.`,
        });
      }
    } catch (err) {
      toast.error("Room creation failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      toast.error("Please enter a valid table invite code");
      return;
    }

    try {
      setIsSubmitting(true);
      await ensureSession();
      toast.info(`Connecting to Table #${cleanCode}…`);
      const result = await join.mutateAsync({ joinCode: cleanCode });
      toast.success("Joined match table!", {
        description: "Entering duel arena now…",
      });
      navigate(`/matches/${result.id}`);
    } catch (err) {
      toast.error("Could not join table", {
        description: err instanceof Error ? err.message : "Verify code and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const copyCode = async () => {
    if (!createdMatch) return;
    await navigator.clipboard.writeText(createdMatch.joinCode);
    setCopied(true);
    toast.success("Invite code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!createdMatch) return;
    const url = `${window.location.origin}/join?code=${createdMatch.joinCode}`;
    await navigator.clipboard.writeText(url);
    toast.success("Direct match link copied!");
  };

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans relative selection:bg-[#f3b72c]/30 selection:text-[#ffd78d]">
      {/* MOBILE MINI-APP CONSTRAINT CONTAINER */}
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] relative shadow-2xl overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* FIXED APP HEADER                                                          */}
        {/* ========================================================================= */}
        <header className="sticky top-0 inset-x-0 z-40 bg-[#0d1321]/90 backdrop-blur-xl border-b border-[#242a39] pt-safe shadow-sm">
          <div className="h-16 px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <NimiqArenaLogo size={32} />
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#ffd78d] tracking-tight leading-none">
                  NIMIQ ARENA
                </span>
                <span className="text-[10px] text-[#f3b72c] uppercase tracking-wider font-mono font-semibold">
                  Custom Matchroom
                </span>
              </div>
            </Link>

            {/* Wallet Balance Pill */}
            <div className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#242a39] rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#f3b72c]" />
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
        {/* MAIN SCROLLABLE CONTENT AREA                                              */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full px-4 pt-3 pb-24 gap-4">
          {/* Sub-Header: Back Nav */}
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/games"
              className="flex items-center gap-1 text-[#d4c5ad] hover:text-[#dde2f6] transition-colors py-1 group cursor-pointer"
            >
              <ChevronLeft
                size={20}
                className="transition-transform group-active:-translate-x-1"
              />
              <span className="text-sm font-semibold">Games</span>
            </Link>

            <span className="text-[10px] text-[#68f5b8] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#68f5b8]/10 border border-[#68f5b8]/20">
              P2P Micro-Escrow
            </span>
          </div>

          {/* Title Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-[#dde2f6] tracking-tight">
              Direct Multiplayer
            </h1>
            <p className="text-xs text-[#d4c5ad] leading-relaxed">
              Create a custom match table and share your 6-digit invite code, or enter an invite code to join immediately.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#151b29] border border-[#242a39]">
            <button
              onClick={() => setActiveTab("create")}
              className={`py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-[#f3b72c] text-[#412d00] shadow-sm"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <PlusCircle size={15} />
              <span>Create Table</span>
            </button>
            <button
              onClick={() => setActiveTab("join")}
              className={`py-2 rounded-lg text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "join"
                  ? "bg-[#f3b72c] text-[#412d00] shadow-sm"
                  : "text-[#d4c5ad] hover:text-[#dde2f6]"
              }`}
              type="button"
            >
              <KeyRound size={15} />
              <span>Enter Code</span>
            </button>
          </div>

          {/* TAB 1: CREATE TABLE */}
          {activeTab === "create" && (
            <div className="flex flex-col gap-4">
              {!createdMatch ? (
                <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                  {/* Select Game */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono font-bold">
                      Select Arena Game
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGame("connect-four")}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          selectedGame === "connect-four"
                            ? "bg-[#242a39] border-[#f3b72c] shadow-[0_0_12px_rgba(243,183,44,0.2)]"
                            : "bg-[#151b29] border-[#242a39] text-[#d4c5ad] hover:bg-[#191f2e]"
                        }`}
                      >
                        <Grid size={24} className={selectedGame === "connect-four" ? "text-[#ffd78d]" : "text-[#d4c5ad]"} />
                        <span className="text-xs font-bold text-[#dde2f6]">Nim Connect</span>
                        <span className="text-[10px] text-[#a5e7ff] font-mono">7×6 Grid Duel</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedGame("ludo-league")}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          selectedGame === "ludo-league"
                            ? "bg-[#242a39] border-[#f3b72c] shadow-[0_0_12px_rgba(243,183,44,0.2)]"
                            : "bg-[#151b29] border-[#242a39] text-[#d4c5ad] hover:bg-[#191f2e]"
                        }`}
                      >
                        <Dices size={24} className={selectedGame === "ludo-league" ? "text-[#ffd78d]" : "text-[#d4c5ad]"} />
                        <span className="text-xs font-bold text-[#dde2f6]">Ludo League</span>
                        <span className="text-[10px] text-[#ffd78d] font-mono">Pawn Race</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode: Free vs Wager */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono font-bold">
                      Match Stakes
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMatchMode("free")}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          matchMode === "free"
                            ? "bg-[#242a39] border-[#68f5b8] text-[#68f5b8]"
                            : "bg-[#151b29] border-[#242a39] text-[#d4c5ad]"
                        }`}
                      >
                        <span className="text-xs font-bold">Friendly Practice</span>
                        <span className="text-[10px] font-mono">0 NIM · Free</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMatchMode("wager")}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          matchMode === "wager"
                            ? "bg-[#242a39] border-[#f3b72c] text-[#ffd78d]"
                            : "bg-[#151b29] border-[#242a39] text-[#d4c5ad]"
                        }`}
                      >
                        <span className="text-xs font-bold">Wagered Duel</span>
                        <span className="text-[10px] font-mono">Instant Payout</span>
                      </button>
                    </div>
                  </div>

                  {/* Stake Selector if Wagered */}
                  {matchMode === "wager" && (
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#151b29] border border-[#242a39]">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-[#d4c5ad]">Select Stake</span>
                        <span className="text-[#ffd78d] font-bold">≈ {formatUsd(nimToUsd(selectedStake))} USD</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[10, 25, 50, 100].map((stake) => (
                          <button
                            key={stake}
                            type="button"
                            onClick={() => setSelectedStake(stake)}
                            className={`py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                              selectedStake === stake
                                ? "bg-[#f3b72c] text-[#412d00]"
                                : "bg-[#242a39] text-[#dde2f6]"
                            }`}
                          >
                            {stake} NIM
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(243,183,44,0.3)] active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <RotateCw size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    <span>Generate Private Match Room</span>
                  </button>
                </form>
              ) : (
                /* Created Match Display Card */
                <div className="rounded-2xl bg-[#151b29] border border-[#242a39] p-5 flex flex-col items-center text-center gap-3.5 shadow-xl">
                  <div className="w-12 h-12 rounded-full bg-[#68f5b8]/15 border border-[#68f5b8]/30 flex items-center justify-center text-[#68f5b8]">
                    <Sparkles size={24} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono text-[#68f5b8] font-bold">
                      ROOM GENERATED ON-CHAIN
                    </span>
                    <h3 className="text-lg font-black text-[#dde2f6]">
                      Share Invite Code
                    </h3>
                  </div>

                  {/* Giant 6-digit Code Box */}
                  <div className="w-full py-4 rounded-xl bg-[#080e1c] border-2 border-[#f3b72c]/50 flex items-center justify-center gap-2 shadow-inner">
                    <span className="text-3xl font-black font-mono tracking-widest text-[#ffd78d]">
                      {createdMatch.joinCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button
                      type="button"
                      onClick={copyCode}
                      className="h-10 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                    >
                      {copied ? <Check size={14} className="text-[#68f5b8]" /> : <Copy size={14} />}
                      <span>{copied ? "Copied" : "Copy Code"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={copyLink}
                      className="h-10 rounded-xl bg-[#242a39] hover:bg-[#2f3544] text-[#dde2f6] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Share2 size={14} />
                      <span>Share Link</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#a5e7ff] font-mono pt-1">
                    <RotateCw size={14} className="animate-spin text-[#f3b72c]" />
                    <span>Waiting for opponent to connect…</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/matches/${createdMatch.id}`)}
                    className="w-full h-11 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
                  >
                    <span>Enter Table Directly</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENTER CODE */}
          {activeTab === "join" && (
            <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[#151b29] border border-[#242a39] p-5 flex flex-col gap-3.5 shadow-md">
                <span className="text-xs font-mono text-[#d4c5ad] font-bold uppercase">
                  Table Invite Code
                </span>

                <div className="relative">
                  <input
                    type="text"
                    maxLength={12}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ENTER 6-DIGIT CODE"
                    className="w-full h-14 bg-[#080e1c] border-2 border-[#242a39] focus:border-[#f3b72c] rounded-xl px-4 text-center font-mono text-xl font-bold tracking-widest text-[#ffd78d] placeholder:text-[#d4c5ad]/30 placeholder:tracking-normal outline-none transition-colors"
                  />
                </div>

                <p className="text-[11px] text-[#d4c5ad] leading-relaxed">
                  Enter the code provided by your peer or tournament administrator. Tables resolve instantaneously on the Nimiq network.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting || joinCode.trim().length < 4}
                  className="w-full h-12 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(243,183,44,0.3)] active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <RotateCw size={16} className="animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  <span>Join Table Arena</span>
                </button>
              </div>
            </form>
          )}
        </main>

        {/* PERSISTENT BOTTOM NAVIGATION */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
