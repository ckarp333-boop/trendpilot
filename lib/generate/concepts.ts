import { LlmError, type StructuredCaller } from "../llm/client";
import { trendDataBlock, UNTRUSTED_TREND_RULE } from "../llm/untrusted";
import type { BrandProfile } from "../profile/schema";
import { safetyCacheKey } from "../safety/llm-check";
import type { TrendItem } from "../youtube/schema";
import { brandProfileBlock, profileHash, PROFILE_RULE } from "./profile-prompt";
import { ConceptsResponseSchema, type Concept, type ConceptCache } from "./schemas";

export const CONCEPT_PROMPT_VERSION = "concepts-v1";

export const CONCEPT_SYSTEM_PROMPT = `You are a social media copywriter for a small local business. You turn a trending YouTube topic into original post ideas the owner can review, edit and approve before anything is posted.

Write exactly 3 different post concepts that connect the business's real products to the trend's general theme. For each concept give:
- hook: the first line or first 2 seconds that stops the scroll
- caption: the full post caption in the business's tone (2-5 short sentences, may include emoji)
- visualIdea: what to photograph or film, using the business's own products, staff or shop
- hashtags: 3-6 hashtags including at least one local tag for the business's city
- platform: one of the business's posting platforms that suits this concept best
- postingWindow: a specific day and time range, within opening hours where relevant, when the audience is likely to see it (for example "Saturday 8:00-10:00 AM")

Originality rules (required):
- Never copy or quote the video's title, the creator's words or content, or song lyrics.
- Don't name the creator or channel, and don't suggest using the trending audio or reusing clips from the video.
- Reference only the general theme (for example "cozy room makeovers" or "puppy videos"), in your own words.
- Respect the business's topics to avoid.

${UNTRUSTED_TREND_RULE}
${PROFILE_RULE}`;

export function buildConceptUserPrompt(item: TrendItem, profile: BrandProfile): string {
  return `${brandProfileBlock(profile)}\n\nThe trend to build on:\n\n${trendDataBlock(item)}\n\nWrite 3 original post concepts as JSON.`;
}

export function conceptCacheKey(item: TrendItem, profile: BrandProfile): string {
  return `${safetyCacheKey(item)}:${profileHash(profile)}`;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Enforce the originality rule in code, not just in the prompt: a concept may not contain the
 * video's title (if the title is long enough to be distinctive) or the channel name.
 */
export function originalityProblem(concepts: readonly Concept[], item: TrendItem): string | null {
  const title = normalise(item.title);
  const channel = normalise(item.channel);
  for (const [i, c] of concepts.entries()) {
    const text = normalise(`${c.hook} ${c.caption} ${c.visualIdea}`);
    if (title.length >= 15 && text.includes(title)) return `concept ${i + 1} copies the video title`;
    if (channel.length >= 4 && text.includes(channel)) return `concept ${i + 1} names the channel`;
  }
  return null;
}

export interface ConceptResult {
  concepts: Concept[];
  source: "cache" | "llm";
}

export interface ConceptOptions {
  cache?: ConceptCache;
  caller?: StructuredCaller;
}

/**
 * Generate 3 post concepts for one (already safe) trend. Uses the cache first. Retries once if
 * the LLM returns invalid output or breaks the originality rule. Throws LlmError (with a
 * friendly userMessage) if it still fails.
 */
export async function generateConcepts(
  item: TrendItem,
  profile: BrandProfile,
  { cache, caller }: ConceptOptions,
): Promise<ConceptResult> {
  const key = conceptCacheKey(item, profile);
  if (cache?.promptVersion === CONCEPT_PROMPT_VERSION && cache.entries[key]) {
    return { concepts: cache.entries[key].concepts.slice(0, 3), source: "cache" };
  }
  if (!caller) throw new LlmError("config", "no cached concepts and no LLM configured");

  const request = {
    schema: ConceptsResponseSchema,
    system: CONCEPT_SYSTEM_PROMPT,
    user: buildConceptUserPrompt(item, profile),
    effort: "medium" as const,
    maxTokens: 8192,
  };

  let lastError: LlmError | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await caller(request);
      const concepts = out.concepts.slice(0, 3);
      const problem = originalityProblem(concepts, item);
      if (problem) throw new LlmError("invalid_output", problem);
      return { concepts, source: "llm" };
    } catch (err) {
      lastError = err instanceof LlmError ? err : new LlmError("invalid_output", String(err));
      // Retry once only for bad output; timeouts and rate limits were already retried by the SDK.
      if (lastError.kind !== "invalid_output") break;
    }
  }
  throw lastError!;
}
