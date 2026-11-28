/**
 * Refresh the counts (views, likes, comments, channel subscribers) for the videos already in
 * data/youtube-snapshot.json, without changing which videos are in it.
 * Usage: npm run refresh:stats
 *
 * Titles, tags and categories are kept exactly as they are, so the cached safety verdicts,
 * fit scores and concepts (keyed on that text) stay valid and demo mode keeps working offline.
 * Costs 2 quota units for up to 50 videos. Reads YOUTUBE_API_KEY from .env.local; never prints it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { fetchVideosById, withSubscribers } from "../lib/youtube/fetch";
import { SnapshotSchema } from "../lib/youtube/schema";

async function main() {
  loadEnvConfig(process.cwd());
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YOUTUBE_API_KEY is not set in .env.local. Snapshot not changed.");
    process.exit(2);
  }

  const path = join(process.cwd(), "data", "youtube-snapshot.json");
  const snapshot = SnapshotSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  const fetchedAt = new Date().toISOString();

  const videos = await fetchVideosById(
    snapshot.items.map((i) => i.id),
    { apiKey },
  );
  const { items: fresh, error } = await withSubscribers(videos, { apiKey });
  if (error) console.warn(`! subscribers: ${error}`);
  const byId = new Map(fresh.map((i) => [i.id, i]));

  let updated = 0;
  const items = snapshot.items.map((old) => {
    const f = byId.get(old.id);
    if (!f) {
      console.warn(`! ${old.id}: no longer available; counts left as they were`);
      return old;
    }
    updated++;
    // Only counts change. Text fields stay identical so cache keys still match.
    return {
      ...old,
      views: f.views,
      likes: f.likes,
      comments: f.comments,
      // If the channels lookup failed, keep the counts we already had rather than erasing them.
      channelSubscribers: error ? (f.channelSubscribers ?? old.channelSubscribers) : f.channelSubscribers,
    };
  });

  if (updated === 0) {
    console.error("No videos could be refreshed. Snapshot not changed.");
    process.exit(1);
  }

  const out = SnapshotSchema.parse({
    ...snapshot,
    // Velocity is views / hours since publishing, so fetchedAt must match the new counts.
    fetchedAt,
    note: `${(snapshot.note ?? "").replace(/ Counts \(views.*$/, "")} Counts (views, likes, comments, channel subscribers) refreshed ${fetchedAt.slice(0, 10)} via videos.list by ID and channels.list; titles and tags unchanged.`.trim(),
    items,
  });
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");

  const withSubs = items.filter((i) => i.channelSubscribers !== undefined).length;
  const withLikes = items.filter((i) => i.likes !== undefined).length;
  console.log(
    `Refreshed ${updated}/${items.length} videos (${withLikes} with likes, ${withSubs} with subscriber counts).`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
