import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronDown,
  Swords,
  Users,
  Bot,
  Zap,
  ShieldCheck,
  Timer,
  Coins,
  Trophy,
  Grid,
  Play,
  ArrowRight,
  Wallet,
  Sparkles,
  RotateCw,
  Star,
  Gamepad2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { formatNim } from "@shared/game/pot-distribution";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { ConfirmEntrySheet } from "@/components/game/ConfirmEntrySheet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";

type GameMode = "match" | "friend" | "bot";

export default function Connect4Detail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "connect-four" });
  const activeMatchesQuery = trpc.match.listActiveMatches.useQuery(
    { limit: 10 },
    { refetchInterval: 5000 }
  );

  const {
    address,
    balanceNim,
    balanceStatus,
    isConnected,
    networkName,
    refreshBalance,
    setAddress,
  } = useNimiqWallet();

  const [connectionMode, setConnectionMode] = useState<any>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("nimiq_wallet_mode") || "none"
      : "none"
  );

  const { nimToUsd, formatUsd, priceUsd } = useNimiqPrice();

  const createChallenge = trpc.match.createChallenge.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const createHouseWagered = trpc.match.createHouseWageredMatch.useMutation();
  const requestDrip = trpc.payment.requestTestnetDrip.useMutation();

  // Screen UI State
  const [currentMode, setCurrentMode] = useState<GameMode>("match");
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [isRulesExpanded, setIsRulesExpanded] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isHouseBotWager, setIsHouseBotWager] = useState<boolean>(false);

  // Modals
  const [isConfirmEntryOpen, setIsConfirmEntryOpen] = useState(false);
  const [isPlayWithFriendOpen, setIsPlayWithFriendOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [isDripping, setIsDripping] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const user = authQuery.data;
  const activeMatches = (activeMatchesQuery.data || []).filter(
    (m) => m.gameId === "connect-four"
  );
  const activeCount = activeMatches.length;

  const totalPot = selectedStake * 2;
  const payoutPreview = (totalPot * 0.9).toFixed(1).replace(/\.0$/, "");

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

  async function ensureAuthenticated(defaultName: string) {
    if (user) return;
    const savedWallet = address || localStorage.getItem("nimiq_arena_wallet_address");
    let loginToken: string | null = null;
    if (savedWallet) {
      try {
        const challengeRes = await utils.client.auth.requestChallenge.query();
        const res = await loginWithNimiq.mutateAsync({
          address: savedWallet,
          challenge: challengeRes.challenge,
        });
        loginToken = res?.token || null;
      } catch (e) {
        console.warn("[Connect4Detail] Nimiq auto-login fallback to guest:", e);
      }
    }
    if (!loginToken) {
      toast.info("Signing in…");
      const loginRes = await guestLogin.mutateAsync({ name: defaultName });
      loginToken = loginRes?.token || null;
    }
    if (loginToken) {
      sessionStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
      localStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
    }
    await utils.auth.me.invalidate();
  }

  async function handlePrimaryAction() {
    if (currentMode === "friend") {
      setIsPlayWithFriendOpen(true);
      return;
    }

    if (currentMode === "bot") {
      if (isHouseBotWager) {
        try {
          setIsConnecting(true);
          await ensureAuthenticated("Player 1 (Gladiator)");
          toast.info(`Setting up ${selectedStake} NIM Match vs Tactical AI…`);
          const res = await createHouseWagered.mutateAsync({
            gameSlug: "connect-four",
            stakeNim: selectedStake,
          });
          navigate(`/matches/${res.id}`);
        } catch (err) {
          toast.error("Failed to create house bot match", {
            description: err instanceof Error ? err.message : "Try again.",
          });
        } finally {
          setIsConnecting(false);
        }
      } else {
        try {
          setIsConnecting(true);
          await ensureAuthenticated("Player 1 (Solo)");
          toast.info("Launching Practice Table vs Nim Connect Bot…");
          const match = await createSolo.mutateAsync({
            gameSlug: "connect-four",
          });
          navigate(`/matches/${match.id}`);
        } catch (err) {
          toast.error("Failed to launch solo practice", {
            description: err instanceof Error ? err.message : "Try again.",
          });
        } finally {
          setIsConnecting(false);
        }
      }
      return;
    }

    // Matchmaking Mode: Open Confirm Entry Sheet
    setIsConfirmEntryOpen(true);
  }

  async function handleConfirmMatchEntry() {
    try {
      setIsConnecting(true);
      await ensureAuthenticated("Player 1 (Gladiator)");

      if (isConnected && balanceNim != null && balanceNim < selectedStake) {
        toast.error(`Insufficient NIM Balance (${balanceNim} NIM available)`, {
          description: `You need at least ${selectedStake} NIM to enter. Use 1-Click Faucet in wallet.`,
        });
        setIsConnecting(false);
        return;
      }

      toast.info(`Searching live arena for ${selectedStake} NIM opponents…`);
      const res = await createWagered.mutateAsync({
        gameSlug: "connect-four",
        stakeNim: selectedStake,
      });

      setTimeout(() => {
        toast.success("Match Ready!", {
          description: `Entering Match Table #${res.id.slice(0, 8)}…`,
        });
        setIsConfirmEntryOpen(false);
        navigate(`/matches/${res.id}`);
      }, 700);
    } catch (err) {
      setIsConnecting(false);
      toast.error("Matchmaking error", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans relative selection:bg-[#f3b72c]/30 selection:text-[#ffd78d]">
      {/* MOBILE MINI-APP CONSTRAINT CONTAINER */}
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] relative shadow-2xl overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* FIXED APP HEADER                                                          */}
        {/* ========================================================================= */}
        <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
          <div className="max-w-md mx-auto w-full pointer-events-auto bg-[#0d1321]/85 backdrop-blur-xl border-b border-[#242a39]/80 shadow-[0_1px_12px_rgba(0,0,0,0.4)] pt-safe">
            <div className="h-16 px-4 flex items-center justify-between">
              
              {/* Left: Brand / Profile avatar */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <NimiqArenaLogo size={32} />
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#ffdea4] tracking-tight leading-none">
                    NIMIQ ARENA
                  </span>
                  <span className="text-[10px] text-[#f3b72c] uppercase tracking-wider font-mono mt-0.5 font-semibold">
                    Nim Connect 7×6
                  </span>
                </div>
              </Link>

              {/* Right: Wallet Balance Pill */}
              <button
                onClick={() => {
                  if (isConnected) {
                    setIsWalletSheetOpen(true);
                  } else {
                    setIsWalletModalOpen(true);
                  }
                }}
                className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#2f3544] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                type="button"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]"
                      : "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]"
                  }`}
                />
                <span className="text-xs font-semibold text-[#dde2f6] font-mono">
                  {balanceNim != null ? formatNim(balanceNim) : "0.00"}{" "}
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
        <main
          className={`flex-1 flex flex-col w-full pt-20 pb-28 space-y-4 transition-all duration-300 ${
            isConfirmEntryOpen ? "opacity-40 blur-[1px] pointer-events-none filter" : ""
          }`}
        >
          {/* Sub-Header: Back Nav & Quick Status */}
          <div className="flex items-center justify-between px-4 pt-1">
            <Link
              href="/games"
              className="flex items-center gap-1 text-[#d4c5ad] hover:text-[#dde2f6] transition-colors py-1 group cursor-pointer"
            >
              <ChevronLeft
                size={20}
                className="transition-transform group-active:-translate-x-1"
              />
              <span className="text-sm font-semibold">Games Showroom</span>
            </Link>

            <div className="flex items-center gap-1.5 bg-[#151b29] border border-[#242a39] px-3 py-1 rounded-full shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#b6ebff] font-mono">
                {activeCount > 0 ? `${activeCount} Battles Live` : "Arena Ready"}
              </span>
            </div>
          </div>

          {/* HERO VISUAL CARD */}
          <div className="px-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-[#080e1c] border border-[#242a39] shadow-xl">
              
              {/* Media Banner with Gradient Scrim */}
              <div className="relative w-full h-52 overflow-hidden">
                <img
                  alt="Nim Connect 7x6 Matrix Arena"
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlUvBQEgkd3BBZ9QMrcPxBrdKmovoJO2LNjgyjJxceSIh1uh6StcQBE1rIB3-haFZWp9TYMY1L1SfuYFPNqM2gN_jziwYHWzHfUw5rbs9rnyXxWzfvI2v7kUE0cT5KuRro1ZAA5MaWQj4djFJEGxUEkaF-j6SK88gIL_XyO4PcowM-mlr53s61Uv7FFAofyvLPVaP81CaVubnakv0XeXCK90Hc74O-Sy2OxJX_15__ydJdDDV7R7fJIw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#151b29] via-[#151b29]/40 to-transparent" />
                
                {/* Top Floating Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#080e1c]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  <Zap size={14} className="text-[#f3b72c]" />
                  <span className="text-[10px] font-bold text-[#ffdea4] uppercase tracking-wider font-mono">
                    Instant Payout
                  </span>
                </div>
                <div className="absolute top-3 right-3 bg-[#080e1c]/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[#d4c5ad] border border-white/10">
                  <Users size={14} className="text-[#a5e7ff]" />
                  <span className="text-[11px] font-medium font-mono">1v1 Duel</span>
                </div>
              </div>

              {/* Hero Body Content */}
              <div className="bg-[#151b29] p-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl text-[#dde2f6] font-extrabold tracking-tight">
                    Nim Connect 7×6
                  </h1>
                  <div className="flex items-center gap-1 text-[#ffd78d]">
                    <Star size={17} className="fill-[#ffd78d] text-[#ffd78d]" />
                    <span className="text-xs font-bold font-mono">4.9</span>
                  </div>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-1 leading-relaxed">
                  Vertical 7×6 tactical grid. Drop your gold and cyan discs, anticipate opponent diagonals, connect 4-in-a-row, and claim the winner pot settled directly on the Nimiq chain.
                </p>

                {/* Quick Specs Matrix */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 bg-[#191f2e]/70 border border-[#242a39] rounded-lg p-2">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <Timer size={13} className="text-[#a5e7ff]" /> Turn Clock
                    </span>
                    <span className="text-xs text-[#dde2f6] font-semibold mt-0.5 font-mono">
                      30s Timer
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center border-x border-[#242a39]">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <Grid size={13} className="text-[#68f5b8]" /> Matrix
                    </span>
                    <span className="text-xs text-[#dde2f6] font-semibold mt-0.5 font-mono">
                      7 Cols × 6 Rows
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <Coins size={13} className="text-[#ffd78d]" /> Pot Share
                    </span>
                    <span className="text-xs text-[#ffd78d] font-semibold mt-0.5 font-mono">
                      90% Net
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE SELECTOR SECTION                                                     */}
          {/* ========================================================================= */}
          <div className="px-4 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-[#dde2f6]">
                Select Mode
              </span>
              <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono">
                Step 1 of 2
              </span>
            </div>

            {/* Mode Option 1: 1v1 Wagered Duel */}
            <div
              onClick={() => setCurrentMode("match")}
              className={`cursor-pointer relative p-3.5 rounded-xl transition-all active:scale-[0.99] flex items-start gap-3.5 border ${
                currentMode === "match"
                  ? "bg-[#242a39] border-[#f3b72c]/60 shadow-[0_0_16px_rgba(243,183,44,0.15)] opacity-100"
                  : "bg-[#151b29] border-[#242a39] opacity-75 hover:opacity-95"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  currentMode === "match"
                    ? "bg-[#f3b72c] text-[#412d00] shadow-[0_0_12px_rgba(243,183,44,0.35)]"
                    : "bg-[#191f2e] text-[#ffd78d]"
                }`}
              >
                <Swords size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#dde2f6] font-bold">
                    Ranked 1v1 Duel
                  </span>
                  <span className="bg-[#ffd78d]/20 text-[#ffd78d] text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] animate-ping" />
                    Instant Queue
                  </span>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                  Stake NIM against live network gladiators. Winner claims 90% of total escrow.
                </p>
              </div>
              <div className="shrink-0 self-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    currentMode === "match"
                      ? "border-[#ffd78d] bg-[#ffd78d]"
                      : "border-[#d4c5ad]/50 bg-transparent"
                  }`}
                >
                  {currentMode === "match" && (
                    <div className="w-2 h-2 rounded-full bg-[#412d00]" />
                  )}
                </div>
              </div>
            </div>

            {/* Mode Option 2: Play with Friend */}
            <div
              onClick={() => setCurrentMode("friend")}
              className={`cursor-pointer relative p-3.5 rounded-xl transition-all active:scale-[0.99] flex items-start gap-3.5 border ${
                currentMode === "friend"
                  ? "bg-[#242a39] border-[#a5e7ff]/60 shadow-[0_0_16px_rgba(165,231,255,0.15)] opacity-100"
                  : "bg-[#151b29] border-[#242a39] opacity-75 hover:opacity-95"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  currentMode === "friend"
                    ? "bg-[#00d2ff] text-[#003543] shadow-[0_0_12px_rgba(0,210,255,0.35)]"
                    : "bg-[#191f2e] text-[#a5e7ff]"
                }`}
              >
                <Users size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#dde2f6] font-bold">
                    Play with Friend
                  </span>
                  <span className="bg-[#2f3544] text-[#b6ebff] text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                    Private Code
                  </span>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                  Create a custom room or join an existing table via a 6-digit challenge code.
                </p>
              </div>
              <div className="shrink-0 self-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    currentMode === "friend"
                      ? "border-[#00d2ff] bg-[#00d2ff]"
                      : "border-[#d4c5ad]/50 bg-transparent"
                  }`}
                >
                  {currentMode === "friend" && (
                    <div className="w-2 h-2 rounded-full bg-[#003543]" />
                  )}
                </div>
              </div>
            </div>

            {/* Mode Option 3: Practice vs Bot */}
            <div
              onClick={() => setCurrentMode("bot")}
              className={`cursor-pointer relative p-3.5 rounded-xl transition-all active:scale-[0.99] flex items-start gap-3.5 border ${
                currentMode === "bot"
                  ? "bg-[#242a39] border-[#68f5b8]/60 shadow-[0_0_16px_rgba(104,245,184,0.15)] opacity-100"
                  : "bg-[#151b29] border-[#242a39] opacity-75 hover:opacity-95"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  currentMode === "bot"
                    ? "bg-[#68f5b8] text-[#003824] shadow-[0_0_12px_rgba(104,245,184,0.35)]"
                    : "bg-[#191f2e] text-[#68f5b8]"
                }`}
              >
                <Bot size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#dde2f6] font-bold">
                    Practice vs Bot
                  </span>
                  <span className="bg-[#2f3544] text-[#6ffbbe] text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                    {isHouseBotWager ? "House Wager" : "Zero Risk"}
                  </span>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                  Hone your column traps and diagonal blocks against our minimax AI before wagering real NIM.
                </p>
              </div>
              <div className="shrink-0 self-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    currentMode === "bot"
                      ? "border-[#68f5b8] bg-[#68f5b8]"
                      : "border-[#d4c5ad]/50 bg-transparent"
                  }`}
                >
                  {currentMode === "bot" && (
                    <div className="w-2 h-2 rounded-full bg-[#003824]" />
                  )}
                </div>
              </div>
            </div>

            {/* Optional House Match Toggle for Bot Mode */}
            {currentMode === "bot" && (
              <div className="pt-1 flex items-center justify-between bg-[#151b29] border border-[#242a39] rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#ffd78d]" />
                  <span className="text-[#dde2f6] font-semibold">Wager vs House Bot?</span>
                </div>
                <button
                  onClick={() => setIsHouseBotWager(!isHouseBotWager)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                    isHouseBotWager
                      ? "bg-[#f3b72c] text-[#412d00]"
                      : "bg-[#242a39] text-[#d4c5ad]"
                  }`}
                  type="button"
                >
                  {isHouseBotWager ? "Wager Enabled" : "Free Practice"}
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STAKE SELECTION MODULE                                                    */}
          {/* ========================================================================= */}
          <div
            className={`px-4 pt-1 flex flex-col space-y-3 transition-opacity ${
              currentMode === "bot" && !isHouseBotWager
                ? "opacity-35 pointer-events-none"
                : "opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-[#dde2f6]">
                  Match Stake
                </span>
                <p className="text-xs text-[#d4c5ad]">
                  Locked in Nimiq Pay micro-escrow
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#151b29] border border-[#242a39] px-2.5 py-1 rounded-full text-right">
                <span className="text-[10px] text-[#d4c5ad] font-mono">Balance:</span>
                <span className="text-[11px] text-[#ffd78d] font-bold font-mono">
                  {balanceNim != null ? formatNim(balanceNim) : "0"} NIM
                </span>
              </div>
            </div>

            {/* Stake Chips Grid */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((amount) => {
                const isSelected = selectedStake === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => setSelectedStake(amount)}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border cursor-pointer ${
                      isSelected
                        ? "bg-[#f3b72c] border-[#ffd78d] text-[#412d00] shadow-[0_0_14px_rgba(243,183,44,0.3)]"
                        : "bg-[#151b29] border-[#242a39] text-[#dde2f6] hover:bg-[#191f2e]"
                    }`}
                    type="button"
                  >
                    <span className="font-bold text-sm leading-tight">{amount}</span>
                    <span
                      className={`text-[10px] font-mono leading-none ${
                        isSelected ? "font-bold text-[#412d00]" : "text-[#d4c5ad]"
                      }`}
                    >
                      NIM
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Payout & CoinGecko Rate Preview Card */}
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center text-[#ffd78d]">
                  <Trophy size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    Total Pot ({selectedStake * 2} NIM)
                  </span>
                  <span className="text-xs text-[#dde2f6] font-bold tracking-tight font-mono">
                    ≈ {formatUsd(nimToUsd(selectedStake * 2))}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#d4c5ad] font-mono">
                  Winner Payout (90%)
                </span>
                <div className="text-xs text-[#68f5b8] font-bold font-mono">
                  +{payoutPreview} NIM
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLLAPSIBLE RULES ACCORDION                                               */}
          {/* ========================================================================= */}
          <div className="px-4 pt-1">
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2 transition-all">
              <button
                type="button"
                onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 size={18} className="text-[#a5e7ff]" />
                  <span className="text-sm font-semibold text-[#dde2f6]">
                    Tactical Rules &amp; Fair Play
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-[#d4c5ad] transition-transform duration-300 ${
                    isRulesExpanded ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              {isRulesExpanded && (
                <div className="flex flex-col gap-2.5 pt-2 text-[#d4c5ad] text-xs border-t border-[#242a39]/80 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Drop Discs:</strong> Players alternate turns dropping 1 disc down any of the 7 columns.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Victory Condition:</strong> Connect 4 discs in a straight line horizontally, vertically, or diagonally.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">30s Turn Clock:</strong> Failing to play before the timer expires forfeits the match to the opponent.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Smart Settlement:</strong> Non-custodial escrow contract transfers 90% of the pot directly to the winner's vault.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACTIVE TABLES RADAR                                                       */}
          {/* ========================================================================= */}
          <div className="px-4 pt-1">
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#dde2f6] flex items-center gap-1.5">
                  <Swords size={14} className="text-[#ffd78d]" />
                  Active Connect 4 Tables ({activeCount})
                </span>
                <span className="text-[10px] text-[#68f5b8] font-mono font-medium">
                  {activeCount > 0 ? "Live Radar" : "Ready to Host"}
                </span>
              </div>

              {activeCount === 0 ? (
                <div className="p-3 text-center text-xs text-[#d4c5ad]/70 font-mono">
                  No public Connect 4 rooms open right now. Be the first to start a table!
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {activeMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-[#191f2e] border border-[#242a39] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#68f5b8] animate-pulse" />
                        <span className="text-xs font-bold font-mono text-[#dde2f6]">
                          Table #{m.joinCode}
                        </span>
                      </div>
                      <Link
                        href={`/matches/${m.id}`}
                        className="h-7 px-2.5 rounded-lg bg-[#242a39] hover:bg-[#2f3544] text-xs font-mono text-[#ffd78d] flex items-center gap-1 active:scale-95 transition-transform"
                      >
                        <span>Join</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* FLOATING ACTION BOTTOM BAR                                                */}
        {/* ========================================================================= */}
        <div className="fixed bottom-14 inset-x-0 z-40 pointer-events-none">
          <div className="max-w-md mx-auto w-full px-4 pb-2 pointer-events-auto">
            <button
              disabled={isConnecting}
              onClick={handlePrimaryAction}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#f3b72c] to-[#e5a620] hover:brightness-105 active:scale-[0.98] text-[#412d00] font-black text-sm flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(243,183,44,0.35)] transition-all disabled:opacity-50 cursor-pointer"
              type="button"
            >
              {isConnecting ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  <span>Connecting to Arena…</span>
                </>
              ) : currentMode === "friend" ? (
                <>
                  <Users size={18} />
                  <span>Create Table &amp; Invite Friend</span>
                </>
              ) : currentMode === "bot" ? (
                <>
                  <Bot size={18} />
                  <span>
                    {isHouseBotWager
                      ? `Enter House Wager (${selectedStake} NIM)`
                      : "Start Practice Match (Free)"}
                  </span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-[#412d00]" />
                  <span>Enter 1v1 Arena Table ({selectedStake} NIM)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODALS & SHEETS                                                           */}
        {/* ========================================================================= */}
        <ConfirmEntrySheet
          isOpen={isConfirmEntryOpen}
          onClose={() => setIsConfirmEntryOpen(false)}
          onConfirm={handleConfirmMatchEntry}
          gameTitle="Nim Connect 7×6"
          stakeNim={selectedStake}
          balanceNim={balanceNim ?? 0}
          isConfirming={isConnecting}
        />

        <PlayWithFriendModal
          isOpen={isPlayWithFriendOpen}
          onClose={() => setIsPlayWithFriendOpen(false)}
          gameSlug="connect-four"
          gameTitle="Nim Connect"
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
                sessionStorage.setItem("nimiq_session_token", loginRes.token);
              }
              await utils.auth.me.invalidate();
              toast.success("Wallet Authenticated", {
                description: `Signed in as ${addr.slice(0, 8)}...`,
              });
            } catch (authErr) {
              console.warn("Auto sign-in non-blocking error:", authErr);
            }
          }}
          onDisconnected={() => {
            setAddress(null);
            setConnectionMode("none");
          }}
        />

        {/* PERSISTENT BOTTOM NAVIGATION */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
