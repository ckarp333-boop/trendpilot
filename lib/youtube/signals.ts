import type { TrendItem } from "./schema";

/**
 * Engagement signals worked out from public YouTube counts. Pure maths, no API calls,
 * so the same numbers show up in demo mode and live mode.
 */
export interface TrendSignals {
  /** Hours between publishing and when the counts were captured (at least 1). */
  hoursLive: number;
  /** Views per hour since publishing: how fast the video is spreading. */
  viewsPerHour: number;
  /** (likes + comments) / views. Null when likes are hidden or there are no views. */
  engagementRate: number | null;
  /** Views / channel subscribers. Above 1 means it reached well beyond the channel's own audience. */
  breakoutRatio: number | null;
}

const HOUR_MS = 3_600_000;

/** @param asOf when the counts were captured (the snapshot's fetchedAt). */
export function computeSignals(item: TrendItem, asOf: string | Date): TrendSignals {
  const elapsed = new Date(asOf).getTime() - new Date(item.publishedAt).getTime();
  // Floor at 1 hour so a video captured minutes after upload doesn't get an absurd rate.
  const hoursLive = Math.max(1, Number.isFinite(elapsed) ? elapsed / HOUR_MS : 1);

  const engagementRate =
    item.likes !== undefined && item.views > 0 ? (item.likes + (item.comments ?? 0)) / item.views : null;

  const breakoutRatio =
    item.channelSubscribers !== undefined && item.channelSubscribers > 0
      ? item.views / item.channelSubscribers
      : null;

  return { hoursLive, viewsPerHour: item.views / hoursLive, engagementRate, breakoutRatio };
}
