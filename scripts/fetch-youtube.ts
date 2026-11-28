/**
 * Refresh data/youtube-snapshot.json from the YouTube Data API.
 * Usage: npm run fetch:youtube
 * Reads YOUTUBE_API_KEY from .env.local (via @next/env). Never prints the key.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { SNAPSHOT_CATEGORY_IDS } from "../lib/youtube/categories";
import { fetchTrending } from "../lib/youtube/fetch";
import { SnapshotSchema } from "../lib/youtube/schema";

const MIN_ITEMS = 10;

async function main() {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YOUTUBE_API_KEY is not set in .env.local. Snapshot not changed.");
    process.exit(2);
  }

  const { items, errors } = await fetchTrending(SNAPSHOT_CATEGORY_IDS, {
    apiKey,
    regionCode: "CA",
    maxResults: 5,
  });

  for (const e of errors) console.warn(`! ${e.categoryId ? `category ${e.categoryId}` : "subscribers"}: ${e.message}`);
  const perCategory = Object.groupBy(items, (i) => String(i.categoryId));
  for (const id of SNAPSHOT_CATEGORY_IDS) {
    console.log(`category ${id}: ${perCategory[String(id)]?.length ?? 0} videos`);
  }

  if (items.length < MIN_ITEMS) {
    console.error(`Only ${items.length} videos returned (need ${MIN_ITEMS}). Snapshot not changed.`);
    process.exit(1);
  }

  const snapshot = SnapshotSchema.parse({
    source: "youtube-api",
    fetchedAt: new Date().toISOString(),
    regionCode: "CA",
    note: "Public YouTube Data API v3 videos.list chart=mostPopular, regionCode=CA. Stripped to title, channel, category, views, likes, comments, publishedAt, url, up to 10 tags and the channel's public subscriber count (channels.list; channel IDs not kept); @mentions of other people removed. Titles are untrusted data.",
    items,
  });

  const out = join(process.cwd(), "data", "youtube-snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  console.log(`Saved ${items.length} videos to data/youtube-snapshot.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
