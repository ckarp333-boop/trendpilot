import { z } from "zod";
import { getConceptsForTrend } from "@/lib/generate";
import { LlmError, type LlmErrorKind } from "@/lib/llm/client";
import { BrandProfileSchema, DEMO_PROFILE } from "@/lib/profile/schema";

const BodySchema = z.object({
  trendId: z.string().min(1).max(100),
  profile: BrandProfileSchema.optional(),
});

const STATUS: Record<LlmErrorKind, number> = {
  config: 503,
  timeout: 504,
  rate_limit: 429,
  refusal: 422,
  invalid_output: 502,
  api: 502,
};

/**
 * POST /api/generate { trendId, profile? } -> { concepts, source, trend }
 * Generates 3 post concepts for a trend that passed the safety filter. Errors return
 * { error } with a friendly message that is safe to show in the UI.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const body = BodySchema.safeParse(raw);
  if (!body.success) {
    return Response.json({ error: "That request didn't look right. Please reload and try again." }, { status: 400 });
  }

  const profile = body.data.profile ?? DEMO_PROFILE;
  try {
    const result = await getConceptsForTrend(body.data.trendId, profile);
    if (!result) {
      return Response.json(
        { error: "That trend isn't on the safe list for this profile, so we won't write posts for it." },
        { status: 404 },
      );
    }
    return Response.json({
      concepts: result.concepts,
      source: result.source,
      trend: { id: result.trend.id, url: result.trend.url, categoryName: result.trend.categoryName },
    });
  } catch (err) {
    if (err instanceof LlmError) {
      console.error(`[api/generate] ${err.message}`);
      return Response.json({ error: err.userMessage }, { status: STATUS[err.kind] });
    }
    console.error("[api/generate] unexpected error", err instanceof Error ? err.message : err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
