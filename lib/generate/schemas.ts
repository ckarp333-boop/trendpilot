import { z } from "zod";

// ---- Fit scoring -----------------------------------------------------------

export const FitScoreSchema = z.object({
  trendId: z.string().min(1),
  score: z.int().min(0).max(100),
  reason: z.string().min(1).max(200),
});
export type FitScore = z.infer<typeof FitScoreSchema>;

export const FitScoresResponseSchema = z.object({
  scores: z.array(FitScoreSchema),
});

// ---- Post concepts ---------------------------------------------------------

export const ConceptSchema = z.object({
  hook: z.string().min(1).max(200),
  caption: z.string().min(1).max(1200),
  visualIdea: z.string().min(1).max(500),
  hashtags: z.array(z.string().regex(/^#[\p{L}\p{N}_]+$/u)).min(3).max(8),
  platform: z.string().min(1).max(40),
  postingWindow: z.string().min(1).max(100),
});
export type Concept = z.infer<typeof ConceptSchema>;

export const ConceptsResponseSchema = z.object({
  concepts: z.array(ConceptSchema).min(3),
});

// ---- Cache files -----------------------------------------------------------

const cacheBase = { promptVersion: z.string(), model: z.string() };

export const FitCacheSchema = z.object({
  ...cacheBase,
  entries: z.record(z.string(), z.object({ scores: z.array(FitScoreSchema), createdAt: z.string() })),
});
export type FitCache = z.infer<typeof FitCacheSchema>;

export const ConceptCacheSchema = z.object({
  ...cacheBase,
  entries: z.record(z.string(), z.object({ concepts: z.array(ConceptSchema), createdAt: z.string() })),
});
export type ConceptCache = z.infer<typeof ConceptCacheSchema>;
