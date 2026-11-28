import { describe, expect, it, vi } from "vitest";
import {
  fetchChannelSubscribers,
  fetchMostPopular,
  fetchTrending,
  fetchVideosById,
  mapVideo,
  stripMentions,
  YouTubeApiError,
} from "./fetch";

const KEY = "test-key-do-not-leak";

function apiVideo(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    snippet: {
      title: `Video ${id}`,
      channelTitle: "Demo Channel",
      categoryId: "26",
      publishedAt: "2026-11-24T15:00:00Z",
      description: "Long description that must not be kept",
      channelId: "UC123",
      tags: ["baking"],
      ...overrides,
    },
    statistics: { viewCount: "4200", likeCount: "10", commentCount: "3" },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("stripMentions", () => {
  it("removes @handles, including non-English ones", () => {
    expect(stripMentions("Snow day 😂 @SomeCreator")).toBe("Snow day 😂");
    expect(stripMentions("The biker @DemirGöz wasn't ready")).toBe("The biker wasn't ready");
  });
});

describe("mapVideo", () => {
  it("keeps only the fields TrendPilot needs", () => {
    const item = mapVideo(apiVideo("v1"));
    expect(item).toEqual({
      id: "v1",
      title: "Video v1",
      channel: "Demo Channel",
      categoryId: 26,
      categoryName: "Howto & Style",
      views: 4200,
      publishedAt: "2026-11-24T15:00:00Z",
      url: "https://www.youtube.com/watch?v=v1",
      tags: ["baking"],
      likes: 10,
      comments: 3,
    });
  });

  it("leaves likes and comments out when YouTube hides them", () => {
    const item = mapVideo({ ...apiVideo("v4"), statistics: { viewCount: "50" } });
    expect(item?.likes).toBeUndefined();
    expect(item?.comments).toBeUndefined();
    expect(item?.views).toBe(50);
  });

  it("caps tags at 10 and drops tags that are only a mention", () => {
    const tags = ["@someone", ...Array.from({ length: 14 }, (_, i) => `tag${i}`)];
    const item = mapVideo(apiVideo("v2", { tags }));
    expect(item?.tags).toHaveLength(10);
    expect(item?.tags).not.toContain("@someone");
  });

  it("returns null for a video with an empty title", () => {
    expect(mapVideo(apiVideo("v3", { title: "  " }))).toBeNull();
  });
});

describe("fetchMostPopular", () => {
  it("calls videos.list chart=mostPopular for the category and region", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ items: [apiVideo("a")] }));
    const items = await fetchMostPopular(17, { apiKey: KEY, fetchImpl });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://www.googleapis.com/youtube/v3/videos");
    expect(url.searchParams.get("chart")).toBe("mostPopular");
    expect(url.searchParams.get("regionCode")).toBe("CA");
    expect(url.searchParams.get("videoCategoryId")).toBe("17");
    expect(items.map((i) => i.id)).toEqual(["a"]);
  });

  it("returns an empty list when YouTube has no items", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    await expect(fetchMostPopular(15, { apiKey: KEY, fetchImpl })).resolves.toEqual([]);
  });

  it("throws YouTubeApiError with the status and Google's message, never the key", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: "The request cannot be completed because you have exceeded your quota." } }, 403),
    );
    const err = await fetchMostPopular(26, { apiKey: KEY, fetchImpl }).catch((e) => e);
    expect(err).toBeInstanceOf(YouTubeApiError);
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/quota/);
    expect(err.message).not.toContain(KEY);
  });

  it("reports a timeout without leaking the key", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("timed out", "TimeoutError");
    });
    const err = await fetchMostPopular(26, { apiKey: KEY, fetchImpl }).catch((e) => e);
    expect(err.message).toMatch(/timed out/);
    expect(err.message).not.toContain(KEY);
  });

  it("rejects a response with an unexpected shape", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: "nope" }));
    await expect(fetchMostPopular(26, { apiKey: KEY, fetchImpl })).rejects.toThrow(/Unexpected/);
  });
});

describe("fetchTrending", () => {
  it("keeps results from working categories when one fails, and dedupes", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/channels")) return jsonResponse({ items: [] });
      const cat = url.searchParams.get("videoCategoryId");
      if (cat === "25") return jsonResponse({ error: { message: "boom" } }, 500);
      return jsonResponse({ items: [apiVideo(`v-${cat}`), apiVideo("shared")] });
    });

    const { items, errors } = await fetchTrending([26, 24, 25], { apiKey: KEY, fetchImpl });
    expect(items.map((i) => i.id).sort()).toEqual(["shared", "v-24", "v-26"]);
    expect(errors).toEqual([{ categoryId: 25, message: expect.stringContaining("500") }]);
  });
});

describe("channel subscribers", () => {
  it("adds subscriber counts with one channels.list call and drops channel IDs", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/channels")) {
        expect(url.searchParams.get("id")).toBe("UC123");
        return jsonResponse({ items: [{ id: "UC123", statistics: { subscriberCount: "52000" } }] });
      }
      return jsonResponse({ items: [apiVideo(`v-${url.searchParams.get("videoCategoryId")}`)] });
    });

    const { items, errors } = await fetchTrending([26, 24], { apiKey: KEY, fetchImpl });
    const channelCalls = fetchImpl.mock.calls.filter(([u]) => String(u).includes("/channels"));
    expect(channelCalls).toHaveLength(1);
    expect(errors).toEqual([]);
    expect(items.every((i) => i.channelSubscribers === 52000)).toBe(true);
    expect(items[0]).not.toHaveProperty("channelId");
  });

  it("skips channels that hide their subscriber count", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        items: [
          { id: "A", statistics: { subscriberCount: "100", hiddenSubscriberCount: true } },
          { id: "B", statistics: { subscriberCount: "200" } },
        ],
      }),
    );
    const subs = await fetchChannelSubscribers(["A", "B", "B"], { apiKey: KEY, fetchImpl });
    expect([...subs]).toEqual([["B", 200]]);
  });

  it("batches 50 channel IDs per call", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ items: [] }));
    const ids = Array.from({ length: 51 }, (_, i) => `UC${i}`);
    await fetchChannelSubscribers(ids, { apiKey: KEY, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps the trends when the subscriber lookup fails, and reports it", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) =>
      String(input).includes("/channels")
        ? jsonResponse({ error: { message: "quota" } }, 403)
        : jsonResponse({ items: [apiVideo("a")] }),
    );
    const { items, errors } = await fetchTrending([26], { apiKey: KEY, fetchImpl });
    expect(items.map((i) => i.id)).toEqual(["a"]);
    expect(items[0].channelSubscribers).toBeUndefined();
    expect(errors).toEqual([{ message: expect.stringContaining("403") }]);
    expect(errors[0].message).not.toContain(KEY);
  });
});

describe("fetchVideosById", () => {
  it("looks videos up by ID in one call and keeps their channel IDs for the subscriber step", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse({ items: [apiVideo("x"), apiVideo("y")] }));
    const videos = await fetchVideosById(["x", "y"], { apiKey: KEY, fetchImpl });
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.searchParams.get("id")).toBe("x,y");
    expect(url.searchParams.get("chart")).toBeNull();
    expect(videos.map((v) => [v.item.id, v.channelId])).toEqual([
      ["x", "UC123"],
      ["y", "UC123"],
    ]);
  });
});
