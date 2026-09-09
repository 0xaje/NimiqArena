import React from "react";
import { Link } from "wouter";
import { Eye, Gamepad2, Coins, Play, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

export function ActiveTablesDirectory() {
  const { data: matches, isLoading } = trpc.match.listActiveMatches.useQuery(
    { limit: 6 },
    { refetchInterval: 4000 }
  );

  return (
    <section className="active-tables-section" id="active-tables">
      <div className="section-topline">
        <div>
          <p className="eyebrow">LIVE ARENA DIRECTORY</p>
          <h2 style={{ fontSize: "1.6rem", margin: "4px 0" }}>
            Watch active battles.
            <br />
            <em>Or join an open table.</em>
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "#22c55e" }}>
          <span className="status-dot ready" />
          <span>REAL-TIME MATCH RADAR</span>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
          Scanning active Arena tables…
        </div>
      ) : !matches || matches.length === 0 ? (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.5)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          <Gamepad2 size={32} color="#f59e0b" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px 0", color: "#f8fafc", fontSize: "1.1rem" }}>
            No live public matches at this second
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 16px" }}>
            Be the first on the table! Create a match, practice, or invite a friend.
          </p>
          <Link
            href="/games/ludo-league"
            className="primary-action"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              fontSize: "0.85rem",
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
            }}
          >
            <Play size={15} /> START LUDO TABLE
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {matches.map(m => {
            const isLive = m.status === "in_progress";
            const isBot = m.joinCode.startsWith("BOT");
            const isWagered = Boolean(m.paymentIntentId);
            const gameName = m.gameId.includes("connect") ? "Connect NIM" : "Ludo League";

            return (
              <div
                key={m.id}
                style={{
                  background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                  border: isLive
                    ? "1px solid rgba(56, 189, 248, 0.35)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  boxShadow: isLive ? "0 4px 20px rgba(56, 189, 248, 0.1)" : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: isLive
                          ? "rgba(56, 189, 248, 0.15)"
                          : "rgba(245, 158, 11, 0.15)",
                        color: isLive ? "#38bdf8" : "#fbbf24",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isLive ? "#38bdf8" : "#fbbf24",
                          boxShadow: isLive ? "0 0 8px #38bdf8" : "none",
                        }}
                      />
                      {isLive ? "LIVE IN PROGRESS" : "WAITING FOR PLAYER"}
                    </span>

                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: isWagered ? "#eab308" : "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {isWagered ? (
                        <>
                          <Coins size={12} /> WAGER POT
                        </>
                      ) : (
                        "FREE TABLE"
                      )}
                    </span>
                  </div>

                  <h4 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "#f8fafc" }}>
                    {gameName}
                  </h4>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Table ID: <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>{m.id.slice(0, 10)}</span>
                    {isBot && " • vs Arena Bot"}
                  </div>
                </div>

                <Link
                  href={`/matches/${m.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    background: isLive
                      ? "rgba(56, 189, 248, 0.15)"
                      : "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: isLive ? "1px solid rgba(56, 189, 248, 0.4)" : "none",
                    color: isLive ? "#38bdf8" : "#ffffff",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isLive ? (
                    <>
                      <Eye size={15} /> WATCH LIVE
                    </>
                  ) : (
                    <>
                      <Play size={15} /> JOIN TABLE
                    </>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
