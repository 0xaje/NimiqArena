import React, { useEffect, useState } from "react";
import {
  X,
  Users,
  Copy,
  Check,
  Send,
  ArrowRight,
  Sparkles,
  Share2,
  KeyRound,
  Gamepad2,
  Coins,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useModalBackHandler } from "@/hooks/useModalBackHandler";

interface PlayWithFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSlug: "ludo-league" | "connect-four";
  gameTitle: string;
}

export function PlayWithFriendModal({
  isOpen,
  onClose,
  gameSlug,
  gameTitle,
}: PlayWithFriendModalProps) {
  useModalBackHandler(isOpen, onClose);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createChallenge = trpc.match.createChallenge.useMutation();
  const createWageredMatch = trpc.match.createWageredMatch.useMutation();
  const joinByCode = trpc.match.joinByCode.useMutation();

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [matchMode, setMatchMode] = useState<"free" | "wager">("free");
  const [selectedStake, setSelectedStake] = useState<number>(10);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [createdMatch, setCreatedMatch] = useState<{
    id: string;
    joinCode: string;
    isWagered?: boolean;
    stakeNim?: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const matchStatusQuery = trpc.match.getById.useQuery(
    { id: createdMatch?.id || "" },
    {
      enabled: Boolean(createdMatch?.id && isOpen),
      refetchInterval: 1_200,
    }
  );

  useEffect(() => {
    if (createdMatch && matchStatusQuery.data) {
      if (matchStatusQuery.data.status === "in_progress") {
        toast.success("Opponent joined the table!", {
          description: "Launching live game arena now…",
        });
        onClose();
        navigate(`/matches/${createdMatch.id}`);
      }
    }
  }, [createdMatch, matchStatusQuery.data, navigate, onClose]);

  if (!isOpen) return null;

  const user = authQuery.data;

  async function ensureSession(roleName: string) {
    if (!user) {
      toast.info("Preparing your arena session…");
      const loginRes = await guestLogin.mutateAsync({ name: roleName });
      if (loginRes.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
        localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
      }
      await utils.auth.me.invalidate();
    }
  }

  async function handleCreateRoom() {
    try {
      await ensureSession("Player 1 (Host)");
      toast.loading("Generating private arena room…", { id: "create-room" });
      if (matchMode === "wager") {
        const res = await createWageredMatch.mutateAsync({
          gameSlug,
          stakeNim: selectedStake,
        });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: true,
          stakeNim: res.stakeNim,
        });
        toast.success("Wager Room Created!", {
          id: "create-room",
          description: `Invite code: ${res.joinCode} (${res.stakeNim} NIM stake)`,
        });
      } else {
        const res = await createChallenge.mutateAsync({ gameSlug });
        setCreatedMatch({
          id: res.id,
          joinCode: res.joinCode,
          isWagered: false,
          stakeNim: 0,
        });
        toast.success("Private Room Created!", {
          id: "create-room",
          description: `Invite code: ${res.joinCode}`,
        });
      }
    } catch (err) {
      toast.error("Failed to create room", {
        id: "create-room",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a valid match code");
      return;
    }
    try {
      await ensureSession("Player 2 (Guest)");
      toast.loading("Joining match table…", { id: "join-match" });
      const res = await joinByCode.mutateAsync({ joinCode: cleanCode });
      toast.success("Joined match table!", { id: "join-match" });
      onClose();
      navigate(`/matches/${res.id}`);
    } catch (err) {
      toast.error("Could not join room", {
        id: "join-match",
        description:
          err instanceof Error
            ? err.message
            : "The invite code is invalid or the match has expired.",
      });
    }
  }

  const shareableUrl = createdMatch
    ? `${window.location.origin}/join?code=${createdMatch.joinCode}`
    : "";

  const copyCodeToClipboard = () => {
    if (!createdMatch) return;
    navigator.clipboard.writeText(createdMatch.joinCode);
    setCopiedCode(true);
    toast.success("Room Code Copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLinkToClipboard = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    toast.success("Direct Match Link Copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareTelegram = () => {
    if (!createdMatch) return;
    const text = encodeURIComponent(
      `Play ${gameTitle} with me on Nimiq Arena!\nRoom Code: ${createdMatch.joinCode}\n${shareableUrl}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${text}`, "_blank");
  };

  const shareWhatsApp = () => {
    if (!createdMatch) return;
    const text = encodeURIComponent(
      `Play ${gameTitle} with me on Nimiq Arena! Join code: ${createdMatch.joinCode} - ${shareableUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(5, 7, 13, 0.82)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "linear-gradient(165deg, #161c28 0%, #0d121c 100%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(236, 153, 24, 0.1)",
          position: "relative",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(236, 153, 24, 0.25), rgba(236, 153, 24, 0.05))",
              border: "1px solid rgba(236, 153, 24, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#EC9918",
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <span
              style={{
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                color: "#EC9918",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {gameTitle}
            </span>
            <h2 style={{ fontSize: "1.25rem", margin: "2px 0 0 0", color: "#ffffff", fontWeight: 700 }}>
              Play with a Friend
            </h2>
          </div>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            padding: "4px",
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setActiveTab("create")}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "create" ? "rgba(236, 153, 24, 0.2)" : "transparent",
              color: activeTab === "create" ? "#EC9918" : "rgba(255, 255, 255, 0.6)",
              transition: "all 0.15s ease",
            }}
          >
            Create Private Room
          </button>
          <button
            onClick={() => setActiveTab("join")}
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "join" ? "rgba(0, 240, 255, 0.2)" : "transparent",
              color: activeTab === "join" ? "#00f0ff" : "rgba(255, 255, 255, 0.6)",
              transition: "all 0.15s ease",
            }}
          >
            Join with Code
          </button>
        </div>

        {/* Tab Content: Create Room */}
        {activeTab === "create" && (
          <div>
            {!createdMatch ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                {/* Mode Selector: Free Friendly vs Wager NIM */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  <button
                    type="button"
                    onClick={() => setMatchMode("free")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${matchMode === "free" ? "#22c55e" : "rgba(255, 255, 255, 0.1)"}`,
                      background: matchMode === "free" ? "rgba(34, 197, 94, 0.15)" : "rgba(0, 0, 0, 0.25)",
                      color: matchMode === "free" ? "#4ade80" : "#94a3b8",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
                      <Gamepad2 size={16} /> Free Friendly
                    </div>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>0 NIM · Casual Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchMode("wager")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1.5px solid ${matchMode === "wager" ? "#EC9918" : "rgba(255, 255, 255, 0.1)"}`,
                      background: matchMode === "wager" ? "rgba(236, 153, 24, 0.15)" : "rgba(0, 0, 0, 0.25)",
                      color: matchMode === "wager" ? "#EC9918" : "#94a3b8",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px" }}>
                      <Coins size={16} /> Wager NIM
                    </div>
                    <span style={{ fontSize: "11px", opacity: 0.8 }}>90% Payout to Winner</span>
                  </button>
                </div>

                {matchMode === "wager" ? (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      background: "rgba(236, 153, 24, 0.08)",
                      border: "1px solid rgba(236, 153, 24, 0.25)",
                      marginBottom: "16px",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#EC9918", marginBottom: "8px", display: "flex", justifyContent: "space-between", letterSpacing: "0.05em" }}>
                      <span>STAKE PER PLAYER</span>
                      <span>POT: {selectedStake * 2} NIM</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                      {[5, 10, 25, 50, 100].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSelectedStake(amt)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: `1px solid ${selectedStake === amt ? "#EC9918" : "rgba(255, 255, 255, 0.12)"}`,
                            background: selectedStake === amt ? "rgba(236, 153, 24, 0.25)" : "rgba(0, 0, 0, 0.3)",
                            color: selectedStake === amt ? "#ffffff" : "#94a3b8",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {amt} NIM
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px" }}>
                      🏆 <strong>Winner receives 90%</strong> ({(selectedStake * 2 * 0.9).toFixed(1)} NIM) on-chain directly to Nimiq wallet.
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "18px", textAlign: "left" }}>
                    Share an invite code to challenge a friend for a 1v1 match with zero stakes. Both players jump straight into the arena!
                  </p>
                )}

                <button
                  onClick={handleCreateRoom}
                  disabled={createChallenge.isPending || createWageredMatch.isPending}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: "10px",
                    background: matchMode === "wager"
                      ? "linear-gradient(135deg, #EC9918, #f59e0b)"
                      : "linear-gradient(135deg, #22c55e, #16a34a)",
                    border: "none",
                    color: matchMode === "wager" ? "#05070d" : "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: matchMode === "wager"
                      ? "0 6px 20px rgba(236, 153, 24, 0.35)"
                      : "0 6px 20px rgba(34, 197, 94, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Sparkles size={16} />
                  {createChallenge.isPending || createWageredMatch.isPending
                    ? "Generating Room…"
                    : matchMode === "wager"
                    ? `Create ${selectedStake} NIM Wager Room`
                    : "Generate Free Room Code"}
                </button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    padding: "16px",
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: "12px",
                    border: "1px solid rgba(236, 153, 24, 0.3)",
                    textAlign: "center",
                    marginBottom: "16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "IBM Plex Mono, monospace",
                      color: "#94a3b8",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Your Private Room Code
                  </span>
                  <div
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: "2rem",
                      fontWeight: 800,
                      color: "#EC9918",
                      letterSpacing: "0.15em",
                      margin: "8px 0 6px 0",
                    }}
                  >
                    {createdMatch.joinCode}
                  </div>
                  {createdMatch.isWagered && (
                    <div style={{ margin: "4px 0 12px 0", fontSize: "12px", color: "#EC9918", fontWeight: 700 }}>
                      ⚡ Wager: {createdMatch.stakeNim} NIM (Pot: {(createdMatch.stakeNim || 0) * 2} NIM · 90% Winner Payout)
                    </div>
                  )}
                  <button
                    onClick={copyCodeToClipboard}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      background: copiedCode ? "rgba(34, 197, 94, 0.2)" : "rgba(236, 153, 24, 0.15)",
                      border: `1px solid ${copiedCode ? "#4ade80" : "rgba(236, 153, 24, 0.3)"}`,
                      color: copiedCode ? "#4ade80" : "#EC9918",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode ? "Code Copied!" : "Copy Code"}
                  </button>
                </div>

                {/* Share Options */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  <button
                    onClick={shareTelegram}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(0, 136, 204, 0.15)",
                      border: "1px solid rgba(0, 136, 204, 0.3)",
                      color: "#38bdf8",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Send size={14} /> Telegram
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: "rgba(37, 211, 102, 0.15)",
                      border: "1px solid rgba(37, 211, 102, 0.3)",
                      color: "#4ade80",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>

                <button
                  onClick={copyLinkToClipboard}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: copiedLink ? "#4ade80" : "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    marginBottom: "16px",
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                  {copiedLink ? "Direct Link Copied!" : "Copy Direct Match Link"}
                </button>

                <button
                  onClick={() => {
                    onClose();
                    navigate(`/matches/${createdMatch.id}`);
                  }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #EC9918, #f59e0b)",
                    border: "none",
                    color: "#05070d",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Gamepad2 size={16} /> Enter Match Table Now <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Join with Code */}
        {activeTab === "join" && (
          <form onSubmit={handleJoinRoom}>
            <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "16px" }}>
              Enter the room code shared by your friend to jump directly into their match table.
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "11px",
                  color: "#00f0ff",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Enter 8-Character Code
              </label>
              <div style={{ position: "relative" }}>
                <KeyRound
                  size={18}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#00f0ff",
                  }}
                />
                <input
                  type="text"
                  maxLength={12}
                  value={joinCodeInput}
                  onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 7820B880"
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "10px",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                    color: "#ffffff",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "1.1rem",
                    letterSpacing: "0.1em",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={joinByCode.isPending || !joinCodeInput.trim()}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #00f0ff, #0099ff)",
                border: "none",
                color: "#05070d",
                fontSize: "14px",
                fontWeight: 800,
                cursor: joinCodeInput.trim() ? "pointer" : "not-allowed",
                opacity: joinCodeInput.trim() ? 1 : 0.6,
                boxShadow: "0 6px 20px rgba(0, 240, 255, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {joinByCode.isPending ? "Connecting to Table…" : "Join Friend's Match"}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
