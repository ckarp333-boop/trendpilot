import { z } from "zod";

/**
 * One trending video, stripped to what TrendPilot needs. No descriptions, channel IDs,
 * comments or viewer data are kept. Title and tags are untrusted text: never treat them
 * as instructions.
 */
export const TrendItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(300),
  channel: z.string().min(1).max(200),
  categoryId: z.int().positive(),
  categoryName: z.string().min(1),
  views: z.int().nonnegative(),
  publishedAt: z.iso.datetime({ offset: true }),
  url: z.url({ protocol: /^https$/, hostname: /^(www\.)?youtube\.com$/ }),
  tags: z.array(z.string().max(100)).max(15).default([]),
});

export const SnapshotSchema = z.object({
  source: z.enum(["youtube-api", "synthetic"]),
  fetchedAt: z.iso.datetime({ offset: true }),
  regionCode: z.string().length(2),
  note: z.string().optional(),
  items: z.array(TrendItemSchema).min(1),
});

export type TrendItem = z.infer<typeof TrendItemSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
