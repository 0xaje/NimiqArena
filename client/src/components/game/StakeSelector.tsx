import React, { useState, useEffect } from "react";
import { Coins, DollarSign, ArrowRightLeft, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";

interface StakeSelectorProps {
  stakeNim: number;
  onChangeStakeNim: (nim: number) => void;
  minNim?: number;
  maxNim?: number;
  hideSummary?: boolean;
}

const NIM_PRESETS = [50, 100, 250, 500, 1_000];
const USD_PRESETS = [10, 20, 50, 100, 250];

export function StakeSelector({
  stakeNim,
  onChangeStakeNim,
  minNim = 1,
  maxNim = 500_000,
  hideSummary = false,
}: StakeSelectorProps) {
  const { priceUsd, isLive, nimToUsd, usdToNim, formatUsd } = useNimiqPrice();
  const [mode, setMode] = useState<"NIM" | "USD">("NIM");
  const [inputValue, setInputValue] = useState<string>(String(stakeNim));

  // Sync input string when external stakeNim changes and not currently typing
  useEffect(() => {
    if (mode === "NIM") {
      setInputValue(String(stakeNim));
    } else {
      const usdVal = nimToUsd(stakeNim);
      setInputValue(usdVal > 0 ? (Math.round(usdVal * 100) / 100).toString() : "10");
    }
  }, [stakeNim, mode, priceUsd]);

  const handleModeChange = (newMode: "NIM" | "USD") => {
    if (newMode === mode) return;
    setMode(newMode);
    if (newMode === "USD") {
      const usdVal = Math.round(nimToUsd(stakeNim) * 100) / 100;
      setInputValue(usdVal > 0 ? String(usdVal) : "10");
    } else {
      setInputValue(String(stakeNim));
    }
  };

  const handleInputChange = (raw: string) => {
    setInputValue(raw);
    const num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      return;
    }

    if (mode === "NIM") {
      const roundedNim = Math.min(maxNim, Math.max(minNim, Math.round(num)));
      onChangeStakeNim(roundedNim);
    } else {
      const calculatedNim = usdToNim(num);
      const boundedNim = Math.min(maxNim, Math.max(minNim, calculatedNim));
      onChangeStakeNim(boundedNim);
    }
  };

  const handlePresetClick = (val: number) => {
    if (mode === "NIM") {
      setInputValue(String(val));
      onChangeStakeNim(val);
    } else {
      setInputValue(String(val));
      const calculatedNim = usdToNim(val);
      onChangeStakeNim(Math.min(maxNim, Math.max(minNim, calculatedNim)));
    }
  };

  const currentUsdValue = nimToUsd(stakeNim);
  const totalPotNim = stakeNim * 2;
  const winnerPayoutNim = totalPotNim * 0.9;
  const winnerPayoutUsd = nimToUsd(winnerPayoutNim);

  return (
    <div className="custom-stake-selector" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Dual-Currency Mode Segmented Switcher */}
      <div
        style={{
          display: "flex",
          background: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(251, 248, 241, 0.12)",
          borderRadius: "8px",
          padding: "3px",
          gap: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => handleModeChange("NIM")}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            background: mode === "NIM" ? "rgba(230, 93, 35, 0.25)" : "transparent",
            color: mode === "NIM" ? "var(--orange)" : "var(--paper-bright)",
            boxShadow: mode === "NIM" ? "0 0 10px rgba(230, 93, 35, 0.3)" : "none",
            fontWeight: mode === "NIM" ? 700 : 500,
            fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            transition: "all 0.15s ease",
          }}
        >
          <Coins size={14} />
          <span>NIM (NIMIQ)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange("USD")}
          style={{
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            background: mode === "USD" ? "rgba(34, 197, 94, 0.22)" : "transparent",
            color: mode === "USD" ? "#4ade80" : "var(--paper-bright)",
            boxShadow: mode === "USD" ? "0 0 10px rgba(34, 197, 94, 0.3)" : "none",
            fontWeight: mode === "USD" ? 700 : 500,
            fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            transition: "all 0.15s ease",
          }}
        >
          <DollarSign size={14} />
          <span>USD ($ DOLLAR)</span>
        </button>
      </div>

      {/* Main Custom Stake Input Box */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(18, 40, 63, 0.6), rgba(10, 20, 32, 0.8))",
          border: "1px solid rgba(251, 248, 241, 0.15)",
          borderRadius: "10px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "var(--muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {mode === "NIM" ? "CUSTOM NIM COMMITMENT" : "CUSTOM USD COMMITMENT"}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: mode === "NIM" ? "var(--orange)" : "#4ade80",
              fontWeight: 600,
            }}
          >
            {mode === "NIM"
              ? `≈ ${formatUsd(currentUsdValue)}`
              : `≈ ${formatNim(stakeNim)} NIM`}
          </span>
        </div>

        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "18px",
              fontWeight: 700,
              color: mode === "NIM" ? "var(--orange)" : "#4ade80",
            }}
          >
            {mode === "NIM" ? "NIM" : "$"}
          </span>
          <input
            type="number"
            min={mode === "NIM" ? minNim : 0.1}
            max={mode === "NIM" ? maxNim : 5000}
            step={mode === "NIM" ? 1 : 1}
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            placeholder={mode === "NIM" ? "e.g. 50, 100, 500" : "e.g. 10, 20, 50"}
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(251, 248, 241, 0.2)",
              borderRadius: "8px",
              padding: "12px 14px 12px 64px",
              color: "#ffffff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "20px",
              fontWeight: 700,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Quick Amount Preset Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center", marginRight: "4px" }}>
            Quick:
          </span>
          {(mode === "NIM" ? NIM_PRESETS : USD_PRESETS).map(preset => {
            const isSelected =
              mode === "NIM"
                ? stakeNim === preset
                : Math.abs(currentUsdValue - preset) < 0.5;

            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${isSelected ? (mode === "NIM" ? "var(--orange)" : "#4ade80") : "rgba(251, 248, 241, 0.12)"}`,
                  background: isSelected
                    ? mode === "NIM"
                      ? "rgba(230, 93, 35, 0.25)"
                      : "rgba(34, 197, 94, 0.25)"
                    : "rgba(255, 255, 255, 0.04)",
                  color: isSelected ? "#ffffff" : "rgba(251, 248, 241, 0.8)",
                  fontSize: "11px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {mode === "NIM" ? `${formatNim(preset)} NIM` : `$${preset}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Real-Time Exchange Rate Indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(251, 248, 241, 0.08)",
          borderRadius: "6px",
          fontSize: "11px",
          fontFamily: "'IBM Plex Mono', monospace",
          color: "var(--muted)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isLive ? "#22c55e" : "#eab308",
              boxShadow: `0 0 6px ${isLive ? "#22c55e" : "#eab308"}`,
            }}
          />
          {isLive ? "LIVE COINGECKO RATE" : "BENCHMARK RATE"}
        </span>
        <span style={{ color: "rgba(251, 248, 241, 0.9)" }}>
          1 NIM ≈ ${priceUsd.toFixed(6)} USD
        </span>
      </div>

      {/* Dynamic Pot & Distribution Summary */}
      {!hideSummary && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(251, 248, 241, 0.1)",
            borderRadius: "8px",
            padding: "12px 14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}
        >
          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              TOTAL MATCH POT (2X)
            </span>
            <strong style={{ fontSize: "15px", color: "#ffffff", fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatNim(totalPotNim)} NIM
            </strong>
            <span style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
              ≈ {formatUsd(nimToUsd(totalPotNim))}
            </span>
          </div>

          <div>
            <span style={{ display: "block", fontSize: "10px", color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>
              WINNER RECEIVES (90%)
            </span>
            <strong style={{ fontSize: "15px", color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatNim(winnerPayoutNim)} NIM
            </strong>
            <span style={{ display: "block", fontSize: "10px", color: "#86efac" }}>
              ≈ {formatUsd(winnerPayoutUsd)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
