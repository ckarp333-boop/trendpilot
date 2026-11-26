import { z } from "zod";
import { categoryName } from "./categories";
import { TrendItemSchema, type TrendItem } from "./schema";

const API_URL = "https://www.googleapis.com/youtube/v3/videos";
const MAX_TAGS = 10;

/** The slice of a videos.list response we read. Everything else is ignored. */
const VideosResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.object({
          title: z.string(),
          channelTitle: z.string(),
          categoryId: z.string(),
          publishedAt: z.string(),
          tags: z.array(z.string()).optional(),
        }),
        statistics: z.object({ viewCount: z.string().optional() }).optional(),
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

const MENTION = /@[\p{L}\p{N}._-]+/gu;

/** Remove @handles (other people tagged in a title) and tidy whitespace. */
export function stripMentions(text: string): string {
  return text.replace(MENTION, "").replace(/\s{2,}/g, " ").trim();
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
    views: Number(video.statistics?.viewCount ?? 0),
    publishedAt: video.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
    tags: (video.snippet.tags ?? [])
      .map((t) => stripMentions(t))
      .filter((t) => t.length > 0 && t.length <= 100)
      .slice(0, MAX_TAGS),
  });
  return parsed.success ? parsed.data : null;
}

/** videos.list chart=mostPopular for one category. Never puts the API key in errors. */
export async function fetchMostPopular(
  categoryId: number,
  { apiKey, regionCode = "CA", maxResults = 5, timeoutMs = 10_000, fetchImpl = fetch }: FetchOptions,
): Promise<TrendItem[]> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    chart: "mostPopular",
    regionCode,
    videoCategoryId: String(categoryId),
    maxResults: String(maxResults),
    key: apiKey,
  });

  let res: Response;
  try {
    res = await fetchImpl(`${API_URL}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const name = (err as { name?: unknown } | null)?.name;
    const reason = name === "TimeoutError" || name === "AbortError" ? "timed out" : "network error";
    throw new YouTubeApiError(`YouTube request for category ${categoryId} failed (${reason})`);
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const apiMessage = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(body).data?.error.message;
    throw new YouTubeApiError(
      `YouTube returned ${res.status} for category ${categoryId}${apiMessage ? `: ${apiMessage}` : ""}`,
      res.status,
    );
  }

  const parsed = VideosResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new YouTubeApiError(`Unexpected YouTube response shape for category ${categoryId}`);
  }
  return parsed.data.items.map(mapVideo).filter((v): v is TrendItem => v !== null);
}

export interface FetchTrendingResult {
  items: TrendItem[];
  errors: { categoryId: number; message: string }[];
}

/** Fetch several categories in parallel. One failing category doesn't sink the rest. */
export async function fetchTrending(
  categoryIds: readonly number[],
  options: FetchOptions,
): Promise<FetchTrendingResult> {
  const results = await Promise.allSettled(categoryIds.map((id) => fetchMostPopular(id, options)));
  const seen = new Set<string>();
  const items: TrendItem[] = [];
  const errors: FetchTrendingResult["errors"] = [];

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      errors.push({
        categoryId: categoryIds[i],
        message: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
      return;
    }
    for (const item of r.value) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  });

  return { items, errors };
}
