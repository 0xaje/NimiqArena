import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  refreshMatchLifecycle: vi.fn(),
  getMatchPlayer: vi.fn(),
  getMatchPlayers: vi.fn(),
}));

vi.mock("./_core/context", () => ({ createContext: mocks.createContext }));
vi.mock("./db", () => ({
  refreshMatchLifecycle: mocks.refreshMatchLifecycle,
  getMatchPlayer: mocks.getMatchPlayer,
  getMatchPlayers: mocks.getMatchPlayers,
}));

import { registerMatchStream } from "./match-stream";

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("authenticated match SSE transport", () => {
  it("resynchronizes on the next poll and stops after disconnect", async () => {
    vi.useFakeTimers();
    const route = vi.fn();
    const app = { get: route };
    const req = Object.assign(new EventEmitter(), {
      params: { id: "match-1" },
    });
    const res = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
    };
    const first = {
      id: "match-1",
      status: "in_progress",
      stateVersion: 1,
      stateJson: JSON.stringify({ version: 1, turn: 0 }),
    };
    const second = {
      ...first,
      stateVersion: 2,
      stateJson: JSON.stringify({ version: 2, turn: 1 }),
    };
    mocks.createContext.mockResolvedValue({ user: { id: 7 } });
    mocks.refreshMatchLifecycle
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(first)
      .mockResolvedValue(second);
    mocks.getMatchPlayer.mockResolvedValue({ seat: 0 });
    mocks.getMatchPlayers.mockResolvedValue([{ seat: 0, status: "joined" }]);
    registerMatchStream(app as never);

    const handler = route.mock.calls[0][1];
    const pending = handler(req, res);
    await pending;
    expect(res.write).toHaveBeenCalledTimes(1);
    expect(res.write.mock.calls[0][0]).toContain('"stateVersion":1');

    await vi.advanceTimersByTimeAsync(3_000);
    expect(res.write).toHaveBeenCalledTimes(2);
    expect(res.write.mock.calls[1][0]).toContain('"stateVersion":2');

    req.emit("close");
    await vi.advanceTimersByTimeAsync(6_000);
    expect(res.write).toHaveBeenCalledTimes(2);

    const req2 = Object.assign(new EventEmitter(), {
      params: { id: "match-1" },
    });
    const res2 = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
    };
    await handler(req2, res2);
    expect(res2.write).toHaveBeenCalledTimes(1);
    expect(res2.write.mock.calls[0][0]).toContain('"stateVersion":2');
    req2.emit("close");
  });
});
