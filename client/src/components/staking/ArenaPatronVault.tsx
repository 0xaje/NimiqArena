import React, { useState } from "react";
import {
  Coins,
  DollarSign,
  Gem,
  Lock,
  Sparkles,
  Trophy,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Gift,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function ArenaPatronVault() {
  const { priceUsd, isLive, nimToUsd, usdToNim, formatUsd } = useNimiqPrice();
  const authQuery = trpc.auth.me.useQuery();
  const user = authQuery.data;

  // Staking state (interactive with local storage persistence for realism)
  const [stakedNim, setStakedNim] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nimiq_arena_patron_stake");
      if (saved) return Number(saved) || 0;
    }
    return 1000; // Default demo staker
  });

  const [inputAmount, setInputAmount] = useState<string>("5000");
  const [currencyMode, setCurrencyMode] = useState<"NIM" | "USD">("NIM");
  const [lockTermDays, setLockTermDays] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute Current Patron Tier
  const getTierInfo = (amount: number) => {
    if (amount >= 100_000) {
      return {
        name: "Diamond Whale",
        icon: "💎",
        color: "#38bdf8",
        apy: 8.0,
        perks: "First-Look Beta Access • Zero Private Table Fees • Patron VIP Spotlight",
      };
    }
    if (amount >= 25_000) {
      return {
        name: "Gold Patron",
        icon: "🥇",
        color: "#fbbf24",
        apy: 7.0,
        perks: "Free Monthly Tournament Pass • Verified Gold Halo • Priority Alpha Access",
      };
    }
    if (amount >= 5_000) {
      return {
        name: "Silver Patron",
        icon: "🥈",
        color: "#cbd5e1",
        apy: 6.5,
        perks: "Match Fee Discount • Silver Badge in Match Rooms • Monthly Payouts",
      };
    }
    if (amount >= 1_000) {
      return {
        name: "Bronze Patron",
        icon: "🥉",
        color: "#f97316",
        apy: 6.0,
        perks: "Verified Patron Badge • 6.0% Monthly Yield • Community Recognition",
      };
    }
    return {
      name: "Supporter",
      icon: "🌱",
      color: "#94a3b8",
      apy: 5.0,
      perks: "Base Nimiq PoS Consensus Yield (5.0% APY)",
    };
  };

  const currentTier = getTierInfo(stakedNim);

  // Yield Calculations
  const annualYieldNim = stakedNim * (currentTier.apy / 100);
  const monthlyYieldNim = annualYieldNim / 12;
  const monthlyYieldUsd = nimToUsd(monthlyYieldNim);

  const handleStakeAction = (isDeposit: boolean) => {
    const rawVal = parseFloat(inputAmount);
    if (isNaN(rawVal) || rawVal <= 0) {
      toast.error("Enter a valid stake amount.");
      return;
    }

    const nimDelta = currencyMode === "NIM" ? Math.round(rawVal) : usdToNim(rawVal);

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (isDeposit) {
        const nextStake = stakedNim + nimDelta;
        setStakedNim(nextStake);
        localStorage.setItem("nimiq_arena_patron_stake", String(nextStake));
        toast.success(`Staked ${formatNim(nimDelta)} NIM into Patron Vault!`, {
          description: `You are now a verified ${getTierInfo(nextStake).name}!`,
        });
      } else {
        if (nimDelta > stakedNim) {
          toast.error("Insufficient staked balance.");
          return;
        }
        const nextStake = stakedNim - nimDelta;
        setStakedNim(nextStake);
        localStorage.setItem("nimiq_arena_patron_stake", String(nextStake));
        toast.info(`Unstaked ${formatNim(nimDelta)} NIM to wallet.`);
      }
    }, 450);
  };

  return (
    <section
      id="vault"
      style={{
        background: "linear-gradient(145deg, #0f172a 0%, #080d19 100%)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderRadius: "20px",
        padding: "28px",
        color: "#f8fafc",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(245, 158, 11, 0.12)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative cyber line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, transparent, #fbbf24, #f59e0b, transparent)",
        }}
      />

      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "18px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: "#fbbf24",
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                padding: "3px 8px",
                borderRadius: "4px",
                letterSpacing: "0.08em",
              }}
            >
              ARENA PATRON VAULT
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                color: "#22c55e",
                background: "rgba(34, 197, 94, 0.12)",
                padding: "3px 8px",
                borderRadius: "4px",
                fontWeight: 600,
              }}
            >
              MONTHLY REVENUE SHARE
            </span>
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px", color: "#ffffff" }}>
            Stake NIM. Earn Monthly Yield &amp; VIP Priority.
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(251, 248, 241, 0.75)", margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
            Leave your match winnings in the Arena Vault instead of cashing out. Earn native Nimiq PoS block rewards (~5%) plus dividends from the 8% Arena game fee pool.
          </p>
        </div>

        {/* Current User Tier Badge */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            border: `1px solid ${currentTier.color}`,
            borderRadius: "12px",
            padding: "10px 16px",
            textAlign: "right",
          }}
        >
          <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace", display: "block" }}>
            YOUR PATRON STATUS
          </span>
          <strong style={{ fontSize: "16px", color: currentTier.color, display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
            <span>{currentTier.icon}</span> {currentTier.name}
          </strong>
          <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
            {currentTier.apy}% APY Active
          </span>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Left Card: Stake / Deposit Controls */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              TOTAL STAKED IN VAULT
            </span>
            <span style={{ fontSize: "12px", color: "#38bdf8", fontFamily: "'IBM Plex Mono', monospace" }}>
              ≈ {formatUsd(nimToUsd(stakedNim))}
            </span>
          </div>

          <div style={{ fontSize: "28px", fontWeight: 800, color: "#ffffff", fontFamily: "'IBM Plex Mono', monospace" }}>
            {formatNim(stakedNim)} <span style={{ fontSize: "16px", color: "#fbbf24" }}>NIM</span>
          </div>

          {/* Mode Switcher */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              padding: "3px",
              gap: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrencyMode("NIM")}
              style={{
                flex: 1,
                padding: "6px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background: currencyMode === "NIM" ? "rgba(245, 158, 11, 0.3)" : "transparent",
                color: currencyMode === "NIM" ? "#fbbf24" : "rgba(255, 255, 255, 0.7)",
                fontSize: "11px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
              }}
            >
              NIM MODE
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode("USD")}
              style={{
                flex: 1,
                padding: "6px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background: currencyMode === "USD" ? "rgba(34, 197, 94, 0.3)" : "transparent",
                color: currencyMode === "USD" ? "#4ade80" : "rgba(255, 255, 255, 0.7)",
                fontSize: "11px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 700,
              }}
            >
              USD ($) MODE
            </button>
          </div>

          {/* Input Field */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "15px",
                fontWeight: 700,
                color: currencyMode === "NIM" ? "#fbbf24" : "#4ade80",
              }}
            >
              {currencyMode === "NIM" ? "NIM" : "$"}
            </span>
            <input
              type="number"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value)}
              placeholder="Amount to stake"
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "10px 12px 10px 52px",
                color: "#ffffff",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "16px",
                fontWeight: 700,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => handleStakeAction(true)}
              disabled={isProcessing}
              style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                color: "#18202c",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Coins size={15} /> STAKE TO EARN
            </button>
            <button
              type="button"
              onClick={() => handleStakeAction(false)}
              disabled={isProcessing || stakedNim <= 0}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                padding: "12px",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "13px",
                cursor: stakedNim > 0 ? "pointer" : "not-allowed",
              }}
            >
              UNSTAKE
            </button>
          </div>
        </div>

        {/* Right Card: Earnings Breakdown & Payout Projection */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              PROJECTED MONTHLY REVENUE SHARE
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace" }}>
                +{formatNim(monthlyYieldNim)} NIM
              </span>
              <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.6)" }}>
                / month ({formatUsd(monthlyYieldUsd)})
              </span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Native PoS Validator Yield:</span>
              <span style={{ color: "#ffffff", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>5.0% APY</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Arena Match Fee Pool Share:</span>
              <span style={{ color: "#fbbf24", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                +{(currentTier.apy - 5.0).toFixed(1)}% APY
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
              <span style={{ color: "#ffffff", fontWeight: 700 }}>Total Effective APY:</span>
              <span style={{ color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800 }}>
                {currentTier.apy}% APY
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>
            <CheckCircle2 size={14} color="#22c55e" />
            <span>Monthly dividends credited on the 1st of every month automatically on-chain.</span>
          </div>
        </div>
      </div>

      {/* Patron Tiers & First-Look Perks Grid */}
      <div>
        <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "#fbbf24", fontFamily: "'IBM Plex Mono', monospace" }}>
          PATRON TIERS &amp; EXCLUSIVE OPPORTUNITIES
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {[
            { tier: "Bronze", min: "1,000 NIM", apy: "6.0%", icon: "🥉", perk: "Patron Badge in Matches • 6.0% APY" },
            { tier: "Silver", min: "5,000 NIM", apy: "6.5%", icon: "🥈", perk: "Match Fee Discounts • 6.5% APY" },
            { tier: "Gold", min: "25,000 NIM", apy: "7.0%", icon: "🥇", perk: "Free Monthly Tournament Pass • 7.0% APY" },
            { tier: "Diamond Whale", min: "100,000+ NIM", apy: "8.0%", icon: "💎", perk: "First-Look Beta Access • Leaderboard Spotlight • 8.0% APY" },
          ].map(t => {
            const isCurrent = currentTier.name.includes(t.tier);
            return (
              <div
                key={t.tier}
                style={{
                  background: isCurrent ? "rgba(245, 158, 11, 0.12)" : "rgba(0, 0, 0, 0.25)",
                  border: `1px solid ${isCurrent ? "#fbbf24" : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: isCurrent ? "#fbbf24" : "#ffffff" }}>
                    {t.icon} {t.tier}
                  </span>
                  <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
                    {t.apy}
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Min: {t.min}
                </span>
                <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", margin: "4px 0 0", lineHeight: 1.4 }}>
                  {t.perk}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
