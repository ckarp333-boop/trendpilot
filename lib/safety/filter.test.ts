import { describe, expect, it, vi } from "vitest";
import type { StructuredCaller } from "../llm/client";
import { DEMO_PROFILE } from "../profile/schema";
import { loadSavedSnapshot } from "../youtube/snapshot";
import { filterTrends } from "./filter";
import { createSafetyChecker } from "./llm-check";
import { trend } from "./test-helpers";

const safeCaller = vi.fn(async () => ({ safe: true, reason: "Light-hearted" })) as unknown as StructuredCaller;

describe("filterTrends", () => {
  it("returns kept and filtered-out trends with the layer and reason", async () => {
    const items = [
      trend({ id: "news", categoryId: 25, categoryName: "News & Politics", title: "Budget vote today" }),
      trend({ id: "war", title: "War documentary trailer", categoryId: 24 }),
      trend({ id: "bet", title: "Betting on the big game", categoryId: 17 }),
      trend({ id: "pup", title: "Puppy meets a kitten" }),
    ];
    const caller = vi.fn(async () => ({ safe: true, reason: "Cute animals" })) as unknown as StructuredCaller;
    const { kept, filteredOut } = await filterTrends(items, {
      topicsToAvoid: DEMO_PROFILE.topicsToAvoid,
      checker: createSafetyChecker({ caller }),
    });

    expect(kept.map((k) => k.item.id)).toEqual(["pup"]);
    expect(kept[0].safetyReason).toBe("Cute animals");
    expect(filteredOut.map((f) => [f.item.id, f.layer])).toEqual([
      ["news", "category"],
      ["war", "blocklist"],
      ["bet", "profile"],
    ]);
    expect(caller).toHaveBeenCalledTimes(1); // only the trend that passed layers 1-3
  });

  it("filters out trends the LLM marks unsafe", async () => {
    const caller = vi.fn(async () => ({ safe: false, reason: "Dangerous stunt" })) as unknown as StructuredCaller;
    const { kept, filteredOut } = await filterTrends([trend({ title: "Jumping off a roof into snow" })], {
      topicsToAvoid: [],
      checker: createSafetyChecker({ caller }),
    });
    expect(kept).toEqual([]);
    expect(filteredOut[0]).toMatchObject({ layer: "llm", reason: "Dangerous stunt" });
  });

  it("limits how many LLM checks run at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const caller = vi.fn(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { safe: true, reason: "ok" };
    }) as unknown as StructuredCaller;
    const items = Array.from({ length: 10 }, (_, i) => trend({ id: `p${i}` }));
    await filterTrends(items, { topicsToAvoid: [], checker: createSafetyChecker({ caller }), concurrency: 3 });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe("the saved snapshot through layers 1-3", () => {
  it("accounts for every trend and removes all News & Politics", async () => {
    const items = loadSavedSnapshot().items;
    const { kept, filteredOut } = await filterTrends(items, {
      topicsToAvoid: DEMO_PROFILE.topicsToAvoid,
      checker: createSafetyChecker({ caller: safeCaller }),
    });
    expect(kept.length + filteredOut.length).toBe(items.length);
    expect(kept.some((k) => k.item.categoryId === 25)).toBe(false);
    expect(filteredOut.filter((f) => f.item.categoryId === 25).every((f) => f.layer === "category")).toBe(true);
  });
});
