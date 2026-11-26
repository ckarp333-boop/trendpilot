import "server-only";
import { SNAPSHOT_CATEGORY_IDS } from "./categories";
import { fetchTrending } from "./fetch";
import type { TrendItem } from "./schema";
import { loadSavedSnapshot } from "./snapshot";

export * from "./categories";
export * from "./schema";

export interface TrendSource {
  items: TrendItem[];
  source: "youtube-api" | "synthetic" | "live";
  fetchedAt: string;
  /** Set when a live fetch failed and we fell back to the saved snapshot. */
  warning?: string;
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}

/**
 * Trends for the app. DEMO_MODE (the default) only reads the saved snapshot and makes no
 * network calls. With DEMO_MODE=false it calls the YouTube Data API and falls back to the
 * snapshot if that fails or returns nothing.
 */
export async function getTrendItems(): Promise<TrendSource> {
  const snapshot = loadSavedSnapshot();
  const fromSnapshot: TrendSource = {
    items: snapshot.items,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
  };

  if (isDemoMode()) return fromSnapshot;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return { ...fromSnapshot, warning: "YOUTUBE_API_KEY is not set; showing the saved snapshot." };
  }

  const { items, errors } = await fetchTrending(SNAPSHOT_CATEGORY_IDS, { apiKey });
  if (items.length === 0) {
    return {
      ...fromSnapshot,
      warning: `Live YouTube fetch returned nothing (${errors.length} errors); showing the saved snapshot.`,
    };
  }
  return { items, source: "live", fetchedAt: new Date().toISOString() };
}
