import React, { useState } from "react";
import { MessageSquare, Smile, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { soundEngine } from "@/lib/audio";
import { toast } from "sonner";

interface EmoteWheelProps {
  matchId: string;
  disabled?: boolean;
}

const EMOTE_LIST = [
  { id: "bullseye", label: "Bullseye", emoji: "🎯" },
  { id: "rocket", label: "Moon", emoji: "🚀" },
  { id: "diamond", label: "Diamond", emoji: "💎" },
  { id: "shock", label: "Shock", emoji: "😱" },
  { id: "gg", label: "GG", emoji: "👏" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "skull", label: "R.I.P.", emoji: "💀" },
] as const;

const QUICK_CHATS = [
  "Good luck!",
  "Nice move! 🔥",
  "Thinking... 🤔",
  "Checkmate incoming! 🎯",
  "One more? ⚔️",
  "Well played, GG! 👏",
];

export function EmoteWheel({ matchId, disabled = false }: EmoteWheelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"emotes" | "chat">("emotes");
  const sendEmote = trpc.match.sendEmote.useMutation();
  const sendChat = trpc.match.sendQuickChat.useMutation();

  const handleTriggerEmote = async (
    emoteId: (typeof EMOTE_LIST)[number]["id"]
  ) => {
    try {
      soundEngine.playCapture(); // energetic pop sfx
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(20);
      }
      setIsOpen(false);
      await sendEmote.mutateAsync({
        matchId,
        emote: emoteId,
      });
    } catch (err) {
      toast.error("Could not send emote");
    }
  };

  const handleTriggerChat = async (message: string) => {
    try {
      soundEngine.playPieceMove();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(20);
      }
      setIsOpen(false);
      await sendChat.mutateAsync({
        matchId,
        message,
      });
    } catch (err) {
      toast.error("Could not send chat");
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          background: isOpen ? "var(--orange)" : "rgba(255, 255, 255, 0.08)",
          color: isOpen ? "#fff" : "var(--paper-bright)",
          border: `1px solid ${isOpen ? "var(--orange)" : "rgba(251, 248, 241, 0.2)"}`,
          borderRadius: "20px",
          cursor: "pointer",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "12px",
          transition: "all 0.15s ease",
          boxShadow: isOpen ? "0 0 12px rgba(230, 93, 35, 0.5)" : "none",
        }}
      >
        <Smile size={15} />
        <span>REACTIONS</span>
      </button>

      {/* Popover Wheel / Dock */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "45px",
            right: "0",
            width: "280px",
            background: "linear-gradient(180deg, #102438 0%, #0a1724 100%)",
            border: "2px solid #1a3854",
            borderRadius: "14px",
            boxShadow: "0 14px 32px rgba(0, 0, 0, 0.8)",
            padding: "12px",
            zIndex: 100,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Header Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "10px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setTab("emotes")}
                style={{
                  background:
                    tab === "emotes" ? "rgba(230, 93, 35, 0.3)" : "transparent",
                  color: tab === "emotes" ? "var(--orange)" : "rgba(255, 255, 255, 0.6)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                EMOTES
              </button>
              <button
                type="button"
                onClick={() => setTab("chat")}
                style={{
                  background:
                    tab === "chat" ? "rgba(230, 93, 35, 0.3)" : "transparent",
                  color: tab === "chat" ? "var(--orange)" : "rgba(255, 255, 255, 0.6)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                QUICK CHAT
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.5)",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Emotes Grid */}
          {tab === "emotes" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "8px",
              }}
            >
              {EMOTE_LIST.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTriggerEmote(item.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    padding: "8px 4px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "transform 0.1s ease, background 0.1s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "scale(1.15)";
                    e.currentTarget.style.background = "rgba(230, 93, 35, 0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{item.emoji}</span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255, 255, 255, 0.7)",
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            /* Quick Chat Presets */
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {QUICK_CHATS.map(msg => (
                <button
                  key={msg}
                  type="button"
                  onClick={() => handleTriggerChat(msg)}
                  style={{
                    padding: "8px 10px",
                    textAlign: "left",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "6px",
                    color: "var(--paper-bright)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: "IBM Plex Mono, monospace",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(230, 93, 35, 0.2)";
                    e.currentTarget.style.borderColor = "var(--orange)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  {msg}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
