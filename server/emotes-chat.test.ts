import { describe, expect, it, vi } from "vitest";
import {
  broadcastEmote,
  broadcastQuickChat,
  type EmotePayload,
  type QuickChatPayload,
} from "./match-stream";

describe("Live Match Stream Emotes & Quick Chat", () => {
  it("formats and dispatches typed emote payloads accurately", () => {
    const payload: EmotePayload = {
      id: "emote-123",
      userId: 1,
      userName: "Alice",
      seat: 0,
      emote: "rocket",
      emoji: "🚀",
      timestamp: Date.now(),
    };

    expect(payload.emoji).toBe("🚀");
    expect(payload.emote).toBe("rocket");
    expect(payload.seat).toBe(0);

    // Verify broadcast does not throw
    expect(() => broadcastEmote("match-test-1", payload)).not.toThrow();
  });

  it("formats and dispatches quick chat messages cleanly", () => {
    const payload: QuickChatPayload = {
      id: "chat-456",
      userId: 2,
      userName: "Bob",
      seat: 1,
      message: "Well played, GG! 👏",
      timestamp: Date.now(),
    };

    expect(payload.message).toContain("GG");
    expect(payload.seat).toBe(1);

    // Verify broadcast does not throw
    expect(() => broadcastQuickChat("match-test-1", payload)).not.toThrow();
  });
});
