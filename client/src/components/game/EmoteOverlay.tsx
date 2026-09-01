import React from "react";
import type { EmoteEvent, QuickChatEvent } from "@/lib/useMatchStream";

interface EmoteOverlayProps {
  emotes: EmoteEvent[];
  chats: QuickChatEvent[];
  yourSeat: number;
}

export function EmoteOverlay({ emotes, chats, yourSeat }: EmoteOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {/* Active Floating Emotes */}
      {emotes.map(item => {
        const isSelf = item.seat === yourSeat;
        return (
          <div
            key={item.id}
            style={{
              position: "absolute",
              bottom: isSelf ? "15%" : "65%",
              left: isSelf ? "20%" : "70%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "floatUpFade 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            }}
          >
            <div
              style={{
                fontSize: "42px",
                filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.6))",
                animation: "pulse 0.5s ease-in-out infinite alternate",
              }}
            >
              {item.emoji}
            </div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: "IBM Plex Mono, monospace",
                background: "rgba(0, 0, 0, 0.75)",
                color: "#fff",
                padding: "2px 6px",
                borderRadius: "4px",
                marginTop: "4px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {item.userName}
            </span>
          </div>
        );
      })}

      {/* Active Quick Chat Speech Bubbles */}
      {chats.map(chat => {
        const isSelf = chat.seat === yourSeat;
        return (
          <div
            key={chat.id}
            style={{
              position: "absolute",
              bottom: isSelf ? "25%" : "70%",
              left: isSelf ? "25%" : "65%",
              background: isSelf
                ? "linear-gradient(135deg, #e65d23 0%, #d35400 100%)"
                : "linear-gradient(135deg, #2980b9 0%, #1f618d 100%)",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "13px",
              fontWeight: 600,
              maxWidth: "220px",
              animation: "bubblePop 3.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <div style={{ fontSize: "10px", opacity: 0.8, marginBottom: "2px" }}>
              {chat.userName}:
            </div>
            <div>{chat.message}</div>
          </div>
        );
      })}
    </div>
  );
}
