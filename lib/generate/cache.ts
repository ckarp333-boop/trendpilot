import rawConcepts from "../../data/cache/concepts.json";
import rawFit from "../../data/cache/fit-scores.json";
import { ConceptCacheSchema, FitCacheSchema, type ConceptCache, type FitCache } from "./schemas";

const EMPTY = { promptVersion: "none", model: "none", entries: {} };

let fit: FitCache | undefined;
let concepts: ConceptCache | undefined;

/** Saved fit scores (data/cache/fit-scores.json). Invalid file = empty cache. */
export function loadFitCache(): FitCache {
  fit ??= FitCacheSchema.safeParse(rawFit).data ?? EMPTY;
  return fit;
}

/** Saved post concepts (data/cache/concepts.json). Invalid file = empty cache. */
export function loadConceptCache(): ConceptCache {
  concepts ??= ConceptCacheSchema.safeParse(rawConcepts).data ?? EMPTY;
  return concepts;
}
