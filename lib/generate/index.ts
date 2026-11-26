import "server-only";
import { callStructured } from "../llm/client";
import type { BrandProfile } from "../profile/schema";
import { getSafeTrends, type KeptTrend, type SafeTrends } from "../safety";
import { loadConceptCache, loadFitCache } from "./cache";
import { generateConcepts, type ConceptResult } from "./concepts";
import { scoreTrends } from "./fit";
import type { FitScore } from "./schemas";

export type { Concept, FitScore } from "./schemas";

function liveCaller() {
  return process.env.ANTHROPIC_API_KEY ? callStructured : undefined;
}

export interface ScoredTrend extends KeptTrend {
  fit?: FitScore;
}

export interface ScoredTrends extends Omit<SafeTrends, "kept"> {
  kept: ScoredTrend[];
  fitSource: "cache" | "llm" | "none";
  fitError?: string;
}

/** Safe trends for this profile, ranked by fit score (unscored trends last, by views). */
export async function getScoredTrends(profile: BrandProfile): Promise<ScoredTrends> {
  const safe = await getSafeTrends(profile.topicsToAvoid);
  const fit = await scoreTrends(
    safe.kept.map((k) => k.item),
    profile,
    { cache: loadFitCache(), caller: liveCaller() },
  );
  const kept = safe.kept
    .map((k) => ({ ...k, fit: fit.scores.get(k.item.id) }))
    .sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1) || b.item.views - a.item.views);
  return { ...safe, kept, fitSource: fit.source, fitError: fit.error };
}

/**
 * Concepts for one trend. Returns null if the trend isn't in this profile's safe list:
 * we never generate posts for a trend that didn't pass the safety filter.
 */
export async function getConceptsForTrend(
  trendId: string,
  profile: BrandProfile,
): Promise<(ConceptResult & { trend: KeptTrend["item"] }) | null> {
  const safe = await getSafeTrends(profile.topicsToAvoid);
  const kept = safe.kept.find((k) => k.item.id === trendId);
  if (!kept) return null;
  const result = await generateConcepts(kept.item, profile, {
    cache: loadConceptCache(),
    caller: liveCaller(),
  });
  return { ...result, trend: kept.item };
}
