import "server-only";
import { callStructured } from "../llm/client";
import { DEMO_PROFILE } from "../profile/schema";
import { getTrendItems, type TrendSource } from "../youtube";
import { loadSafetyCache } from "./cache";
import { filterTrends, type FilterResult } from "./filter";
import { createSafetyChecker } from "./llm-check";

export type { FilteredOutTrend, FilterLayer, FilterResult, KeptTrend } from "./filter";

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
  });
  const result = await filterTrends(source.items, { topicsToAvoid, checker });
  return { ...result, source };
}
