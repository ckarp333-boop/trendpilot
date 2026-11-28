import { z } from "zod";
import { categoryName } from "./categories";
import { TrendItemSchema, type TrendItem } from "./schema";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_TAGS = 10;
/** videos.list and channels.list accept up to 50 IDs per call (1 quota unit each). */
const BATCH_SIZE = 50;

const count = z.string().optional();

/** The slice of a videos.list response we read. Everything else is ignored. */
const VideosResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          channelTitle: z.string(),
          channelId: z.string().optional(),
          categoryId: z.string(),
          publishedAt: z.string(),
          tags: z.array(z.string()).optional(),
        }),
        statistics: z.object({ viewCount: count, likeCount: count, commentCount: count }).optional(),
      }),
    )
    .default([]),
});

/** The slice of a channels.list response we read. */
const ChannelsResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        statistics: z
          .object({ subscriberCount: count, hiddenSubscriberCount: z.boolean().optional() })
          .optional(),
      }),
    )
    .default([]),
});

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

export interface FetchOptions {
  apiKey: string;
  regionCode?: string;
  maxResults?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type ApiVideo = z.infer<typeof VideosResponseSchema>["items"][number];

/** A mapped video plus its channel ID, used to look up subscribers and then dropped. */
export interface FetchedVideo {
  item: TrendItem;
  channelId?: string;
}

const MENTION = /@[\p{L}\p{N}._-]+/gu;

/** Remove @handles (other people tagged in a title) and tidy whitespace. */
export function stripMentions(text: string): string {
  return text.replace(MENTION, "").replace(/\s{2,}/g, " ").trim();
}

/** A YouTube count string as a non-negative integer, or undefined if hidden or invalid. */
function toCount(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined;
}

/** Map one API video to a TrendItem, dropping everything we don't need. */
export function mapVideo(video: ApiVideo): TrendItem | null {
  const categoryId = Number(video.snippet.categoryId);
  const parsed = TrendItemSchema.safeParse({
    id: video.id,
    title: stripMentions(video.snippet.title),
    channel: video.snippet.channelTitle.trim(),
    categoryId,
    categoryName: categoryName(categoryId),
    views: toCount(video.statistics?.viewCount) ?? 0,
    publishedAt: video.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    tags: (video.snippet.tags ?? [])
      .map((t) => stripMentions(t))
      .filter((t) => t.length > 0 && t.length <= 100)
      .slice(0, MAX_TAGS),
    likes: toCount(video.statistics?.likeCount),
    comments: toCount(video.statistics?.commentCount),
  });
  return parsed.success ? parsed.data : null;
}

/** GET one YouTube Data API endpoint. Never puts the API key in errors. */
async function getJson(
  endpoint: "videos" | "channels",
  params: Record<string, string>,
  what: string,
  { apiKey, timeoutMs = 10_000, fetchImpl = fetch }: FetchOptions,
): Promise<unknown> {
  const query = new URLSearchParams({ ...params, key: apiKey });
  let res: Response;
  try {
    res = await fetchImpl(`${API_BASE}/${endpoint}?${query}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const name = (err as { name?: unknown } | null)?.name;
    const reason = name === "TimeoutError" || name === "AbortError" ? "timed out" : "network error";
    throw new YouTubeApiError(`YouTube request for ${what} failed (${reason})`);
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const apiMessage = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(body).data?.error.message;
    throw new YouTubeApiError(
      `YouTube returned ${res.status} for ${what}${apiMessage ? `: ${apiMessage}` : ""}`,
      res.status,
    );
  }
  return body;
}

function parseVideos(body: unknown, what: string): FetchedVideo[] {
  const parsed = VideosResponseSchema.safeParse(body);
  if (!parsed.success) throw new YouTubeApiError(`Unexpected YouTube response shape for ${what}`);
  return parsed.data.items.flatMap((v) => {
    const item = mapVideo(v);
    return item ? [{ item, channelId: v.snippet.channelId }] : [];
  });
}

function chunks<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function fetchMostPopularVideos(categoryId: number, options: FetchOptions): Promise<FetchedVideo[]> {
  const what = `category ${categoryId}`;
  const body = await getJson(
    "videos",
    {
      part: "snippet,statistics",
      chart: "mostPopular",
      regionCode: options.regionCode ?? "CA",
      videoCategoryId: String(categoryId),
      maxResults: String(options.maxResults ?? 5),
    },
    what,
    options,
  );
  return parseVideos(body, what);
}

/** videos.list chart=mostPopular for one category (1 quota unit). */
export async function fetchMostPopular(categoryId: number, options: FetchOptions): Promise<TrendItem[]> {
  return (await fetchMostPopularVideos(categoryId, options)).map((v) => v.item);
}

/** videos.list by ID, 50 per call (1 quota unit each). Deleted or private videos are skipped. */
export async function fetchVideosById(ids: readonly string[], options: FetchOptions): Promise<FetchedVideo[]> {
  const out: FetchedVideo[] = [];
  for (const batch of chunks(ids, BATCH_SIZE)) {
    const what = `${batch.length} videos by ID`;
    const body = await getJson("videos", { part: "snippet,statistics", id: batch.join(",") }, what, options);
    out.push(...parseVideos(body, what));
  }
  return out;
}

/**
 * Public subscriber counts by channel ID via channels.list, 50 per call (1 quota unit each).
 * Channels that hide their count are left out of the map.
 */
export async function fetchChannelSubscribers(
  channelIds: readonly string[],
  options: FetchOptions,
): Promise<Map<string, number>> {
  const subs = new Map<string, number>();
  for (const batch of chunks([...new Set(channelIds)], BATCH_SIZE)) {
    const what = `${batch.length} channels`;
    const body = await getJson("channels", { part: "statistics", id: batch.join(",") }, what, options);
    const parsed = ChannelsResponseSchema.safeParse(body);
    if (!parsed.success) throw new YouTubeApiError(`Unexpected YouTube response shape for ${what}`);
    for (const ch of parsed.data.items) {
      const n = toCount(ch.statistics?.subscriberCount);
      if (n !== undefined && !ch.statistics?.hiddenSubscriberCount) subs.set(ch.id, n);
    }
  }
  return subs;
}

/** Add channel subscriber counts to videos and drop the channel IDs. */
export async function withSubscribers(
  videos: readonly FetchedVideo[],
  options: FetchOptions,
): Promise<{ items: TrendItem[]; error?: string }> {
  const ids = videos.flatMap((v) => (v.channelId ? [v.channelId] : []));
  let subs = new Map<string, number>();
  let error: string | undefined;
  if (ids.length > 0) {
    try {
      subs = await fetchChannelSubscribers(ids, options);
    } catch (err) {
      // Subscribers are a nice-to-have: keep the trends, just without breakout ratios.
      error = err instanceof Error ? err.message : String(err);
    }
  }
  const items = videos.map(({ item, channelId }) => {
    const channelSubscribers = channelId ? subs.get(channelId) : undefined;
    return channelSubscribers === undefined ? item : { ...item, channelSubscribers };
  });
  return { items, error };
}

export interface FetchTrendingResult {
  items: TrendItem[];
  /** categoryId is missing for an error from the channel-subscriber lookup. */
  errors: { categoryId?: number; message: string }[];
}

/**
 * Fetch several categories in parallel, then channels.list for subscriber counts
 * (1 extra quota unit per 50 channels). One failing category doesn't sink the rest.
 */
export async function fetchTrending(
  categoryIds: readonly number[],
  options: FetchOptions,
): Promise<FetchTrendingResult> {
  const results = await Promise.allSettled(categoryIds.map((id) => fetchMostPopularVideos(id, options)));
  const seen = new Set<string>();
  const videos: FetchedVideo[] = [];
  const errors: FetchTrendingResult["errors"] = [];

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push({
        categoryId: categoryIds[i],
        message: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
      return;
    }
    for (const v of r.value) {
      if (!seen.has(v.item.id)) {
        seen.add(v.item.id);
        videos.push(v);
      }
    }
  });

  const { items, error } = await withSubscribers(videos, options);
  if (error) errors.push({ message: error });
  return { items, errors };
}
