import type { TrendItem } from "../youtube/schema";

/** Synthetic trend for tests. */
export function trend(overrides: Partial<TrendItem> = {}): TrendItem {
  const id = overrides.id ?? `t-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: "Golden retriever learns to open the fridge",
    channel: "Synthetic Pets",
    categoryId: 15,
    categoryName: "Pets & Animals",
    views: 1000,
    publishedAt: "2026-11-24T15:00:00Z",
    url: `https://www.youtube.com/watch?v=${id}`,
    tags: [],
    ...overrides,
  };
}
