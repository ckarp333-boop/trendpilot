import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const fetchTrending = vi.fn();
vi.mock("./fetch", () => ({ fetchTrending: (...args: unknown[]) => fetchTrending(...args) }));

const { getTrendItems, LIVE_TTL_MS, resetLiveCache } = await import("./index");

const video = {
  id: "live1",
  title: "Live video",
  channel: "Channel",
  categoryId: 26,
  categoryName: "Howto & Style",
  views: 10,
  publishedAt: "2026-11-27T00:00:00Z",
  url: "https://www.youtube.com/watch?v=live1",
  tags: [],
};

describe("getTrendItems live cache (DEMO_MODE=false)", () => {
  beforeEach(() => {
    vi.stubEnv("DEMO_MODE", "false");
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    fetchTrending.mockReset();
    resetLiveCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("reuses one live fetch across requests within the TTL", async () => {
    fetchTrending.mockResolvedValue({ items: [video], errors: [] });
    const [a, b] = await Promise.all([getTrendItems(), getTrendItems()]);
    const c = await getTrendItems();
    expect(fetchTrending).toHaveBeenCalledTimes(1);
    expect(a.source).toBe("live");
    expect(c).toBe(a);
    expect(b).toBe(a);
  });

  it("fetches again after the TTL", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-28T00:00:00Z") });
    fetchTrending.mockResolvedValue({ items: [video], errors: [] });
    await getTrendItems();
    vi.setSystemTime(Date.now() + LIVE_TTL_MS + 1);
    await getTrendItems();
    expect(fetchTrending).toHaveBeenCalledTimes(2);
  });

  it("doesn't cache a snapshot fallback, so the next request tries YouTube again", async () => {
    fetchTrending.mockResolvedValueOnce({ items: [], errors: [{ message: "quota" }] });
    fetchTrending.mockResolvedValueOnce({ items: [video], errors: [] });
    const first = await getTrendItems();
    await Promise.resolve(); // let the cache-clearing handler run
    const second = await getTrendItems();
    expect(first.source).not.toBe("live");
    expect(first.warning).toMatch(/returned nothing/);
    expect(second.source).toBe("live");
  });

  it("makes no YouTube calls in demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    await getTrendItems();
    expect(fetchTrending).not.toHaveBeenCalled();
  });
});
