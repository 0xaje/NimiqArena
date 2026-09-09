import React, { useState } from "react";
import { Trophy, X, Users, Coins, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { formatNim } from "@shared/game/pot-distribution";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";

interface TournamentCupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterCup?: (buyInNim: number) => void;
}

interface BracketMatch {
  id: string;
  round: "quarter" | "semi" | "final";
  p1: { name: string; score?: number; isWinner?: boolean; avatar: string };
  p2: { name: string; score?: number; isWinner?: boolean; avatar: string };
  status: "completed" | "live" | "scheduled";
}

export function TournamentCupModal({
  isOpen,
  onClose,
  onEnterCup,
}: TournamentCupModalProps) {
  useModalBackHandler(isOpen, onClose);
  const [buyIn, setBuyIn] = useState<number>(100);
  const [registered, setRegistered] = useState<boolean>(false);

  const totalPot = buyIn * 8;
  const firstPrize = totalPot * 0.65;
  const secondPrize = totalPot * 0.25;
  const thirdPrize = totalPot * 0.1;

  const sampleMatches: BracketMatch[] = [
    // Quarter finals
    {
      id: "q1",
      round: "quarter",
      p1: { name: "You (Challenger)", score: 8, isWinner: true, avatar: "YC" },
      p2: { name: "NimiqNinja", score: 5, isWinner: false, avatar: "NN" },
      status: "completed",
    },
    {
      id: "q2",
      round: "quarter",
      p1: { name: "Albatross_99", score: 8, isWinner: true, avatar: "A9" },
      p2: { name: "CryptoKing", score: 6, isWinner: false, avatar: "CK" },
      status: "completed",
    },
    {
      id: "q3",
      round: "quarter",
      p1: { name: "BlockMaster", score: 8, isWinner: true, avatar: "BM" },
      p2: { name: "DiceRoller42", score: 3, isWinner: false, avatar: "DR" },
      status: "completed",
    },
    {
      id: "q4",
      round: "quarter",
      p1: { name: "SpeedyGonzales", score: 4, isWinner: false, avatar: "SG" },
      p2: { name: "SatoshiDream", score: 8, isWinner: true, avatar: "SD" },
      status: "completed",
    },
    // Semi finals
    {
      id: "s1",
      round: "semi",
      p1: { name: "You (Challenger)", score: undefined, isWinner: undefined, avatar: "YC" },
      p2: { name: "Albatross_99", score: undefined, isWinner: undefined, avatar: "A9" },
      status: "live",
    },
    {
      id: "s2",
      round: "semi",
      p1: { name: "BlockMaster", score: undefined, isWinner: undefined, avatar: "BM" },
      p2: { name: "SatoshiDream", score: undefined, isWinner: undefined, avatar: "SD" },
      status: "scheduled",
    },
    // Grand Final
    {
      id: "f1",
      round: "final",
      p1: { name: "Semi-Final 1 Winner", avatar: "TBD" },
      p2: { name: "Semi-Final 2 Winner", avatar: "TBD" },
      status: "scheduled",
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #151a28 0%, #0a0e17 100%)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "26px",
          color: "#f8fafc",
          boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, letterSpacing: "0.5px" }}>
                  NIMIQ CUP TOURNAMENT
                </h2>
                <span
                  style={{
                    background: "rgba(234, 179, 8, 0.2)",
                    color: "#fde047",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  8-PLAYER SIT & GO
                </span>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                Knockout Bracket • Single Elimination • On-Chain Escrow Pot
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Prize Pool Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(0,0,0,0.3))",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#fbbf24", fontWeight: 700, display: "block" }}>
              1ST PLACE (65%)
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#fef08a" }}>{formatNim(firstPrize)} NIM</strong>
          </div>
          <div
            style={{
              background: "linear-gradient(145deg, rgba(148, 163, 184, 0.15), rgba(0,0,0,0.3))",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#cbd5e1", fontWeight: 700, display: "block" }}>
              2ND PLACE (25%)
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#f1f5f9" }}>{formatNim(secondPrize)} NIM</strong>
          </div>
          <div
            style={{
              background: "linear-gradient(145deg, rgba(180, 83, 9, 0.15), rgba(0,0,0,0.3))",
              border: "1px solid rgba(180, 83, 9, 0.25)",
              borderRadius: "12px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700, display: "block" }}>
              3RD/4TH PLACE (10%)
            </span>
            <strong style={{ fontSize: "1.2rem", color: "#fed7aa" }}>{formatNim(thirdPrize)} NIM</strong>
          </div>
        </div>

        {/* Interactive Bracket Visualizer */}
        <div style={{ marginBottom: "22px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "10px" }}>
            LIVE BRACKET PROGRESSION
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "12px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            {/* Column 1: Quarter Finals */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                QUARTER-FINALS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sampleMatches.filter(m => m.round === "quarter").map(m => (
                  <div
                    key={m.id}
                    style={{
                      background: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "6px 8px",
                      fontSize: "0.72rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", color: m.p1.isWinner ? "#4ade80" : "#94a3b8" }}>
                      <span>{m.p1.avatar} {m.p1.name}</span>
                      <span>{m.p1.score ?? "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: m.p2.isWinner ? "#4ade80" : "#94a3b8" }}>
                      <span>{m.p2.avatar} {m.p2.name}</span>
                      <span>{m.p2.score ?? "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Semi Finals */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600, marginBottom: "8px" }}>
                SEMI-FINALS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "14px" }}>
                {sampleMatches.filter(m => m.round === "semi").map(m => (
                  <div
                    key={m.id}
                    style={{
                      background: m.status === "live" ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.8)",
                      border: m.status === "live" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "8px 10px",
                      fontSize: "0.72rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600 }}>{m.p1.avatar} {m.p1.name}</span>
                      {m.status === "live" && <span style={{ color: "#38bdf8", fontSize: "0.65rem" }}>● LIVE</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8" }}>{m.p2.avatar} {m.p2.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Grand Final */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600, marginBottom: "8px" }}>
                GRAND FINAL
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "80%" }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(0,0,0,0.5))",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "0.75rem",
                    textAlign: "center",
                  }}
                >
                  <Trophy size={20} color="#f59e0b" style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontWeight: 700, color: "#fef08a", marginBottom: "4px" }}>
                    CHAMPIONSHIP MATCH
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#cbd5e1" }}>
                    Winner takes 65% of pot ({formatNim(firstPrize)} NIM)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration CTA */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>BUY-IN LEVEL:</span>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              {[20, 50, 100, 250].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBuyIn(amt)}
                  style={{
                    background: buyIn === amt ? "#f59e0b" : "rgba(255, 255, 255, 0.08)",
                    color: buyIn === amt ? "#000000" : "#cbd5e1",
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {amt} NIM
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setRegistered(true);
              onEnterCup?.(buyIn);
            }}
            disabled={registered}
            style={{
              background: registered
                ? "#22c55e"
                : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: registered ? "default" : "pointer",
              boxShadow: "0 4px 15px rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {registered ? (
              <>
                <CheckCircle2 size={16} /> REGISTERED (SEAT RESERVED)
              </>
            ) : (
              <>
                <Sparkles size={16} /> ENTER 8-PLAYER CUP ({buyIn} NIM)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
