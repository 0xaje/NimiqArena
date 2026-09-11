import {
  ArrowLeft,
  CircleDot,
  Copy,
  Dices,
  Gamepad2,
  KeyRound,
  PlusCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Coins,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function JoinMatch() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createWageredMatch = trpc.match.createWageredMatch.useMutation();
  const join = trpc.match.joinByCode.useMutation();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [matchMode, setMatchMode] = useState<"free" | "wager">("free");
  const [selectedStake, setSelectedStake] = useState<number>(10);
  const [selectedGame, setSelectedGame] = useState<"ludo-league" | "connect-four">("ludo-league");
  const [joinCode, setJoinCode] = useState("");
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
      refetchInterval: 1_200,
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
      if (codeFromUrl) {
        const clean = codeFromUrl.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
        setJoinCode(clean);
        setActiveTab("join");
        toast.info("Invite code detected from link", { description: `Code: ${clean}` });
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
      await ensureSession();
      toast.loading("Generating private game room…", { id: "create-room" });
      if (matchMode === "wager") {
        const res = await createWageredMatch.mutateAsync({
          gameSlug: selectedGame,
          stakeNim: selectedStake,
        });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: true,
          stakeNim: res.stakeNim,
        });
        toast.success("Wager match room created!", {
          id: "create-room",
          description: `Invite Code: ${res.joinCode} (${res.stakeNim} NIM stake)`,
        });
      } else {
        const res = await createChallenge.mutateAsync({
          gameSlug: selectedGame,
        });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: false,
          stakeNim: 0,
        });
        toast.success("Game room created!", {
          id: "create-room",
          description: `Invite Code: ${res.joinCode}. Share with your friend!`,
        });
      }
    } catch (err) {
      toast.error("Failed to create room", {
        id: "create-room",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  async function handleJoinSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (!user) {
        toast.info("Signing in as guest player…");
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 2 (Guest)",
        });
        if (loginRes.token) {
          sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
          localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
        }
        await utils.auth.me.invalidate();
      }
      const result = await join.mutateAsync({
        joinCode: joinCode.trim().toUpperCase(),
      });
      toast.success("Match joined", {
        description: `You joined as Player ${result.seat + 1}.`,
      });
      navigate(`/matches/${result.id}`);
    } catch (error) {
      toast.error("Join request rejected", {
        description:
          error instanceof Error
            ? error.message
            : "The invite code is invalid or the match has expired.",
      });
    }
  }

  const shareableUrl = createdMatch
    ? `${window.location.origin}/join?code=${createdMatch.joinCode}`
    : "";

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={15} /> Arena home
        </Link>
        <span className="detail-brand">NIMIQ ARENA / PLAY WITH FRIENDS</span>
        <span className="detail-state">
          {user ? `PLAYING AS: ${user.name || "PLAYER"}` : "GUEST MODE"}
        </span>
      </header>

      <main className="detail-main join-main" style={{ maxWidth: "680px", margin: "0 auto" }}>
        <section className="room-hero" style={{ textAlign: "center", marginBottom: "24px" }}>
          <span className="stamp orange">DIRECT MULTIPLAYER</span>
          <p className="eyebrow">PLAY WITH A FRIEND</p>
          <h1>
            Create or Join
            <br />
            <em>a friend's game.</em>
          </h1>
          <p className="detail-lede" style={{ maxWidth: "540px", margin: "0 auto" }}>
            Generate a private match code to send to your friend, or enter an invite code you received to join immediately.
          </p>
        </section>

        {/* Mode Switcher Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            padding: "6px",
            borderRadius: "14px",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <button
            onClick={() => setActiveTab("create")}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "create" ? "#EC9918" : "transparent",
              color: activeTab === "create" ? "#111" : "rgba(255, 255, 255, 0.7)",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <PlusCircle size={16} /> 1. Create Room (Host)
          </button>
          <button
            onClick={() => setActiveTab("join")}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: activeTab === "join" ? "#EC9918" : "transparent",
              color: activeTab === "join" ? "#111" : "rgba(255, 255, 255, 0.7)",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <KeyRound size={16} /> 2. Join with Code
          </button>
        </div>

        {/* Tab 1: Create Game Room */}
        {activeTab === "create" && (
          <div className="join-card" style={{ padding: "28px" }}>
            {!createdMatch ? (
              <form onSubmit={handleCreateRoom} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label className="card-label" style={{ display: "block", marginBottom: "10px", color: "#EC9918" }}>
                    SELECT ARENA GAME
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedGame("ludo-league")}
                      style={{
                        padding: "16px 12px",
                        borderRadius: "12px",
                        backgroundColor: selectedGame === "ludo-league" ? "rgba(236, 153, 24, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        border: selectedGame === "ludo-league" ? "2px solid #EC9918" : "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Dices size={28} color="#EC9918" />
                      <strong style={{ color: "#fff", fontSize: "14px" }}>Ludo League</strong>
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.55)" }}>Classic Board Game</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGame("connect-four")}
                      style={{
                        padding: "16px 12px",
                        borderRadius: "12px",
                        backgroundColor: selectedGame === "connect-four" ? "rgba(236, 153, 24, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        border: selectedGame === "connect-four" ? "2px solid #EC9918" : "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CircleDot size={28} color="#00f0ff" />
                      <strong style={{ color: "#fff", fontSize: "14px" }}>Connect NIM</strong>
                      <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.55)" }}>Tactical 4-in-a-Row</span>
                    </button>
                  </div>
                </div>

                {/* Match Mode Selector: Free Friendly vs Wager NIM */}
                <div style={{ marginBottom: "16px" }}>
                  <label className="card-label" style={{ marginBottom: "10px", display: "block" }}>
                    2. SELECT MATCH MODE
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <button
                      type="button"
                      onClick={() => setMatchMode("free")}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: `1.5px solid ${matchMode === "free" ? "#22c55e" : "rgba(255, 255, 255, 0.1)"}`,
                        backgroundColor: matchMode === "free" ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        color: matchMode === "free" ? "#4ade80" : "#94a3b8",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "14px" }}>
                        <Gamepad2 size={16} /> Free Friendly
                      </div>
                      <span style={{ fontSize: "11px", opacity: 0.8 }}>0 NIM · Casual play</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMatchMode("wager")}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        border: `1.5px solid ${matchMode === "wager" ? "#EC9918" : "rgba(255, 255, 255, 0.1)"}`,
                        backgroundColor: matchMode === "wager" ? "rgba(236, 153, 24, 0.15)" : "rgba(255, 255, 255, 0.04)",
                        color: matchMode === "wager" ? "#EC9918" : "#94a3b8",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "14px" }}>
                        <Coins size={16} /> Wager NIM
                      </div>
                      <span style={{ fontSize: "11px", opacity: 0.8 }}>90% Payout to Winner</span>
                    </button>
                  </div>

                  {matchMode === "wager" && (
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(236, 153, 24, 0.08)",
                        border: "1px solid rgba(236, 153, 24, 0.25)",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#EC9918", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span>STAKE PER PLAYER</span>
                        <span>POT: {(selectedStake * 2).toLocaleString()} NIM</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {[10, 50, 100, 500, 1000, 5000, 10000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setSelectedStake(amt)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: `1px solid ${selectedStake === amt ? "#EC9918" : "rgba(255, 255, 255, 0.12)"}`,
                              backgroundColor: selectedStake === amt ? "rgba(236, 153, 24, 0.25)" : "rgba(0, 0, 0, 0.3)",
                              color: selectedStake === amt ? "#ffffff" : "#94a3b8",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {amt >= 1000 ? `${(amt / 1000).toFixed(0)}k` : amt} NIM
                          </button>
                        ))}
                      </div>

                      {/* Custom Stake Numeric Input */}
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                          Custom Stake (1 – 10,000,000 NIM)
                        </label>
                        <div style={{ display: "flex", alignItems: "center", background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(236, 153, 24, 0.35)", borderRadius: "8px", overflow: "hidden" }}>
                          <span style={{ padding: "0 10px", color: "#EC9918", fontWeight: 700, fontSize: "12px", fontFamily: "IBM Plex Mono, monospace" }}>
                            NIM
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={10000000}
                            value={selectedStake || ""}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setSelectedStake(isNaN(val) ? 0 : Math.min(10000000, Math.max(0, val)));
                            }}
                            placeholder="e.g. 1000 or 1000000"
                            style={{
                              flex: 1,
                              background: "transparent",
                              border: "none",
                              color: "#ffffff",
                              padding: "8px 10px",
                              fontSize: "14px",
                              fontWeight: 700,
                              fontFamily: "IBM Plex Mono, monospace",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.65)", lineHeight: "1.4", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px" }}>
                        🏆 <strong>Winner takes 90%</strong> ({(selectedStake * 2 * 0.9).toLocaleString(undefined, { maximumFractionDigits: 2 })} NIM) on-chain directly to Nimiq wallet.
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.75)",
                    lineHeight: 1.4,
                  }}
                >
                  <strong style={{ color: "#EC9918", display: "block", marginBottom: "4px" }}>
                    Instant Peer-to-Peer Invite:
                  </strong>
                  Generating a room creates an authoritative 8-character token. Send the token or 1-click link to your friend on Telegram, WhatsApp, or Discord to play immediately!
                </div>

                <button
                  type="submit"
                  disabled={createChallenge.isPending || createWageredMatch.isPending || (matchMode === "wager" && selectedStake < 1)}
                  className="primary-action"
                  style={{
                    background: matchMode === "wager"
                      ? "linear-gradient(135deg, #EC9918, #d4820a)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    padding: "15px",
                    fontWeight: 800,
                    fontSize: "15px",
                  }}
                >
                  {createChallenge.isPending || createWageredMatch.isPending
                    ? "Generating Room…"
                    : matchMode === "wager"
                    ? `Create ${selectedStake.toLocaleString()} NIM Wager Room`
                    : "Generate Free Room & Invite Code"}
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Sparkles size={36} color="#EC9918" />
                </div>
                <div>
                  <span className="card-label" style={{ color: "#EC9918" }}>YOUR PRIVATE INVITE CODE</span>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: 900,
                      letterSpacing: "4px",
                      color: "#EC9918",
                      fontFamily: "IBM Plex Mono, monospace",
                      padding: "14px",
                      backgroundColor: "rgba(236, 153, 24, 0.1)",
                      borderRadius: "12px",
                      border: "1px dashed #EC9918",
                      margin: "10px 0 6px 0",
                    }}
                  >
                    {createdMatch.joinCode}
                  </div>
                  {createdMatch.isWagered && (
                    <div style={{ margin: "4px 0 10px 0", fontSize: "13px", color: "#EC9918", fontWeight: 700 }}>
                      ⚡ Wager: {createdMatch.stakeNim} NIM (Pot: {(createdMatch.stakeNim || 0) * 2} NIM · 90% Winner Payout)
                    </div>
                  )}
                  <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)" }}>
                    Send this code to your friend or share the direct link below:
                  </p>
                </div>

                {/* Share Actions */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdMatch.joinCode);
                      toast.success("Invite code copied to clipboard!");
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <Copy size={15} /> Copy Code
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareableUrl);
                      toast.success("Direct invite link copied!");
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "13px",
                    }}
                  >
                    <Share2 size={15} /> Copy Link
                  </button>
                </div>

                {/* Social Quick Share */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent(`Play ${selectedGame === "ludo-league" ? "Ludo League" : "Connect NIM"} with me on Nimiq Arena! Code: ${createdMatch.joinCode}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(0, 136, 204, 0.2)",
                      border: "1px solid rgba(0, 136, 204, 0.4)",
                      color: "#0088cc",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    Telegram Share
                  </a>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Play with me on Nimiq Arena! Code: ${createdMatch.joinCode} - ${shareableUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(37, 211, 102, 0.2)",
                      border: "1px solid rgba(37, 211, 102, 0.4)",
                      color: "#25d366",
                      textDecoration: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    WhatsApp Share
                  </a>
                </div>

                {/* Enter Match CTA */}
                <button
                  onClick={() => navigate(`/matches/${createdMatch.id}`)}
                  className="primary-action"
                  style={{
                    backgroundColor: "#EC9918",
                    padding: "15px",
                    fontWeight: 800,
                    fontSize: "16px",
                    color: "#111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Gamepad2 size={18} /> Enter Game Lobby & Wait for Friend
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Join with Code */}
        {activeTab === "join" && (
          <form className="join-card" onSubmit={handleJoinSubmit} style={{ padding: "28px" }}>
            <div className="join-icon">
              <KeyRound size={20} />
            </div>
            <label htmlFor="join-code" className="card-label">
              INVITE CODE
            </label>
            <input
              id="join-code"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 12)
                )
              }
              placeholder="e.g. AB12CD34"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={12}
              style={{
                textAlign: "center",
                letterSpacing: "3px",
                fontSize: "20px",
                fontWeight: 800,
                padding: "14px",
              }}
            />

            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "10px",
                padding: "10px 14px",
                margin: "14px 0",
                fontSize: "11px",
                color: "#fbbf24",
                fontFamily: "IBM Plex Mono, monospace",
                textAlign: "left",
              }}
            >
              <strong style={{ display: "block", marginBottom: "4px" }}>
                INSTANT SEAT VERIFICATION
              </strong>
              <span>Validates room availability, checks capacity, and assigns your official match seat.</span>
            </div>

            <button
              className="primary-action"
              type="submit"
              disabled={join.isPending || joinCode.length < 6}
              style={{
                background: "linear-gradient(135deg, #EC9918, #d4820a)",
                padding: "15px",
                fontWeight: 800,
                fontSize: "15px",
                color: "#111",
              }}
            >
              {join.isPending ? "Validating table…" : "ENTER TABLE NOW"}
            </button>

            <div className="trust-line" style={{ marginTop: "16px" }}>
              <ShieldCheck size={15} />
              <span>
                Authoritative server matchmaking. Real Testnet deposit verification.
              </span>
            </div>
          </form>
        )}
      </main>

      <footer className="detail-footer">
        <span>
          Invalid, full, expired, and unauthorized joins are rejected.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
