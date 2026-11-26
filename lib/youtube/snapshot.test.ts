import { describe, expect, it } from "vitest";
import { loadSavedSnapshot, parseSnapshot, SnapshotError } from "./snapshot";

const validItem = {
  id: "abc123",
  title: "Latte art in 30 seconds",
  channel: "Demo Channel",
  categoryId: 26,
  categoryName: "Howto & Style",
  views: 1200,
  publishedAt: "2026-11-24T15:00:00Z",
  url: "https://www.youtube.com/watch?v=abc123",
  tags: ["coffee"],
};

const validSnapshot = {
  source: "synthetic",
  fetchedAt: "2026-11-25T12:00:00.000Z",
  regionCode: "CA",
  items: [validItem],
};

function issuesFor(raw: unknown): string[] {
  try {
    parseSnapshot(raw);
  } catch (err) {
    expect(err).toBeInstanceOf(SnapshotError);
    return (err as SnapshotError).issues;
  }
  throw new Error("expected parseSnapshot to throw");
}

describe("saved snapshot (data/youtube-snapshot.json)", () => {
  it("is valid and non-empty", () => {
    const snap = loadSavedSnapshot();
    expect(snap.items.length).toBeGreaterThanOrEqual(10);
    expect(snap.regionCode).toBe("CA");
  });

  it("links every trend to its source video", () => {
    for (const item of loadSavedSnapshot().items) {
      expect(item.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
    }
  });

  it("has unique video IDs", () => {
    const ids = loadSavedSnapshot().items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains no @mentions of other people", () => {
    for (const item of loadSavedSnapshot().items) {
      expect(item.title).not.toMatch(/@\w/);
      for (const tag of item.tags) expect(tag).not.toMatch(/@\w/);
    }
  });
});

describe("parseSnapshot", () => {
  it("accepts a valid snapshot", () => {
    expect(parseSnapshot(validSnapshot).items[0].title).toBe("Latte art in 30 seconds");
  });

  it("defaults missing tags to an empty array", () => {
    const noTags: Partial<typeof validItem> = { ...validItem };
    delete noTags.tags;
    const snap = parseSnapshot({ ...validSnapshot, items: [noTags] });
    expect(snap.items[0].tags).toEqual([]);
  });

  it.each([
    ["null", null],
    ["a string", "not a snapshot"],
    ["an array", [validItem]],
  ])("rejects %s", (_label, raw) => {
    expect(() => parseSnapshot(raw)).toThrow(SnapshotError);
  });

  it("rejects a snapshot with no items", () => {
    expect(issuesFor({ ...validSnapshot, items: [] }).join()).toMatch(/^items/);
  });

  it("rejects an unknown source", () => {
    expect(issuesFor({ ...validSnapshot, source: "scraped" }).join()).toMatch(/^source/);
  });

  it.each([
    ["missing title", { title: undefined }, "items.0.title"],
    ["empty title", { title: "" }, "items.0.title"],
    ["negative views", { views: -5 }, "items.0.views"],
    ["fractional views", { views: 1.5 }, "items.0.views"],
    ["views as a string", { views: "1200" }, "items.0.views"],
    ["bad date", { publishedAt: "yesterday" }, "items.0.publishedAt"],
    ["non-YouTube url", { url: "https://evil.example.com/watch?v=abc" }, "items.0.url"],
    ["http url", { url: "http://www.youtube.com/watch?v=abc" }, "items.0.url"],
    ["tags not an array", { tags: "coffee" }, "items.0.tags"],
  ])("rejects an item with %s and names the field", (_label, patch, path) => {
    const issues = issuesFor({ ...validSnapshot, items: [{ ...validItem, ...patch }] });
    expect(issues.some((i) => i.startsWith(path))).toBe(true);
  });
});
