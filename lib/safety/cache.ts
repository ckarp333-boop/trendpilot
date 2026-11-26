import rawCache from "../../data/cache/safety-checks.json";
import { SafetyCacheSchema, type SafetyCache } from "./llm-check";

let cached: SafetyCache | undefined;

/** Saved LLM safety verdicts (data/cache/safety-checks.json). Invalid file = empty cache. */
export function loadSafetyCache(): SafetyCache {
  if (!cached) {
    const parsed = SafetyCacheSchema.safeParse(rawCache);
    cached = parsed.success ? parsed.data : { promptVersion: "none", model: "none", entries: {} };
  }
  return cached;
}
