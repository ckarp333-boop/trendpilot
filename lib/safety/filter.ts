import type { TrendItem } from "../youtube/schema";
import { BLOCKLIST, findTerm } from "./blocklist";
import { categoryRejection } from "./category";
import type { SafetyChecker, VerdictSource } from "./llm-check";
import { topicKeywords } from "./topics";

export type FilterLayer = "category" | "blocklist" | "profile" | "llm";

export interface FilteredOutTrend {
  item: TrendItem;
  layer: FilterLayer;
  reason: string;
}

export interface KeptTrend {
  item: TrendItem;
  safetyReason: string;
  verdictSource: VerdictSource;
}

export interface FilterResult {
  kept: KeptTrend[];
  filteredOut: FilteredOutTrend[];
}

export interface FilterOptions {
  topicsToAvoid: readonly string[];
  checker: SafetyChecker;
  /** Max LLM checks in flight at once. */
  concurrency?: number;
}

/** Layers 1-3 (no network). Returns why an item is rejected, or null if it may go to the LLM. */
export function keywordRejection(
  item: TrendItem,
  topicsToAvoid: readonly string[],
): Omit<FilteredOutTrend, "item"> | null {
  const category = categoryRejection(item.categoryId);
  if (category) return { layer: "category", reason: category };

  const texts = [item.title, ...item.tags];
  const blocked = findTerm(texts, BLOCKLIST);
  if (blocked) return { layer: "blocklist", reason: `Mentions "${blocked}" (blocked keyword)` };

  const topics = topicKeywords(topicsToAvoid);
  const hit = findTerm(texts, topics.map((t) => t.keyword));
  if (hit) {
    const topic = topics.find((t) => t.keyword === hit)!.topic;
    return { layer: "profile", reason: `Matches a topic to avoid: "${topic}"` };
  }
  return null;
}

/**
 * Run every trend through the safety layers in order: category allowlist, keyword blocklist,
 * profile topics to avoid, then the LLM check. A trend must pass all of them. Only trends that
 * pass layers 1-3 reach the LLM. Order of the input is preserved in both lists.
 */
export async function filterTrends(
  items: readonly TrendItem[],
  { topicsToAvoid, checker, concurrency = 4 }: FilterOptions,
): Promise<FilterResult> {
  type Outcome = { kept: KeptTrend } | { out: FilteredOutTrend };
  const outcomes: Outcome[] = new Array(items.length);
  const needsLlm: number[] = [];

  items.forEach((item, i) => {
    const rejected = keywordRejection(item, topicsToAvoid);
    if (rejected) outcomes[i] = { out: { item, ...rejected } };
    else needsLlm.push(i);
  });

  let next = 0;
  async function worker() {
    while (next < needsLlm.length) {
      const i = needsLlm[next++];
      const item = items[i];
      const v = await checker.check(item);
      outcomes[i] = v.safe
        ? { kept: { item, safetyReason: v.reason, verdictSource: v.source } }
        : { out: { item, layer: "llm", reason: v.reason } };
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const kept: KeptTrend[] = [];
  const filteredOut: FilteredOutTrend[] = [];
  for (const o of outcomes) {
    if ("kept" in o) kept.push(o.kept);
    else filteredOut.push(o.out);
  }
  return { kept, filteredOut };
}
