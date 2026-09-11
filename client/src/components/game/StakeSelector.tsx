import React, { useState, useEffect } from "react";
import { Coins, DollarSign } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { useNimiqPrice } from "@/lib/nimiq-price";

interface StakeSelectorProps {
  stakeNim: number;
  onChangeStakeNim: (nim: number) => void;
  minNim?: number;
  maxNim?: number;
  hideSummary?: boolean;
  hidePresets?: boolean;
}

const NIM_PRESETS = [25, 50, 100, 250, 500];
const USD_PRESETS = [5, 10, 25, 50, 100];

export function StakeSelector({
  stakeNim,
  onChangeStakeNim,
  minNim = 1,
  maxNim = 500_000,
  hideSummary = false,
  hidePresets = false,
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
    <div className="mobile-stake-card" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Dual-Currency Segmented Toggle */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(251, 248, 241, 0.1)",
          borderRadius: "10px",
          padding: "3px",
          gap: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => handleModeChange("NIM")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: mode === "NIM" ? "linear-gradient(135deg, rgba(230, 93, 35, 0.35), rgba(245, 158, 11, 0.25))" : "transparent",
            color: mode === "NIM" ? "#fbbf24" : "rgba(251, 248, 241, 0.6)",
            boxShadow: mode === "NIM" ? "0 2px 8px rgba(245, 158, 11, 0.2)" : "none",
            fontWeight: mode === "NIM" ? 700 : 500,
            fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            transition: "all 0.15s ease",
          }}
        >
          <Coins size={14} />
          <span>NIMIQ (NIM)</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange("USD")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            background: mode === "USD" ? "linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2))" : "transparent",
            color: mode === "USD" ? "#4ade80" : "rgba(251, 248, 241, 0.6)",
            boxShadow: mode === "USD" ? "0 2px 8px rgba(34, 197, 94, 0.2)" : "none",
            fontWeight: mode === "USD" ? 700 : 500,
            fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            transition: "all 0.15s ease",
          }}
        >
          <DollarSign size={14} />
          <span>USD ($)</span>
        </button>
      </div>

      {/* Main Stake Input Container */}
      <div
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(10, 15, 30, 0.95))",
          border: `1px solid ${mode === "NIM" ? "rgba(245, 158, 11, 0.35)" : "rgba(34, 197, 94, 0.35)"}`,
          borderRadius: "14px",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: "rgba(251, 248, 241, 0.6)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {mode === "NIM" ? "YOUR ENTRY STAKE" : "YOUR ENTRY STAKE (USD)"}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11.5px",
              color: mode === "NIM" ? "#fbbf24" : "#4ade80",
              fontWeight: 700,
            }}
          >
            {mode === "NIM"
              ? `≈ ${formatUsd(currentUsdValue)}`
              : `≈ ${formatNim(stakeNim)} NIM`}
          </span>
        </div>

        {/* Large Prominent Amount Input */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            background: "rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(251, 248, 241, 0.14)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 12px",
              background: mode === "NIM" ? "rgba(245, 158, 11, 0.15)" : "rgba(34, 197, 94, 0.15)",
              color: mode === "NIM" ? "#fbbf24" : "#4ade80",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 800,
              fontSize: "14px",
              height: "48px",
              borderRight: "1px solid rgba(251, 248, 241, 0.1)",
            }}
          >
            {mode === "NIM" ? "NIM" : "$"}
          </div>

          <input
            type="number"
            min={mode === "NIM" ? minNim : 0.1}
            max={mode === "NIM" ? maxNim : 5000}
            step={mode === "NIM" ? 1 : 1}
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            placeholder={mode === "NIM" ? "e.g. 50" : "e.g. 10"}
            style={{
              width: "100%",
              height: "48px",
              background: "transparent",
              border: "none",
              padding: "0 14px",
              color: "#ffffff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "20px",
              fontWeight: 800,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Quick Amount Preset Chips (Optional) */}
        {!hidePresets && (
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
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
                    flex: "1 0 auto",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${
                      isSelected
                        ? mode === "NIM"
                          ? "#f59e0b"
                          : "#22c55e"
                        : "rgba(251, 248, 241, 0.12)"
                    }`,
                    background: isSelected
                      ? mode === "NIM"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(34, 197, 94, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                    color: isSelected ? "#ffffff" : "rgba(251, 248, 241, 0.75)",
                    fontSize: "11px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {mode === "NIM" ? `${formatNim(preset)}` : `$${preset}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Live Exchange Rate Strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          background: "rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(251, 248, 241, 0.06)",
          borderRadius: "8px",
          fontSize: "10.5px",
          fontFamily: "'IBM Plex Mono', monospace",
          color: "rgba(251, 248, 241, 0.6)",
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
          {isLive ? "CoinGecko Live" : "Benchmark Rate"}
        </span>
        <span style={{ color: "rgba(251, 248, 241, 0.85)", fontWeight: 600 }}>
          1 NIM ≈ ${priceUsd.toFixed(6)} USD
        </span>
      </div>

      {/* Dynamic Pot & Distribution Summary */}
      {!hideSummary && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(251, 248, 241, 0.1)",
            borderRadius: "10px",
            padding: "10px 12px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          <div>
            <span style={{ display: "block", fontSize: "9.5px", color: "rgba(251, 248, 241, 0.5)", fontFamily: "'IBM Plex Mono', monospace" }}>
              MATCH POT (2X)
            </span>
            <strong style={{ fontSize: "14px", color: "#ffffff", fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatNim(totalPotNim)} NIM
            </strong>
            <span style={{ display: "block", fontSize: "9.5px", color: "rgba(251, 248, 241, 0.5)" }}>
              ≈ {formatUsd(nimToUsd(totalPotNim))}
            </span>
          </div>

          <div>
            <span style={{ display: "block", fontSize: "9.5px", color: "rgba(251, 248, 241, 0.5)", fontFamily: "'IBM Plex Mono', monospace" }}>
              WINNER TAKES (90%)
            </span>
            <strong style={{ fontSize: "14px", color: "#4ade80", fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatNim(winnerPayoutNim)} NIM
            </strong>
            <span style={{ display: "block", fontSize: "9.5px", color: "#86efac" }}>
              ≈ {formatUsd(winnerPayoutUsd)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
