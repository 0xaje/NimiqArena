import { useEffect, useRef, useState } from "react";
import { reconnectDelayMs } from "./reconnect-policy";
import { COOKIE_NAME } from "@shared/const";

function getSessionToken(): string | null {
  const extractToken = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const parts = raw.split(";");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(`${COOKIE_NAME}=`)) {
        return trimmed.slice(`${COOKIE_NAME}=`.length);
      }
      if (trimmed.startsWith("manus-session=")) {
        return trimmed.slice("manus-session=".length);
      }
    }
    if (!raw.includes("=")) {
      return raw.trim();
    }
    return null;
  };

  try {
    const raw =
      sessionStorage.getItem("manus-cookie") ||
      localStorage.getItem("manus-cookie");
    const token = extractToken(raw);
    if (token) return token;
  } catch {
    // storage blocked
  }
  try {
    if (typeof document !== "undefined" && document.cookie) {
      const token = extractToken(document.cookie);
      if (token) return token;
    }
  } catch {
    // cookies blocked
  }
  return null;
}

const MAX_STREAM_RECONNECT_ATTEMPTS = 6;

export interface EmoteEvent {
  id: string;
  userId: number;
  userName: string;
  seat: number;
  emote: string;
  emoji: string;
  timestamp: number;
}

export interface QuickChatEvent {
  id: string;
  userId: number;
  userName: string;
  seat: number;
  message: string;
  timestamp: number;
}

interface UseMatchStreamOptions {
  matchId: string;
  enabled?: boolean;
  onStateUpdate?: (state: any) => void;
  onEmote?: (emote: EmoteEvent) => void;
  onChat?: (chat: QuickChatEvent) => void;
}

export function useMatchStream({
  matchId,
  enabled = true,
  onStateUpdate,
  onEmote,
  onChat,
}: UseMatchStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<EmoteEvent[]>([]);
  const [activeChats, setActiveChats] = useState<QuickChatEvent[]>([]);
  const callbacksRef = useRef({ onStateUpdate, onEmote, onChat });

  useEffect(() => {
    callbacksRef.current = { onStateUpdate, onEmote, onChat };
  });

  useEffect(() => {
    if (!enabled || !matchId) {
      setIsConnected(false);
      return;
    }

    let isSubscribed = true;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number | null = null;
    let attempt = 0;

    function connect() {
      if (!isSubscribed) return;

      try {
        const token = getSessionToken();
        const streamUrl = token
          ? `/api/matches/${matchId}/events?token=${encodeURIComponent(token)}`
          : `/api/matches/${matchId}/events`;

        eventSource = new EventSource(streamUrl, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          if (isSubscribed) {
            attempt = 0;
            setIsConnected(true);
          }
        };

        eventSource.addEventListener("state", (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(e.data);
            callbacksRef.current.onStateUpdate?.(data);
          } catch {
            // invalid json
          }
        });

        eventSource.addEventListener("emote", (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const emote = JSON.parse(e.data) as EmoteEvent;
            callbacksRef.current.onEmote?.(emote);
            setActiveEmotes(prev => [...prev.slice(-4), emote]);
            setTimeout(() => {
              setActiveEmotes(prev => prev.filter(item => item.id !== emote.id));
            }, 3000);
          } catch {
            // invalid json
          }
        });

        eventSource.addEventListener("chat", (e: MessageEvent) => {
          if (!isSubscribed) return;
          try {
            const chat = JSON.parse(e.data) as QuickChatEvent;
            callbacksRef.current.onChat?.(chat);
            setActiveChats(prev => [...prev.slice(-4), chat]);
            setTimeout(() => {
              setActiveChats(prev => prev.filter(item => item.id !== chat.id));
            }, 4000);
          } catch {
            // invalid json
          }
        });

        eventSource.onerror = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          eventSource?.close();
          scheduleReconnect();
        };
      } catch {
        setIsConnected(false);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (!isSubscribed) return;
      if (attempt >= MAX_STREAM_RECONNECT_ATTEMPTS) return;

      // Backs off instead of hammering: reconnect-policy already implemented
      // this and nothing used it.
      const delay = reconnectDelayMs(attempt);
      attempt += 1;
      reconnectTimeout = window.setTimeout(connect, delay);
    }

    connect();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
      setIsConnected(false);
    };
  }, [matchId, enabled]);

  return {
    isConnected,
    activeEmotes,
    activeChats,
  };
}
