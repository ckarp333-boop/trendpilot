import { z } from "zod";
import type { CalendarEntry } from "./calendar-store";

/** The value metrics the owner can switch on. Speed to market is measured automatically. */
export const METRICS = [
  { key: "speed", label: "Speed to market", help: "Hours from trend captured to post marked posted (automatic)." },
  { key: "timeSaved", label: "Time saved", help: "Your estimate of minutes saved versus writing the post from scratch." },
  { key: "attention", label: "Attention", help: "Views or impressions, from the platform's own insights." },
  { key: "engagement", label: "Engagement", help: "Likes + comments + shares + saves." },
  { key: "clicks", label: "Clicks", help: "Link or profile clicks, from the platform's insights." },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

/** Largest count the owner can enter. parseCount clamps to it, so stored state always validates. */
export const MAX_COUNT = 1_000_000_000;

const count = z.int().min(0).max(MAX_COUNT);

export const PostMetricsSchema = z.object({
  timeSavedMinutes: count.optional(),
  impressions: count.optional(),
  engagements: count.optional(),
  clicks: count.optional(),
});
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
export type EnteredField = keyof PostMetrics;

export const MetricsStateSchema = z.object({
  enabled: z.record(z.string(), z.boolean()),
  // One bad entry (hand-edited storage, older app version) drops only that post's values,
  // not every metric the owner has entered.
  values: z.record(z.string(), PostMetricsSchema.catch({})),
});
export type MetricsState = z.infer<typeof MetricsStateSchema>;

export const DEFAULT_METRICS_STATE: MetricsState = {
  enabled: { speed: true, timeSaved: true, attention: true, engagement: true, clicks: true },
  values: {},
};

/** Owner input -> a whole number from 0 to MAX_COUNT, or undefined for blank/invalid. */
export function parseCount(input: string): number | undefined {
  const t = input.trim().replace(/,/g, "");
  if (t === "") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.round(n), MAX_COUNT);
}

export function speedHours(entry: CalendarEntry): number | null {
  if (!entry.postedAt) return null;
  const ms = new Date(entry.postedAt).getTime() - new Date(entry.trendCapturedAt).getTime();
  return Math.max(0, ms / 3_600_000);
}

export interface Totals {
  planned: number;
  posted: number;
  avgSpeedHours: number | null;
  timeSavedMinutes: number;
  impressions: number;
  engagements: number;
  clicks: number;
  /** engagements / impressions, over posts that have both. */
  engagementRate: number | null;
}

export function computeTotals(entries: readonly CalendarEntry[], values: MetricsState["values"]): Totals {
  const speeds = entries.map(speedHours).filter((h): h is number => h !== null);
  let timeSavedMinutes = 0;
  let impressions = 0;
  let engagements = 0;
  let clicks = 0;
  let rateImpressions = 0;
  let rateEngagements = 0;

  for (const e of entries) {
    const v = values[e.id];
    if (!v) continue;
    timeSavedMinutes += v.timeSavedMinutes ?? 0;
    impressions += v.impressions ?? 0;
    engagements += v.engagements ?? 0;
    clicks += v.clicks ?? 0;
    if (v.impressions && v.engagements !== undefined) {
      rateImpressions += v.impressions;
      rateEngagements += v.engagements;
    }
  }

  return {
    planned: entries.length,
    posted: speeds.length,
    avgSpeedHours: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
    timeSavedMinutes,
    impressions,
    engagements,
    clicks,
    engagementRate: rateImpressions > 0 ? rateEngagements / rateImpressions : null,
  };
}

export function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}
