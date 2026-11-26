import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { CalendarEntrySchema, normaliseHashtags } from "./calendar-store";
import { addDays, elapsed, startOfWeek, suggestedDate, toISODate } from "./dates";
import { createLocalStore } from "./local-store";

describe("dates", () => {
  const wed = new Date(2026, 10, 25); // Wed Nov 25 2026

  it("starts weeks on Monday", () => {
    expect(toISODate(startOfWeek(wed))).toBe("2026-11-23");
    expect(toISODate(startOfWeek(new Date(2026, 10, 29)))).toBe("2026-11-23"); // Sunday
  });

  it.each([
    ["Saturday 8:00-10:00 AM", "2026-11-28"],
    ["Tuesday 7:00-9:00 AM", "2026-12-01"],
    ["Wednesday lunch", "2026-11-25"],
    ["Fri 3-5 PM", "2026-11-27"],
    ["Weekday mornings", "2026-11-26"],
  ])("suggests the next matching day for %j", (window, expected) => {
    expect(suggestedDate(window, wed)).toBe(expected);
  });

  it("adds days across month ends", () => {
    expect(toISODate(addDays(new Date(2026, 10, 30), 1))).toBe("2026-12-01");
  });

  it("formats elapsed time for speed-to-market", () => {
    expect(elapsed("2026-11-25T10:00:00Z", "2026-11-26T04:00:00Z")).toBe("18 h");
    expect(elapsed("2026-11-25T10:00:00Z", "2026-11-27T14:00:00Z")).toBe("2 d 4 h");
    expect(elapsed("2026-11-26T10:00:00Z", "2026-11-25T10:00:00Z")).toBe("0 h");
  });
});

describe("normaliseHashtags", () => {
  it("adds missing # and strips punctuation", () => {
    expect(normaliseHashtags("#yyc yycbakery, #Cozy-Morning")).toEqual(["#yyc", "#yycbakery", "#CozyMorning"]);
  });

  it("drops empty tags", () => {
    expect(normaliseHashtags("# ## , ")).toEqual([]);
  });
});

describe("createLocalStore", () => {
  beforeEach(() => localStorage.clear());
  const Schema = z.object({ n: z.number() });

  it("returns the fallback when nothing is saved", () => {
    const store = createLocalStore("t1", Schema.nullable(), null);
    expect(store.read()).toBeNull();
  });

  it("saves, reads back the same object, and notifies listeners", () => {
    const store = createLocalStore("t2", Schema.nullable(), null);
    let calls = 0;
    const unsub = store.subscribe(() => calls++);
    store.write({ n: 1 });
    const a = store.read();
    expect(a).toEqual({ n: 1 });
    expect(store.read()).toBe(a); // stable reference (needed by useSyncExternalStore)
    expect(calls).toBe(1);
    unsub();
  });

  it("ignores corrupt or invalid saved data", () => {
    localStorage.setItem("t3", "{not json");
    expect(createLocalStore("t3", Schema.nullable(), null).read()).toBeNull();
    localStorage.setItem("t4", JSON.stringify({ n: "one" }));
    expect(createLocalStore("t4", Schema.nullable(), null).read()).toBeNull();
  });

  it("writing null clears the saved value", () => {
    const store = createLocalStore("t5", Schema.nullable(), null);
    store.write({ n: 2 });
    store.write(null);
    expect(localStorage.getItem("t5")).toBeNull();
    expect(store.read()).toBeNull();
  });
});

describe("CalendarEntrySchema", () => {
  it("requires a YYYY-MM-DD date", () => {
    const base = {
      id: "1",
      trendId: "t",
      trendTitle: "x",
      trendUrl: "https://www.youtube.com/watch?v=t",
      categoryName: "Music",
      trendCapturedAt: "2026-11-25T00:00:00Z",
      concept: { hook: "h", caption: "c", visualIdea: "v", hashtags: ["#a"], platform: "Instagram", postingWindow: "Sat" },
      createdAt: "2026-11-25T00:00:00Z",
    };
    expect(CalendarEntrySchema.safeParse({ ...base, scheduledDate: "2026-11-28" }).success).toBe(true);
    expect(CalendarEntrySchema.safeParse({ ...base, scheduledDate: "Nov 28" }).success).toBe(false);
  });
});
