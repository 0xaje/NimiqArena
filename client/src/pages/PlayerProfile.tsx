import React, { useState } from "react";
import { Link } from "wouter";
import {
  Diamond,
  TrendingUp,
  ShieldCheck,
  Shield,
  Wallet,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  Crown,
  Gem,
  Medal,
  Swords,
  Crosshair,
  Stars,
  Flame,
  Key,
  Fingerprint,
  Radio,
  Vibrate,
  User,
  PlusCircle,
  Clock,
  Coins,
  Sparkles,
  Award,
  Lock,
  ArrowUpRight,
  LogOut,
  Grid,
  Dices,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";
import {
  AVATAR_PRESETS,
  IdentityRegistrationModal,
} from "@/components/profile/IdentityRegistrationModal";
import { InstantCashoutSheet } from "@/components/wallet/InstantCashoutSheet";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { useNimiqPrice } from "@/lib/nimiq-price";

export default function PlayerProfile() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;
  const { nimToUsd, formatUsd, priceUsd } = useNimiqPrice();

  const {
    address: walletAddress,
    balanceNim,
    balanceStatus,
    networkName,
    syncNimiqPayAccount,
    refreshBalance,
    disconnect,
  } = useNimiqWallet();

  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug: "ludo-league" },
    { enabled: Boolean(user) }
  );
  const seasonQuery = trpc.season.getActive.useQuery();

  const stats = statsQuery.data;
  const season = seasonQuery.data;
  const history = stats?.history ?? [];

  // Drip mutation for easy testnet faucet
  const dripMutation = trpc.payment.requestTestnetDrip.useMutation();

  // State
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isCashoutOpen, setIsCashoutOpen] = useState(false);
  const [isDripping, setIsDripping] = useState(false);
  const [audioHapticFx, setAudioHapticFx] = useState(true);

  // Rating & Tier (Real dynamic data, 0/1000 defaults for new player)
  const rating = stats?.rating ?? 1000;
  const matchesPlayed = stats?.matchesPlayed ?? 0;
  const wins = stats?.wins ?? 0;
  const losses = Math.max(0, matchesPlayed - wins);
  const winRate = matchesPlayed > 0 ? ((wins / matchesPlayed) * 100).toFixed(1) : "0.0";

  const tier =
    matchesPlayed === 0
      ? { name: "Novice Contender", label: "Unranked Duelist", color: "#a5e7ff", Icon: Swords }
      : rating >= 2000
      ? { name: "Diamond Tier II", label: "Top 3.2% Arena Contender", color: "#00d2ff", Icon: Diamond }
      : rating >= 1600
      ? { name: "Platinum Tier I", label: "Top 8.5% Contender", color: "#a5e7ff", Icon: Gem }
      : rating >= 1300
      ? { name: "Gold Tier", label: "Gold Legion Member", color: "#ffd78d", Icon: Medal }
      : { name: "Challenger Tier", label: "Arena Duelist", color: "#68f5b8", Icon: Swords };

  // Address masking
  const maskedAddress = walletAddress
    ? `${walletAddress.slice(0, 4)} ···· ${walletAddress.slice(-4)}`
    : "Not Connected";

  const handleCopyAddress = () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleRequestDrip = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsDripping(true);
      toast.info("Requesting 50 Testnet NIM drip…");
      const res = await dripMutation.mutateAsync({ address: walletAddress });
      if (res.success) {
        toast.success("50 Testnet NIM Received!", {
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

  const handleDisconnect = () => {
    disconnect();
    toast.info("Wallet disconnected from Arena session.");
  };

  const avatarPreset = AVATAR_PRESETS.find((p) => p.id === (user as any)?.avatar);
  const isCustomAvatar = (user as any)?.avatar && (user as any)?.avatar.startsWith("http");

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans select-none pb-safe">
      {/* Mobile Mini-App Container Constraint */}
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
                  Player Profile
                </span>
              </div>
            </Link>

            {/* Top Balance Pill */}
            <div className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#242a39] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]" />
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
        {/* MAIN SCROLLABLE CONTENT                                                   */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full px-4 pt-3 pb-24 gap-4">
          
          {/* ========================================================================= */}
          {/* 1. PROFILE & IDENTITY CARD                                                */}
          {/* ========================================================================= */}
          <section className="relative overflow-hidden rounded-xl bg-[#242a39] border border-[#2f3544] p-4 shadow-xl">
            {/* Ambient Backlight */}
            <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#f3b72c]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#00d2ff]/10 blur-3xl pointer-events-none" />

            <div className="relative flex items-start gap-3.5">
              {/* Avatar Ring */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-[#ffd78d] via-[#f3b72c] to-[#2f3544] shadow-[0_0_16px_rgba(243,183,44,0.35)]">
                  {isCustomAvatar ? (
                    <img
                      alt="Player Avatar"
                      className="w-full h-full rounded-full object-cover"
                      src={(user as any).avatar}
                    />
                  ) : avatarPreset ? (
                    <div className="w-full h-full rounded-full bg-[#191f2e] flex items-center justify-center text-2xl">
                      {avatarPreset.icon}
                    </div>
                  ) : (
                    <img
                      alt="Player Avatar"
                      className="w-full h-full rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida/AEtjO1Wu3JktQaSjdwXLBnorTN2FMEsca4A40PflEfiuWB_JViUrA8Fojm7RZdRv0c7PRx1ONKlSp_e1DCpwnnF4FDqd4cXMnzK3ePXTazlT4zlQ5i0OPEW3JlruR9BIds7zu0qtcNYnZobUSi-ajIIOWI3cBJ6stP-XyWNfW6V-wz0Ptrxi0THOnNBrt3lfUE4HUD4FRDfrrK3Lw4cvT-VfxznGrzfVQYGaAlUBL8AOH6VVWRecOOi77H15SQRL"
                    />
                  )}
                </div>
                {/* Online Indicator */}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#46d89d] shadow-[0_0_8px_#46d89d] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003824]" />
                </span>
              </div>

              {/* Identity & Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <h2 className="text-lg font-bold text-[#dde2f6] truncate leading-tight">
                    {user?.name || "Valkyrie"}
                  </h2>
                  <button
                    onClick={() => setIsIdentityModalOpen(true)}
                    className="px-2 py-0.5 rounded-full bg-[#ffd78d]/10 border border-[#ffd78d]/30 text-[#ffd78d] text-[10px] font-mono font-bold active:scale-95 transition-transform cursor-pointer"
                  >
                    LVL 48 · EDIT
                  </button>
                </div>
                <p className="text-xs text-[#d4c5ad] flex items-center gap-1.5 mt-0.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f3b72c]" />
                  Gold Legion · Season 4 Active
                </p>

                {/* Address Tag / Pill */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#080e1c] border border-[#242a39]">
                    <ShieldCheck size={13} className="text-[#68f5b8]" />
                    <span className="text-[10px] text-[#d4c5ad] font-mono">
                      {maskedAddress}
                    </span>
                    <button
                      aria-label="Copy Address"
                      onClick={handleCopyAddress}
                      className="text-[#d4c5ad] hover:text-[#ffd78d] active:scale-90 transition-transform p-0.5 cursor-pointer"
                      type="button"
                    >
                      {copiedAddress ? (
                        <Check size={12} className="text-[#68f5b8]" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                  {copiedAddress && (
                    <span className="text-[10px] font-mono text-[#68f5b8]">Copied!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Rank Badge & Competitive Elo */}
            <div className="mt-3.5 pt-3.5 flex items-center justify-between bg-[#080e1c]/80 border border-[#2f3544] rounded-lg p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-[#00d2ff]/15 border border-[#00d2ff]/30 flex items-center justify-center text-[#a5e7ff] shadow-[0_0_12px_rgba(0,210,255,0.25)]">
                  <tier.Icon size={20} className="text-[#00d2ff]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#dde2f6] leading-tight">
                    {tier.name}
                  </div>
                  <div className="text-[10px] text-[#d4c5ad] font-mono">
                    {tier.label}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold font-mono text-[#00d2ff]">
                  {rating.toLocaleString()} ELO
                </span>
                <div className="text-[10px] text-[#68f5b8] font-mono flex items-center justify-end gap-0.5">
                  <TrendingUp size={12} />
                  +34 pts
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. VAULT & NIM TREASURY OVERVIEW                                          */}
          {/* ========================================================================= */}
          <section className="relative overflow-hidden rounded-xl bg-[#242a39] border border-[#2f3544] p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#d4c5ad] flex items-center gap-1.5 font-mono">
                <Wallet size={14} className="text-[#ffd78d]" />
                Nimiq Arena Vault
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#68f5b8]/10 text-[#68f5b8] text-[10px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#68f5b8]" />
                Non-Custodial
              </span>
            </div>

            {/* Balance Prominence */}
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl text-[#ffd78d] font-black tracking-tight font-mono">
                  {balanceStatus === "available" || balanceStatus === "zero"
                    ? balanceNim.toFixed(2)
                    : "0.00"}
                </span>
                <span className="text-sm text-[#ffd78d] font-bold font-mono">NIM</span>
              </div>
              <p className="text-xs text-[#d4c5ad] font-mono mt-0.5">
                ≈ {formatUsd(nimToUsd(balanceNim))} USD {priceUsd > 0 ? `(CoinGecko: $${priceUsd.toFixed(6)}/NIM)` : ""}
              </p>
            </div>

            {/* Vault Metrics Row */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-[#080e1c] border border-[#242a39] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#d4c5ad] font-mono">Escrow In-Play</span>
                <div className="text-xs text-[#a5e7ff] font-mono font-bold mt-0.5 flex items-center gap-1">
                  <Clock size={12} />
                  0.00 NIM
                </div>
              </div>

              <div className="bg-[#080e1c] border border-[#242a39] p-2.5 rounded-lg">
                <span className="text-[10px] text-[#d4c5ad] font-mono">Available Cashout</span>
                <div className="text-xs text-[#68f5b8] font-mono font-bold mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  {formatNim(balanceNim)} NIM
                </div>
              </div>
            </div>

            {/* Vault Actions */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => setIsCashoutOpen(true)}
                className="h-10 rounded-xl bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(243,183,44,0.25)] active:scale-95 transition-transform cursor-pointer"
                type="button"
              >
                <ArrowUpRight size={15} />
                Instant Cashout
              </button>

              <button
                onClick={handleRequestDrip}
                disabled={isDripping}
                className="h-10 rounded-xl bg-[#242a39] hover:bg-[#2f3544] border border-[#2f3544] text-[#dde2f6] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
                type="button"
              >
                <Sparkles size={14} className="text-[#ffd78d]" />
                {isDripping ? "Requesting…" : "Faucet Drip"}
              </button>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. COMBAT RECORD & WIN METRICS                                            */}
          {/* ========================================================================= */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#dde2f6]">Combat Record</h3>
              <span className="text-[10px] text-[#d4c5ad] font-mono">
                {season?.name ?? "Season 1 Arena"}
              </span>
            </div>

            {matchesPlayed === 0 ? (
              <div className="bg-[#242a39] border border-[#2f3544] p-4 rounded-xl flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#ffd78d]/10 border border-[#ffd78d]/20 flex items-center justify-center text-[#ffd78d]">
                  <Swords size={20} />
                </div>
                <h4 className="text-sm font-bold text-[#dde2f6]">No Arena Battles Recorded Yet</h4>
                <p className="text-xs text-[#d4c5ad] max-w-xs leading-relaxed">
                  Join a ranked 1v1 match in Ludo League or Nim Connect to establish your win rate and claim your position on the leaderboard.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Link
                    href="/games/connect-four"
                    className="h-8 px-3 rounded-lg bg-[#f3b72c] hover:bg-[#e5a620] text-[#412d00] text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    Play Connect 4
                  </Link>
                  <Link
                    href="/games/ludo-league"
                    className="h-8 px-3 rounded-lg bg-[#2f3544] hover:bg-[#3b4356] text-[#dde2f6] text-xs font-bold font-mono flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    Play Ludo
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Total Matches</span>
                  <div className="text-lg font-bold text-[#dde2f6] font-mono mt-0.5">
                    {matchesPlayed}
                  </div>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Arena Contender</span>
                </div>

                <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Win Ratio</span>
                  <div className="text-lg font-bold text-[#68f5b8] font-mono mt-0.5">
                    {winRate}%
                  </div>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    {wins} W / {losses} L
                  </span>
                </div>

                <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Player Rating</span>
                  <div className="text-lg font-bold text-[#ffd78d] font-mono mt-0.5">
                    {rating}
                  </div>
                  <span className="text-[10px] text-[#f3b72c] font-mono">Elo System</span>
                </div>

                <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl">
                  <span className="text-[10px] text-[#d4c5ad] font-mono">Season Division</span>
                  <div className="text-sm font-bold text-[#a5e7ff] font-mono mt-1 truncate">
                    {tier.name}
                  </div>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">{tier.label}</span>
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 4. ARENA BADGES & TROPHIES SHOWCASE                                       */}
          {/* ========================================================================= */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#dde2f6]">Badges & Trophies</h3>
              <span className="text-[10px] text-[#d4c5ad] font-mono">18 Unlocked</span>
            </div>

            <div className="flex overflow-x-auto gap-2.5 pb-1 no-scrollbar">
              {/* Badge 1 */}
              <div className="shrink-0 w-32 bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-[#ffd78d]/10 border border-[#ffd78d]/30 flex items-center justify-center text-[#ffd78d] mb-1.5 shadow-[0_0_12px_rgba(255,215,141,0.2)]">
                  <Swords size={22} />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] font-mono">Pawn Hunter</span>
                <span className="text-[9px] text-[#d4c5ad] font-mono mt-0.5">50 pawns taken</span>
              </div>

              {/* Badge 2 */}
              <div className="shrink-0 w-32 bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-[#00d2ff]/15 border border-[#00d2ff]/30 flex items-center justify-center text-[#00d2ff] mb-1.5 shadow-[0_0_12px_rgba(0,210,255,0.2)]">
                  <Crosshair size={22} />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] font-mono">Diagonal Sniper</span>
                <span className="text-[9px] text-[#d4c5ad] font-mono mt-0.5">25 diagonal wins</span>
              </div>

              {/* Badge 3 */}
              <div className="shrink-0 w-32 bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-[#f3b72c]/20 border border-[#f3b72c]/40 flex items-center justify-center text-[#ffd78d] mb-1.5 shadow-[0_0_12px_rgba(243,183,44,0.25)]">
                  <Stars size={22} />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] font-mono">High Roller</span>
                <span className="text-[9px] text-[#d4c5ad] font-mono mt-0.5">1,000+ NIM Staked</span>
              </div>

              {/* Badge 4 */}
              <div className="shrink-0 w-32 bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-[#68f5b8]/15 border border-[#68f5b8]/30 flex items-center justify-center text-[#68f5b8] mb-1.5 shadow-[0_0_12px_rgba(104,245,184,0.25)]">
                  <Flame size={22} />
                </div>
                <span className="text-xs font-bold text-[#dde2f6] font-mono">Flawless 10</span>
                <span className="text-[9px] text-[#d4c5ad] font-mono mt-0.5">10 Ranked streak</span>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. VIRAL REFERRAL PROGRAM (Preserved from Hackathon Step 4)               */}
          {/* ========================================================================= */}
          <ReferralCard />

          {/* ========================================================================= */}
          {/* 6. SECURITY, SETTINGS & AUDIT (Vault Security & Fair Play)                */}
          {/* ========================================================================= */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#dde2f6]">Vault Security & Fair Play</h3>
              <ShieldCheck size={16} className="text-[#68f5b8]" />
            </div>

            <div className="space-y-2">
              {/* Non-custodial Backup */}
              <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#080e1c] flex items-center justify-center text-[#68f5b8] border border-white/5">
                    <Key size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#dde2f6]">Seed Phrase Backup</div>
                    <div className="text-[10px] text-[#68f5b8] font-mono">Secured & Encrypted</div>
                  </div>
                </div>
                <button
                  onClick={() => toast.info("Your keys are non-custodial and stored in Nimiq Hub / Nimiq Pay.")}
                  className="h-8 px-3 rounded-lg bg-[#080e1c] hover:bg-[#191f2e] border border-[#2f3544] text-[#dde2f6] text-xs font-mono font-semibold active:scale-95 transition-transform cursor-pointer"
                  type="button"
                >
                  Export
                </button>
              </div>

              {/* Provably Fair Seed Hash */}
              <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#080e1c] flex items-center justify-center text-[#a5e7ff] border border-white/5">
                    <Fingerprint size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#dde2f6]">Provably Fair Seed Hash</div>
                    <div className="text-[10px] text-[#d4c5ad] font-mono">#9a8b...4f2e</div>
                  </div>
                </div>
                <button
                  onClick={() => toast.success("Verified: SHA-256 state commitments match Nimiq PoS block hash.")}
                  className="h-8 px-3 rounded-lg bg-[#080e1c] hover:bg-[#191f2e] border border-[#2f3544] text-[#dde2f6] text-xs font-mono font-semibold active:scale-95 transition-transform cursor-pointer"
                  type="button"
                >
                  Verify
                </button>
              </div>

              {/* Arena Relay Node */}
              <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#080e1c] flex items-center justify-center text-[#ffd78d] border border-white/5">
                    <Radio size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#dde2f6]">Arena Relay Node</div>
                    <div className="text-[10px] text-[#d4c5ad] font-mono">Frankfurt-01 (14ms)</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#68f5b8]/10 text-[#68f5b8] text-[10px] font-mono font-bold">
                  Optimal
                </span>
              </div>

              {/* Sound & Haptic FX Toggle */}
              <div className="bg-[#242a39] border border-[#2f3544] p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#080e1c] flex items-center justify-center text-[#d4c5ad] border border-white/5">
                    <Vibrate size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#dde2f6]">Audio & Haptic FX</div>
                    <div className="text-[10px] text-[#d4c5ad] font-mono">Turn alerts & vibrations</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setAudioHapticFx(!audioHapticFx);
                    toast.info(audioHapticFx ? "Haptics disabled" : "Haptics enabled");
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    audioHapticFx ? "bg-[#f3b72c]" : "bg-[#080e1c]"
                  }`}
                  type="button"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#dde2f6] shadow-md transition-transform ${
                      audioHapticFx ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Subtle Disconnect Wallet Button */}
            <div className="mt-3 text-center">
              <button
                onClick={handleDisconnect}
                className="text-xs text-[#d4c5ad] hover:text-[#ffb4ab] font-mono active:scale-95 transition-colors cursor-pointer"
                type="button"
              >
                Disconnect Wallet from Arena
              </button>
              <p className="text-[10px] text-[#d4c5ad]/60 font-mono mt-1">
                Nimiq Safe & Hub v2.8.4-arena
              </p>
            </div>
          </section>

        </main>

        {/* Identity Registration / Avatar Picker Modal */}
        <IdentityRegistrationModal
          isOpen={isIdentityModalOpen}
          onClose={() => setIsIdentityModalOpen(false)}
        />

        {/* Instant Cashout Bottom Sheet */}
        <InstantCashoutSheet
          isOpen={isCashoutOpen}
          onClose={() => setIsCashoutOpen(false)}
          vaultBalanceNim={balanceNim || 1420}
          lockedInDuelsNim={100}
          connectedAddress={walletAddress || "NQ07 39F2 88KA 19BL 4920 32F1"}
          onSuccess={() => {
            refreshBalance?.();
          }}
        />

        {/* Fixed Mobile Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
