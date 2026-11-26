import { describe, expect, it, vi } from "vitest";
import { LlmError, type StructuredCaller } from "../llm/client";
import { DEMO_PROFILE } from "../profile/schema";
import { trend } from "../safety/test-helpers";
import { buildFitUserPrompt, FIT_PROMPT_VERSION, fitCacheKey, scoreTrends } from "./fit";
import { FitScoresResponseSchema, type FitCache } from "./schemas";

const a = trend({ id: "a", title: "Puppy meets snow" });
const b = trend({ id: "b", title: "Cozy room makeover", categoryId: 26, categoryName: "Howto & Style" });

function caller(result: unknown | Error) {
  const fn = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return fn as unknown as StructuredCaller & ReturnType<typeof vi.fn>;
}

describe("fit score schema", () => {
  it.each([
    ["score above 100", { scores: [{ trendId: "a", score: 120, reason: "x" }] }],
    ["negative score", { scores: [{ trendId: "a", score: -1, reason: "x" }] }],
    ["fractional score", { scores: [{ trendId: "a", score: 50.5, reason: "x" }] }],
    ["missing reason", { scores: [{ trendId: "a", score: 50 }] }],
  ])("rejects a %s", (_l, value) => {
    expect(FitScoresResponseSchema.safeParse(value).success).toBe(false);
  });
});

describe("scoreTrends", () => {
  it("scores every trend in one call, with each trend in its own <trend_data> block", async () => {
    const c = caller({
      scores: [
        { trendId: "a", score: 85, reason: "Pup-themed pastries" },
        { trendId: "b", score: 60, reason: "Cozy cafe corner" },
      ],
    });
    const r = await scoreTrends([a, b], DEMO_PROFILE, { caller: c });
    expect(r.source).toBe("llm");
    expect(r.scores.get("a")?.score).toBe(85);
    expect(c).toHaveBeenCalledTimes(1);
    expect(buildFitUserPrompt([a, b], DEMO_PROFILE).match(/<trend_data>/g)).toHaveLength(2);
  });

  it("ignores scores for trend IDs it didn't ask about", async () => {
    const r = await scoreTrends([a], DEMO_PROFILE, {
      caller: caller({ scores: [{ trendId: "a", score: 70, reason: "ok" }, { trendId: "zzz", score: 99, reason: "?" }] }),
    });
    expect([...r.scores.keys()]).toEqual(["a"]);
  });

  it("returns no scores and a friendly error when the LLM times out", async () => {
    const r = await scoreTrends([a], DEMO_PROFILE, { caller: caller(new LlmError("timeout", "slow")) });
    expect(r.scores.size).toBe(0);
    expect(r.error).toMatch(/took too long/);
  });

  it("returns no scores and a friendly error on invalid JSON", async () => {
    const r = await scoreTrends([a], DEMO_PROFILE, { caller: caller(new LlmError("invalid_output", "bad")) });
    expect(r.scores.size).toBe(0);
    expect(r.error).toMatch(/couldn't read/);
  });

  it("uses cached scores for the same profile and trends", async () => {
    const cache: FitCache = {
      promptVersion: FIT_PROMPT_VERSION,
      model: "test",
      entries: {
        [fitCacheKey([a, b], DEMO_PROFILE)]: {
          scores: [{ trendId: "a", score: 90, reason: "cached" }],
          createdAt: "2026-11-25",
        },
      },
    };
    const c = caller({ scores: [] });
    const r = await scoreTrends([b, a], DEMO_PROFILE, { cache, caller: c });
    expect(r.source).toBe("cache");
    expect(r.scores.get("a")?.reason).toBe("cached");
    expect(c).not.toHaveBeenCalled();
  });

  it("skips the LLM for an empty list", async () => {
    const c = caller({ scores: [] });
    await scoreTrends([], DEMO_PROFILE, { caller: c });
    expect(c).not.toHaveBeenCalled();
  });
});
