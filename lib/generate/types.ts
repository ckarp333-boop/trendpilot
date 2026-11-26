import type { FilterLayer } from "../safety/filter";
import type { TrendItem } from "../youtube/schema";
import type { Concept, FitScore } from "./schemas";

/** POST /api/trends response. */
export interface TrendsResponse {
  businessName: string;
  snapshot: { source: "youtube-api" | "synthetic" | "live"; fetchedAt: string; warning?: string };
  kept: { item: TrendItem; fit?: FitScore; safetyReason: string }[];
  filteredOut: { item: TrendItem; layer: FilterLayer; reason: string }[];
  fitError?: string;
}

/** POST /api/generate response. */
export interface GenerateResponse {
  concepts: Concept[];
  source: "cache" | "llm";
  trend: { id: string; url: string; categoryName: string };
}
