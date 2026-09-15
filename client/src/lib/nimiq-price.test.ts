import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module keeps its cached price in module-level state, so each test
// needs a fresh import to avoid one test's cache leaking into the next.
async function freshModule() {
  vi.resetModules();
  return await import("./nimiq-price");
}

describe("fetchNimiqUsdPrice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports live:true when CoinGecko actually answers", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ "nimiq-2": { usd: 0.0005 } }),
    });
    const { fetchNimiqUsdPrice } = await freshModule();

    const result = await fetchNimiqUsdPrice();

    expect(result).toEqual({ price: 0.0005, live: true });
  });

  it("reports live:false — not true — when the request throws", async () => {
    (fetch as any).mockRejectedValue(new Error("network down"));
    const { fetchNimiqUsdPrice, DEFAULT_NIM_USD_PRICE } = await freshModule();

    const result = await fetchNimiqUsdPrice();

    // This is the bug this test guards: the old code set isLive=true the
    // moment the promise settled, regardless of which branch it took, so a
    // caught network failure looked identical to a real price to anyone
    // reading the result.
    expect(result.live).toBe(false);
    expect(result.price).toBe(DEFAULT_NIM_USD_PRICE);
  });

  it("reports live:false when CoinGecko responds but without a usable price", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const { fetchNimiqUsdPrice, DEFAULT_NIM_USD_PRICE } = await freshModule();

    const result = await fetchNimiqUsdPrice();

    expect(result.live).toBe(false);
    expect(result.price).toBe(DEFAULT_NIM_USD_PRICE);
  });

  it("reports live:false on a non-2xx response", async () => {
    (fetch as any).mockResolvedValue({ ok: false });
    const { fetchNimiqUsdPrice } = await freshModule();

    const result = await fetchNimiqUsdPrice();

    expect(result.live).toBe(false);
  });

  it("serves the cached price without a fetch inside the TTL window, marked live", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ "nimiq-2": { usd: 0.0007 } }),
    });
    const { fetchNimiqUsdPrice } = await freshModule();

    const first = await fetchNimiqUsdPrice();
    const second = await fetchNimiqUsdPrice();

    expect(first).toEqual({ price: 0.0007, live: true });
    // Still "live" — this is a fresh, recently-confirmed price serving
    // from cache, not a fallback standing in for a failed request.
    expect(second).toEqual({ price: 0.0007, live: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
