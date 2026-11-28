import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { suggestedDate } from "./dates";
import { createLocalStore } from "./local-store";
import { MAX_COUNT, MetricsStateSchema, parseCount } from "./metrics";

describe("metrics: oversized values can't wipe saved metrics", () => {
  it("parseCount clamps to MAX_COUNT", () => {
    expect(parseCount("2500000000")).toBe(MAX_COUNT);
    expect(parseCount("1e12")).toBe(MAX_COUNT);
    expect(parseCount("1,000,000,000")).toBe(MAX_COUNT);
  });

  it("a clamped value is valid in the saved state", () => {
    const state = { enabled: {}, values: { a: { impressions: parseCount("9999999999") } } };
    expect(MetricsStateSchema.safeParse(state).success).toBe(true);
  });

  it("one bad saved entry drops only that post's values, not everything", () => {
    const parsed = MetricsStateSchema.parse({
      enabled: { clicks: false },
      values: { good: { clicks: 12 }, bad: { impressions: 5_000_000_000 } },
    });
    expect(parsed.values.good).toEqual({ clicks: 12 });
    expect(parsed.values.bad).toEqual({});
    expect(parsed.enabled).toEqual({ clicks: false });
  });
});

describe("createLocalStore when the browser refuses to store", () => {
  const Schema = z.object({ n: z.number() });
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("keeps the new value for this tab and reports that it wasn't stored", () => {
    localStorage.setItem("q1", JSON.stringify({ n: 1 }));
    const store = createLocalStore("q1", Schema.nullable(), null);
    expect(store.read()).toEqual({ n: 1 });

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(store.write({ n: 2 })).toBe(false);
    // getItem still works and returns the old value; the store must not fall back to it.
    expect(localStorage.getItem("q1")).toBe(JSON.stringify({ n: 1 }));
    expect(store.read()).toEqual({ n: 2 });
  });

  it("reports a normal write as stored", () => {
    const store = createLocalStore("q2", Schema.nullable(), null);
    expect(store.write({ n: 3 })).toBe(true);
  });
});

describe("suggestedDate with several days in the window", () => {
  const friday = new Date(2026, 10, 27); // Fri Nov 27 2026

  it("picks the soonest matching day, not the first in the week", () => {
    expect(suggestedDate("Sat or Sun 9:00-11:00 AM", friday)).toBe("2026-11-28");
    expect(suggestedDate("Sunday or Saturday", friday)).toBe("2026-11-28");
    expect(suggestedDate("Monday or Friday lunch", friday)).toBe("2026-11-27");
  });

  it("still handles one day and no day", () => {
    expect(suggestedDate("Tuesday 7-9 AM", friday)).toBe("2026-12-01");
    expect(suggestedDate("Weekday mornings", friday)).toBe("2026-11-28");
  });
});
