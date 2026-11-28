import { describe, expect, it, vi } from "vitest";
import type { StructuredCaller } from "../llm/client";
import { keywordRejection } from "./filter";
import { createSafetyChecker, type SourcedVerdict } from "./llm-check";
import { trend } from "./test-helpers";
import { topicKeywords } from "./topics";

describe("topics to avoid: words that end in s but aren't plurals", () => {
  it("keeps 'news' as 'news', not 'new'", () => {
    expect(topicKeywords(["News"]).map((k) => k.keyword)).toEqual(["news"]);
    expect(topicKeywords(["Breaking news and politics"]).map((k) => k.keyword)).toEqual([
      "breaking news",
      "politic",
    ]);
  });

  it("doesn't block every title with 'new' when the owner avoids news", () => {
    expect(keywordRejection(trend({ title: "Brand new puppy meets the cat" }), ["News"])).toBeNull();
    expect(keywordRejection(trend({ title: "New Year cake ideas" }), ["News"])).toBeNull();
    expect(keywordRejection(trend({ title: "Puppy makes the evening news" }), ["News"])?.layer).toBe("profile");
  });

  it("still singularises real plurals", () => {
    expect(topicKeywords(["Accidents", "Celebrities"]).map((k) => k.keyword)).toEqual(["accident", "celebrity"]);
  });
});

describe("safety checker shared memo (live mode)", () => {
  it("reuses a live verdict across checkers instead of calling the LLM again", async () => {
    const caller = vi.fn(async () => ({ safe: true, reason: "Cute dog" })) as unknown as StructuredCaller;
    const memo = new Map<string, SourcedVerdict>();
    const item = trend({ id: "same-video" });

    await createSafetyChecker({ caller, memo }).check(item); // request 1
    const second = await createSafetyChecker({ caller, memo }).check(item); // request 2

    expect(caller).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ safe: true, reason: "Cute dog", source: "llm" });
  });

  it("doesn't remember failures, so a later request can retry", async () => {
    const caller = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ safe: true, reason: "ok" }) as unknown as StructuredCaller;
    const memo = new Map<string, SourcedVerdict>();
    const item = trend();

    expect((await createSafetyChecker({ caller, memo }).check(item)).safe).toBe(false);
    expect((await createSafetyChecker({ caller, memo }).check(item)).safe).toBe(true);
  });
});
