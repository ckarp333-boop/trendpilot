import { describe, expect, it } from "vitest";
import type { TrendItem } from "./schema";
import { computeSignals } from "./signals";
import { loadSavedSnapshot } from "./snapshot";

const base: TrendItem = {
  id: "v1",
  title: "Latte art in 30 seconds",
  channel: "Demo Channel",
  categoryId: 26,
  categoryName: "Howto & Style",
  views: 100_000,
  publishedAt: "2026-11-24T00:00:00Z",
  url: "https://www.youtube.com/watch?v=v1",
  tags: [],
};

describe("computeSignals", () => {
  it("works out views per hour since publishing", () => {
    const s = computeSignals(base, "2026-11-25T00:00:00Z");
    expect(s.hoursLive).toBe(24);
    expect(s.viewsPerHour).toBeCloseTo(100_000 / 24);
  });

  it("floors elapsed time at 1 hour so brand-new videos don't explode", () => {
    const s = computeSignals(base, "2026-11-24T00:05:00Z");
    expect(s.hoursLive).toBe(1);
    expect(s.viewsPerHour).toBe(100_000);
  });

  it("treats a capture time before publishing as 1 hour", () => {
    expect(computeSignals(base, "2026-11-23T00:00:00Z").hoursLive).toBe(1);
  });

  it("engagement is (likes + comments) / views", () => {
    const s = computeSignals({ ...base, likes: 4_000, comments: 1_000 }, "2026-11-25T00:00:00Z");
    expect(s.engagementRate).toBeCloseTo(0.05);
  });

  it("counts comments as 0 when they are turned off", () => {
    const s = computeSignals({ ...base, likes: 2_000 }, "2026-11-25T00:00:00Z");
    expect(s.engagementRate).toBeCloseTo(0.02);
  });

  it("has no engagement rate when likes are hidden or there are no views", () => {
    expect(computeSignals({ ...base, comments: 50 }, "2026-11-25T00:00:00Z").engagementRate).toBeNull();
    expect(computeSignals({ ...base, views: 0, likes: 5 }, "2026-11-25T00:00:00Z").engagementRate).toBeNull();
  });

  it("breakout ratio is views / channel subscribers", () => {
    const s = computeSignals({ ...base, channelSubscribers: 10_000 }, "2026-11-25T00:00:00Z");
    expect(s.breakoutRatio).toBe(10);
  });

  it("has no breakout ratio when subscribers are hidden or zero", () => {
    expect(computeSignals(base, "2026-11-25T00:00:00Z").breakoutRatio).toBeNull();
    expect(computeSignals({ ...base, channelSubscribers: 0 }, "2026-11-25T00:00:00Z").breakoutRatio).toBeNull();
  });
});

describe("saved snapshot signals", () => {
  it("every trend gets finite, non-negative signals", () => {
    const snap = loadSavedSnapshot();
    for (const item of snap.items) {
      const s = computeSignals(item, snap.fetchedAt);
      expect(Number.isFinite(s.viewsPerHour)).toBe(true);
      expect(s.viewsPerHour).toBeGreaterThanOrEqual(0);
      if (s.engagementRate !== null) expect(s.engagementRate).toBeGreaterThanOrEqual(0);
      if (s.breakoutRatio !== null) expect(s.breakoutRatio).toBeGreaterThan(0);
    }
  });

  it("most trends have engagement and breakout data", () => {
    const signals = loadSavedSnapshot().items.map((i) => computeSignals(i, loadSavedSnapshot().fetchedAt));
    const half = signals.length / 2;
    expect(signals.filter((s) => s.engagementRate !== null).length).toBeGreaterThan(half);
    expect(signals.filter((s) => s.breakoutRatio !== null).length).toBeGreaterThan(half);
  });
});
