import { describe, expect, it } from "vitest";
import type { CalendarEntry } from "./calendar-store";
import { computeTotals, formatHours, MetricsStateSchema, parseCount, speedHours } from "./metrics";

function entry(id: string, postedAfterHours?: number): CalendarEntry {
  const captured = "2026-11-25T10:00:00.000Z";
  return {
    id,
    trendId: "t",
    trendTitle: "x",
    trendUrl: "https://www.youtube.com/watch?v=t",
    categoryName: "Music",
    trendCapturedAt: captured,
    concept: { hook: id, caption: "c", visualIdea: "v", hashtags: ["#a"], platform: "Instagram", postingWindow: "Sat" },
    scheduledDate: "2026-11-28",
    createdAt: captured,
    postedAt:
      postedAfterHours === undefined
        ? undefined
        : new Date(Date.parse(captured) + postedAfterHours * 3_600_000).toISOString(),
  };
}

describe("parseCount", () => {
  it.each([
    ["", undefined],
    ["  ", undefined],
    ["42", 42],
    ["1,250", 1250],
    ["3.6", 4],
    ["-5", undefined],
    ["abc", undefined],
  ])("parses %j as %j", (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });
});

describe("speedHours", () => {
  it("is null until the post is marked posted", () => {
    expect(speedHours(entry("a"))).toBeNull();
  });

  it("measures hours from trend capture to posting", () => {
    expect(speedHours(entry("a", 18))).toBe(18);
  });
});

describe("computeTotals", () => {
  it("counts planned vs posted and averages speed over posted posts only", () => {
    const t = computeTotals([entry("a", 10), entry("b", 20), entry("c")], {});
    expect(t).toMatchObject({ planned: 3, posted: 2, avgSpeedHours: 15 });
  });

  it("sums owner-entered values and computes engagement rate from posts with both numbers", () => {
    const t = computeTotals([entry("a", 1), entry("b", 1), entry("c")], {
      a: { timeSavedMinutes: 30, impressions: 1000, engagements: 50, clicks: 5 },
      b: { timeSavedMinutes: 45, impressions: 500 }, // no engagements: excluded from the rate
      c: { engagements: 10 }, // no impressions: excluded from the rate
    });
    expect(t.timeSavedMinutes).toBe(75);
    expect(t.impressions).toBe(1500);
    expect(t.engagements).toBe(60);
    expect(t.clicks).toBe(5);
    expect(t.engagementRate).toBeCloseTo(0.05);
  });

  it("handles no posts and no values", () => {
    expect(computeTotals([], {})).toMatchObject({ planned: 0, posted: 0, avgSpeedHours: null, engagementRate: null });
  });

  it("ignores values for posts that were deleted from the calendar", () => {
    expect(computeTotals([entry("a")], { gone: { clicks: 99 } }).clicks).toBe(0);
  });
});

describe("formatHours", () => {
  it("picks a readable unit", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(18)).toBe("18.0 h");
    expect(formatHours(72)).toBe("3.0 days");
  });
});

describe("MetricsStateSchema", () => {
  it("drops negative or fractional saved values (only for that post)", () => {
    expect(MetricsStateSchema.parse({ enabled: {}, values: { a: { clicks: -1 } } }).values.a).toEqual({});
    expect(MetricsStateSchema.parse({ enabled: {}, values: { a: { clicks: 1.5 } } }).values.a).toEqual({});
  });

  it("still rejects a state that isn't the right shape at all", () => {
    expect(MetricsStateSchema.safeParse({ enabled: {}, values: "nope" }).success).toBe(false);
    expect(MetricsStateSchema.safeParse(null).success).toBe(false);
  });
});
