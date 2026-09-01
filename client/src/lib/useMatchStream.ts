import { useEffect, useRef, useState } from "react";

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

    function connect() {
      if (!isSubscribed) return;

      try {
        eventSource = new EventSource(`/api/matches/${matchId}/events`, {
          withCredentials: true,
        });

        eventSource.onopen = () => {
          if (isSubscribed) {
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
          // Attempt reconnection after 2 seconds
          reconnectTimeout = window.setTimeout(connect, 2000);
        };
      } catch {
        setIsConnected(false);
        reconnectTimeout = window.setTimeout(connect, 3000);
      }
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
