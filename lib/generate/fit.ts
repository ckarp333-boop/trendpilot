import { LlmError, type StructuredCaller } from "../llm/client";
import { shortHash, trendDataBlock, UNTRUSTED_TREND_RULE } from "../llm/untrusted";
import type { BrandProfile } from "../profile/schema";
import { safetyCacheKey } from "../safety/llm-check";
import type { TrendItem } from "../youtube/schema";
import { brandProfileBlock, profileHash, PROFILE_RULE } from "./profile-prompt";
import { FitScoresResponseSchema, type FitCache, type FitScore } from "./schemas";

export const FIT_PROMPT_VERSION = "fit-v1";

export const FIT_SYSTEM_PROMPT = `You help a small local business decide which trending YouTube topics it could join in on with an original social media post.

For each trend, give a fit score from 0 to 100 for how naturally THIS business could reference the trend's theme in a post that feels on-brand for its products, tone and audience:
- 80-100: an obvious, natural tie-in that customers would enjoy
- 50-79: a workable tie-in with a little creativity
- 20-49: a stretch; the link would feel forced
- 0-19: no sensible link

Also give a one-line reason (under 15 words) that names the tie-in. Score every trend you are given, using its id exactly as provided.

${UNTRUSTED_TREND_RULE}
${PROFILE_RULE}`;

export function buildFitUserPrompt(items: readonly TrendItem[], profile: BrandProfile): string {
  const trends = items.map((item) => trendDataBlock(item, item.id)).join("\n\n");
  return `${brandProfileBlock(profile)}\n\nScore these ${items.length} trends for this business.\n\n${trends}\n\nReturn JSON with one score per trend.`;
}

/** Same profile + same set of trends (by content) = same cached scores. */
export function fitCacheKey(items: readonly TrendItem[], profile: BrandProfile): string {
  const trendKeys = items.map(safetyCacheKey).sort();
  return `${profileHash(profile)}:${shortHash(...trendKeys)}`;
}

export interface ScoredResult {
  /** Scores by trend ID. Trends without a score are missing from the map. */
  scores: Map<string, FitScore>;
  source: "cache" | "llm" | "none";
  /** Friendly message when scoring failed. */
  error?: string;
}

export interface ScoreOptions {
  cache?: FitCache;
  caller?: StructuredCaller;
}

/**
 * Score all trends in one LLM call (cached by profile + trends). If scoring fails, returns
 * no scores and a friendly error; the app still shows the trends, just unranked.
 */
export async function scoreTrends(
  items: readonly TrendItem[],
  profile: BrandProfile,
  { cache, caller }: ScoreOptions,
): Promise<ScoredResult> {
  if (items.length === 0) return { scores: new Map(), source: "none" };

  const toMap = (list: FitScore[]) => {
    const ids = new Set(items.map((i) => i.id));
    return new Map(list.filter((s) => ids.has(s.trendId)).map((s) => [s.trendId, s]));
  };

  const key = fitCacheKey(items, profile);
  if (cache?.promptVersion === FIT_PROMPT_VERSION && cache.entries[key]) {
    return { scores: toMap(cache.entries[key].scores), source: "cache" };
  }
  if (!caller) {
    return { scores: new Map(), source: "none", error: "Fit scores aren't available offline for this profile." };
  }

  try {
    const out = await caller({
      schema: FitScoresResponseSchema,
      system: FIT_SYSTEM_PROMPT,
      user: buildFitUserPrompt(items, profile),
      effort: "low",
      maxTokens: 4096,
    });
    return { scores: toMap(out.scores), source: "llm" };
  } catch (err) {
    const msg = err instanceof LlmError ? err.userMessage : "Fit scores couldn't be calculated.";
    return { scores: new Map(), source: "none", error: msg };
  }
}
