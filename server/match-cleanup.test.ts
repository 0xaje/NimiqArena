import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  sweepMatchLifecycle: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./db", () => ({ sweepMatchLifecycle: mocks.sweepMatchLifecycle }));

import { cleanupMatchesHandler } from "./match-cleanup";

function responseMock() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("scheduled match cleanup endpoint", () => {
  it("rejects non-cron identities", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      isCron: false,
      taskUid: null,
    });
    const res = responseMock();

    await cleanupMatchesHandler({} as never, res as never);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(mocks.sweepMatchLifecycle).not.toHaveBeenCalled();
  });

  it("delegates cleanup exactly once for an authenticated cron request", async () => {
    mocks.authenticateRequest.mockResolvedValueOnce({
      isCron: true,
      taskUid: "task-1",
    });
    mocks.sweepMatchLifecycle.mockResolvedValueOnce({ changed: 2 });
    const res = responseMock();

    await cleanupMatchesHandler({} as never, res as never);

    expect(mocks.sweepMatchLifecycle).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith({ ok: true, changed: 2 });
  });
});
