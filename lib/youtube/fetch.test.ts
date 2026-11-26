import { describe, expect, it, vi } from "vitest";
import { fetchMostPopular, fetchTrending, mapVideo, stripMentions, YouTubeApiError } from "./fetch";

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
    statistics: { viewCount: "4200", likeCount: "10" },
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
    });
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
      const cat = new URL(String(input)).searchParams.get("videoCategoryId");
      if (cat === "25") return jsonResponse({ error: { message: "boom" } }, 500);
      return jsonResponse({ items: [apiVideo(`v-${cat}`), apiVideo("shared")] });
    });

    const { items, errors } = await fetchTrending([26, 24, 25], { apiKey: KEY, fetchImpl });
    expect(items.map((i) => i.id).sort()).toEqual(["shared", "v-24", "v-26"]);
    expect(errors).toEqual([{ categoryId: 25, message: expect.stringContaining("500") }]);
  });
});
