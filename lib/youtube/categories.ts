/** YouTube video category IDs used by TrendPilot (regionCode=CA). */
export const YOUTUBE_CATEGORIES: Record<number, string> = {
  1: "Film & Animation",
  2: "Autos & Vehicles",
  10: "Music",
  15: "Pets & Animals",
  17: "Sports",
  19: "Travel & Events",
  20: "Gaming",
  22: "People & Blogs",
  23: "Comedy",
  24: "Entertainment",
  25: "News & Politics",
  26: "Howto & Style",
  28: "Science & Technology",
  29: "Nonprofits & Activism",
};

/** Safe categories from CLAUDE.md. */
export const SAFE_CATEGORY_IDS = [26, 24, 23, 22, 10, 17, 15] as const;

/**
 * Categories fetched into the snapshot. Includes 25 (News & Politics) on purpose so the
 * safety filter has something to reject in the demo.
 */
export const SNAPSHOT_CATEGORY_IDS = [...SAFE_CATEGORY_IDS, 25] as const;

export function categoryName(id: number): string {
  return YOUTUBE_CATEGORIES[id] ?? `Category ${id}`;
}
