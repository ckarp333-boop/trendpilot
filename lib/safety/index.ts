import "server-only";
import { callStructured } from "../llm/client";
import { DEMO_PROFILE } from "../profile/schema";
import { getTrendItems, type TrendSource } from "../youtube";
import { loadSafetyCache } from "./cache";
import { filterTrends, type FilterResult } from "./filter";
import { createSafetyChecker, type SourcedVerdict } from "./llm-check";

export type { FilteredOutTrend, FilterLayer, FilterResult, KeptTrend } from "./filter";

/**
 * Live LLM verdicts kept for the life of this server instance, keyed by video + text hash, so
 * live mode doesn't re-check the same video on every request. Bounded to avoid unbounded growth.
 */
const liveVerdicts = new Map<string, SourcedVerdict>();
const MAX_LIVE_VERDICTS = 1000;

export interface SafeTrends extends FilterResult {
  source: TrendSource;
}

/**
 * Trends that passed all safety layers, plus the ones filtered out and why.
 * Uses cached LLM verdicts first; calls the LLM for uncached trends only when an
 * ANTHROPIC_API_KEY is configured (LLM calls are allowed even in DEMO_MODE).
 */
export async function getSafeTrends(
  topicsToAvoid: readonly string[] = DEMO_PROFILE.topicsToAvoid,
): Promise<SafeTrends> {
  const source = await getTrendItems();
  const checker = createSafetyChecker({
    cache: loadSafetyCache(),
    caller: process.env.ANTHROPIC_API_KEY ? callStructured : undefined,
    memo: liveVerdicts,
  });
  if (liveVerdicts.size > MAX_LIVE_VERDICTS) liveVerdicts.clear();
  const result = await filterTrends(source.items, { topicsToAvoid, checker });
  return { ...result, source };
}
