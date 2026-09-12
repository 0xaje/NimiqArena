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
  Lock,
  Play,
  Share2,
  Copy,
  ArrowUpRight,
  Wallet,
  Sparkles,
  RotateCw,
  Star,
  Gamepad2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { formatNim } from "@shared/game/pot-distribution";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { PlayWithFriendModal } from "@/components/game/PlayWithFriendModal";
import { TournamentCupModal } from "@/components/tournament/TournamentCupModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { ActiveTablesDirectory } from "@/components/game/ActiveTablesDirectory";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { ConfirmEntrySheet } from "@/components/game/ConfirmEntrySheet";

type GameMode = "match" | "friend" | "bot";

export default function LudoDetail() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const gameQuery = trpc.game.getBySlug.useQuery({ slug: "ludo-league" });
  const activeMatchesQuery = trpc.match.listActiveMatches.useQuery(
    { limit: 10 },
    { refetchInterval: 6000 }
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
  const [isEntryFlowOpen, setIsEntryFlowOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [isDripping, setIsDripping] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [connectionMode, setConnectionMode] = useState<any>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("nimiq_wallet_mode") || "none"
      : "none"
  );

  const user = authQuery.data;
  const activeMatches = activeMatchesQuery.data || [];
  const activeCount = Math.max(activeMatches.length * 2, 8);

  const totalPot = selectedStake * 2;
  const payoutPreview = (totalPot * 0.9).toFixed(1).replace(/\.0$/, "");

  const shortAddress = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : "Connect Wallet";

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
        description:
          err instanceof Error ? err.message : "Visit official faucet.",
      });
      window.open("https://testnet.nimiq.watch/#faucet", "_blank");
    } finally {
      setIsDripping(false);
    }
  };

  async function ensureAuthenticated(defaultName: string = "Player 1") {
    if (user) return;
    const savedWallet =
      address || localStorage.getItem("nimiq_arena_wallet_address");
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
        console.warn("[LudoDetail] Nimiq auto-login fallback to guest:", e);
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

  // Handle Matchmaking
  async function handleTriggerAction() {
    if (currentMode === "friend") {
      setIsPlayWithFriendOpen(true);
      return;
    }

    if (currentMode === "bot") {
      if (isHouseBotWager) {
        // Wager vs House Bot
        try {
          setIsConnecting(true);
          await ensureAuthenticated("Player 1 (Wager Host)");
          toast.info(`Setting up ${selectedStake} NIM House Match vs Arena Bot…`);
          const res = await createHouseWagered.mutateAsync({
            gameSlug: "ludo-league",
            stakeNim: selectedStake,
          });
          navigate(`/matches/${res.id}`);
        } catch (err) {
          toast.error("Failed to create house match", {
            description: err instanceof Error ? err.message : "Try again.",
          });
        } finally {
          setIsConnecting(false);
        }
      } else {
        // Free Practice vs Bot
        try {
          setIsConnecting(true);
          await ensureAuthenticated("Player 1 (Solo)");
          toast.info("Launching Practice Table vs Arena Bot…");
          const match = await createSolo.mutateAsync({
            gameSlug: "ludo-league",
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

      // Check balance if connected
      if (isConnected && balanceNim != null && balanceNim < selectedStake) {
        toast.error(`Insufficient NIM Balance (${balanceNim} NIM available)`, {
          description: `You need at least ${selectedStake} NIM to enter. Use 1-Click Faucet in wallet.`,
        });
        setIsConnecting(false);
        return;
      }

      toast.info(`Searching live arena for ${selectedStake} NIM opponents…`);
      const res = await createWagered.mutateAsync({
        gameSlug: "ludo-league",
        stakeNim: selectedStake,
      });

      // Quick visual feedback matching stitches animation
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
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-[#f3b72c]/40 group-hover:border-[#f3b72c] transition-colors"
                    src="https://lh3.googleusercontent.com/aida/AEtjO1X_SEKkH_ei8ODz8gUMrl0X_UrXhtg4pdYeHJ7fpZEFwzYsY6x_OXMzm2c0kYB-y4CLDd0oVD0NDSwRxV9XVNucimIN9qNoRNfl65Ojaz6sf7dYDYsdQ0oz9rrsmw4dNv_wcudv-yE8D2P2-b2L5jQ7mRfM28LeclhEAIg0i4d3K1sG6fmemSFnWSDCW5iUeYg_jkd-F18QXTod1fOZxgsojaMfvS9MiiXrbKsYZ05rem4Va3ra26FYmS4F"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#68f5b8] border-2 border-[#0d1321]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#ffdea4] tracking-tight leading-none">
                    NIMIQ ARENA
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono mt-0.5">
                    Ludo Arena
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
                className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#2f3544] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] active:scale-95 transition-transform"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]"
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
        <main
          className={`flex-1 flex flex-col w-full pt-20 pb-28 space-y-4 transition-all duration-300 ${
            isConfirmEntryOpen ? "opacity-40 blur-[1px] pointer-events-none filter" : ""
          }`}
        >
          
          {/* Sub-Header: Back Nav & Quick Status */}
          <div className="flex items-center justify-between px-4 pt-1">
            <Link
              href="/games"
              className="flex items-center gap-1 text-[#d4c5ad] hover:text-[#dde2f6] transition-colors py-1 group"
            >
              <ChevronLeft
                size={20}
                className="transition-transform group-active:-translate-x-1"
              />
              <span className="text-sm font-semibold">Games</span>
            </Link>

            <div className="flex items-center gap-1.5 bg-[#151b29] border border-[#242a39] px-3 py-1 rounded-full shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff] animate-pulse" />
              <span className="text-[11px] font-semibold text-[#b6ebff] font-mono">
                {activeCount} Battling Now
              </span>
            </div>
          </div>

          {/* HERO VISUAL CARD */}
          <div className="px-4">
            <div className="relative w-full rounded-xl overflow-hidden bg-[#080e1c] border border-[#242a39] shadow-xl">
              
              {/* Media Banner with Gradient Scrim */}
              <div className="relative w-full h-52 overflow-hidden">
                <img
                  alt="Ludo Arena Cyber Board"
                  className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-700 hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbUH8DONpDxBkb1xaOY7kW4s7sgG-BV-W9YpHRwFrKYTBccxpE1V0BmYJMW0_QPoSmrAcUwxQvx41ILaEO3N0ZFqH-UdzCG86B10yxHIQIymQJXOcKnzaqUwPM7u6sSYVph_e1mdtQmACoWk8Z61pI8V663Xsq7a9PdnzJg627ztWmdiIl9kYlgehLIG_S-4LauBYYcFEIwV8ILH1jLbksPXcmexuuiuh4IU-Rs2g6fdJWx0FqPIS7Jg"
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
                  <span className="text-[11px] font-medium">2–4 Players</span>
                </div>
              </div>

              {/* Hero Body Content */}
              <div className="bg-[#151b29] p-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl text-[#dde2f6] font-extrabold tracking-tight">
                    Ludo Arena
                  </h1>
                  <div className="flex items-center gap-1 text-[#ffd78d]">
                    <Star size={17} className="fill-[#ffd78d] text-[#ffd78d]" />
                    <span className="text-xs font-bold font-mono">4.9</span>
                  </div>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-1 leading-relaxed">
                  Tactical holographic board combat. Roll provably fair dice,
                  mobilize your crystal pawns, strike opposing paths, and lock
                  your gold in the vault.
                </p>

                {/* Quick Specs Matrix */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 bg-[#191f2e]/70 border border-[#242a39] rounded-lg p-2">
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <Timer size={13} className="text-[#a5e7ff]" /> Avg Pace
                    </span>
                    <span className="text-xs text-[#dde2f6] font-semibold mt-0.5">
                      ~6 mins
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center border-x border-[#242a39]">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <ShieldCheck size={13} className="text-[#68f5b8]" /> RNG
                    </span>
                    <span className="text-xs text-[#dde2f6] font-semibold mt-0.5">
                      Nimiq VRF
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[10px] text-[#d4c5ad] flex items-center gap-1 font-mono">
                      <Coins size={13} className="text-[#f9bd32]" /> Pot Share
                    </span>
                    <span className="text-xs text-[#ffd78d] font-semibold mt-0.5">
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

            {/* Mode Option 1: Find a Match */}
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
                    Find a Match
                  </span>
                  <span className="bg-[#ffd78d]/20 text-[#ffd78d] text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] animate-ping" />
                    12s Queue
                  </span>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                  Instant 1v1 or 4-player competitive matchmaking against live network contenders.
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
                  Create a wager lounge or join an existing peer-to-peer room via short invite link.
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

            {/* Mode Option 3: Play Bot */}
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
                    Arena AI Practice
                  </span>
                  <span className="bg-[#2f3544] text-[#6ffbbe] text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                    {isHouseBotWager ? "House Wager" : "Zero Risk"}
                  </span>
                </div>
                <p className="text-xs text-[#d4c5ad] mt-0.5 leading-snug">
                  Warm up pawn movement strategies and test blockades before staking actual NIM.
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                    isHouseBotWager
                      ? "bg-[#f3b72c] text-[#412d00]"
                      : "bg-[#242a39] text-[#d4c5ad]"
                  }`}
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
              {[10, 50, 100, 500].map((amount) => {
                const isSelected = selectedStake === amount;
                return (
                  <button
                    key={amount}
                    onClick={() => setSelectedStake(amount)}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border ${
                      isSelected
                        ? "bg-[#f3b72c] border-[#ffd78d] text-[#412d00] shadow-[0_0_14px_rgba(243,183,44,0.3)]"
                        : "bg-[#151b29] border-[#242a39] text-[#dde2f6] hover:bg-[#191f2e]"
                    }`}
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

            {/* Payout Preview Card */}
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#242a39] flex items-center justify-center text-[#ffd78d]">
                  <Trophy size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    Estimated 1v1 Pot
                  </span>
                  <span className="text-xs text-[#dde2f6] font-bold tracking-tight font-mono">
                    {totalPot} NIM
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#d4c5ad] font-mono">
                  Champion Receives
                </span>
                <div className="text-xs text-[#68f5b8] font-bold font-mono">
                  +{payoutPreview} NIM
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLLAPSIBLE RULES PILL                                                    */}
          {/* ========================================================================= */}
          <div className="px-4 pt-1">
            <div className="bg-[#151b29] border border-[#242a39] rounded-xl p-3 flex flex-col gap-2 transition-all">
              <button
                type="button"
                onClick={() => setIsRulesExpanded(!isRulesExpanded)}
                className="w-full flex items-center justify-between text-left"
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
                      <strong className="text-[#dde2f6]">Roll a 6:</strong> Release 1
                      crystal pawn out of the launch sanctum onto your track.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Pawn Strike:</strong> Landing on
                      an opponent sends them to their respawn and awards +1 roll.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffd78d] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Vault Finish:</strong> First
                      player to pilot all 4 pawns to center vault takes the prize pool.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8] mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-[#dde2f6]">Nimiq PoS Escrow:</strong> 90%
                      winner payout, 5% builder fund, 2% ecosystem, 1% charity, 2% referrer.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRIMARY BOTTOM ACTION BOX                                                 */}
          {/* ========================================================================= */}
          <div className="px-4 pt-2 flex flex-col items-center gap-2">
            <button
              onClick={handleTriggerAction}
              disabled={isConnecting}
              className={`w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-[0_4px_20px_-2px_rgba(243,183,44,0.4)] ${
                isConnecting
                  ? "bg-[#68f5b8] text-[#003824]"
                  : "bg-[#f3b72c] text-[#412d00] hover:bg-[#ffdea4]"
              }`}
            >
              {isConnecting ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  <span>Connecting Arena…</span>
                </>
              ) : currentMode === "bot" && !isHouseBotWager ? (
                <>
                  <Bot size={18} />
                  <span>Launch Practice Match (Free)</span>
                </>
              ) : currentMode === "friend" ? (
                <>
                  <Share2 size={18} />
                  <span>Create / Join Room ({selectedStake} NIM)</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-current" />
                  <span>Enter Matchmaking ({selectedStake} NIM)</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1.5 text-[#d4c5ad]">
              <Lock size={13} className="text-[#68f5b8]" />
              <span className="text-[11px] font-mono">
                Secured by Nimiq Pay micro-contracts
              </span>
            </div>
          </div>

          {/* Quick Access: Custom Table & Tournament Cup Pill */}
          <div className="px-4 pt-1 flex items-center justify-between gap-2">
            <button
              onClick={() => setIsEntryFlowOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#191f2e] border border-[#242a39] text-[11px] text-[#dde2f6] hover:text-[#ffd78d] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Coins size={14} className="text-[#ffd78d]" />
              <span>Custom Table</span>
            </button>
            <button
              onClick={() => setIsTournamentOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#191f2e] border border-[#242a39] text-[11px] text-[#dde2f6] hover:text-[#ffd78d] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trophy size={14} className="text-[#ffd78d]" />
              <span>8-Player Cup</span>
            </button>
          </div>

          {/* LIVE ACTIVE ARENA TABLES DIRECTORY */}
          <div className="px-4 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#dde2f6] uppercase tracking-wider font-mono">
                Live Tables Radar
              </span>
              <span className="text-[10px] text-[#94a3b8] font-mono">
                {activeMatches.length} Open Now
              </span>
            </div>
            <ActiveTablesDirectory />
          </div>

        </main>

        {/* ========================================================================= */}
        {/* WALLET VAULT SHEET                                                        */}
        {/* ========================================================================= */}
        {isWalletSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setIsWalletSheetOpen(false)}
            />
            <div className="relative w-full max-w-md bg-[#151b29] border-t border-[#2f3544] rounded-t-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
              
              {/* Top grab bar */}
              <div className="w-12 h-1 bg-[#2f3544] rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#f3b72c]/20 flex items-center justify-center text-[#f3b72c]">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#dde2f6]">
                      Nimiq Vault
                    </h3>
                    <span className="text-[10px] text-[#94a3b8] font-mono">
                      {networkName} Network
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] text-[10px] font-mono font-bold">
                  Connected
                </span>
              </div>

              {/* Address Strip */}
              <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544] flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#dde2f6] truncate max-w-[240px]">
                  {address}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-xs text-[#a5e7ff] hover:text-white flex items-center gap-1 font-mono shrink-0 ml-2"
                >
                  <Copy size={13} />
                  <span>{copiedAddress ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Balance Card */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                    Available
                  </span>
                  <p className="text-base text-[#ffd78d] font-mono font-bold mt-0.5">
                    {balanceNim != null ? formatNim(balanceNim) : "0"}{" "}
                    <span className="text-xs">NIM</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#191f2e] border border-[#2f3544]">
                  <span className="text-[10px] text-[#94a3b8] uppercase font-mono">
                    Status
                  </span>
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
                <RotateCw
                  size={14}
                  className={isDripping ? "animate-spin" : ""}
                />
                <span>
                  {isDripping
                    ? "Dripping 50 NIM…"
                    : "Get 50 Free Testnet NIM (1-Click)"}
                </span>
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

        {/* ========================================================================= */}
        {/* FUNCTIONAL DIALOGS & MODALS                                               */}
        {/* ========================================================================= */}
        <ConfirmEntrySheet
          isOpen={isConfirmEntryOpen}
          onClose={() => setIsConfirmEntryOpen(false)}
          gameTitle="Ludo Arena — 1v1"
          stakeNim={selectedStake}
          walletAddress={address}
          balanceNim={balanceNim}
          isConfirming={isConnecting}
          onConfirm={handleConfirmMatchEntry}
          onRefreshBalance={refreshBalance}
        />

        <PlayWithFriendModal
          isOpen={isPlayWithFriendOpen}
          onClose={() => setIsPlayWithFriendOpen(false)}
          gameSlug="ludo-league"
          gameTitle="Ludo League"
        />

        <LudoEntryFlowModal
          isOpen={isEntryFlowOpen}
          onClose={() => setIsEntryFlowOpen(false)}
          defaultStake={selectedStake}
        />

        <TournamentCupModal
          isOpen={isTournamentOpen}
          onClose={() => setIsTournamentOpen(false)}
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
              const challengeRes =
                await utils.client.auth.requestChallenge.query();
              const loginRes = await loginWithNimiq.mutateAsync({
                address: addr,
                challenge: challengeRes.challenge,
              });
              if (loginRes?.token) {
                sessionStorage.setItem(
                  "manus-cookie",
                  `manus-session=${loginRes.token}`
                );
                localStorage.setItem(
                  "manus-cookie",
                  `manus-session=${loginRes.token}`
                );
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

        {/* ========================================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR                                              */}
        {/* ========================================================================= */}
        <MobileBottomNav activeMatchesCount={activeMatches.length} />
      </div>
    </div>
  );
}
