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

/** How long one live fetch is reused. Keeps the dashboard, trend page and generate call on the same list. */
export const LIVE_TTL_MS = 10 * 60_000;

let live: { at: number; promise: Promise<TrendSource> } | undefined;

/** Forget the cached live fetch (tests). */
export function resetLiveCache(): void {
  live = undefined;
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

  // Reuse one live fetch for LIVE_TTL_MS (per server instance), so every page view doesn't cost
  // quota and a trend picked on the dashboard is still in the list when /api/generate runs.
  // Concurrent requests share the in-flight promise.
  const now = Date.now();
  if (!live || now - live.at > LIVE_TTL_MS) {
    const promise = fetchLive(apiKey, fromSnapshot);
    live = { at: now, promise };
    // Don't keep a fallback result or a failure: try YouTube again on the next request.
    const forget = () => {
      if (live?.promise === promise) live = undefined;
    };
    promise.then((r) => r.source !== "live" && forget(), forget);
  }
  return live.promise;
}

async function fetchLive(apiKey: string, fromSnapshot: TrendSource): Promise<TrendSource> {
  const { items, errors } = await fetchTrending(SNAPSHOT_CATEGORY_IDS, { apiKey });
  if (items.length === 0) {
    return {
      ...fromSnapshot,
      warning: `Live YouTube fetch returned nothing (${errors.length} errors); showing the saved snapshot.`,
    };
  }
  return { items, source: "live", fetchedAt: new Date().toISOString() };
}
