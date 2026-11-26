import { z } from "zod";
import { getScoredTrends } from "@/lib/generate";
import type { TrendsResponse } from "@/lib/generate/types";
import { BrandProfileSchema, DEMO_PROFILE } from "@/lib/profile/schema";

const BodySchema = z.object({ profile: BrandProfileSchema.optional() });

/**
 * POST /api/trends { profile? } -> TrendsResponse
 * Safe trends ranked by fit for the profile, plus the trends filtered out and why.
 */
export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const body = BodySchema.safeParse(raw ?? {});
  if (!body.success) {
    return Response.json(
      { error: "Your saved profile couldn't be read. Open Profile and save it again, or reset it." },
      { status: 400 },
    );
  }
  const profile = body.data.profile ?? DEMO_PROFILE;

  try {
    const r = await getScoredTrends(profile);
    const payload: TrendsResponse = {
      businessName: profile.businessName,
      snapshot: { source: r.source.source, fetchedAt: r.source.fetchedAt, warning: r.source.warning },
      kept: r.kept.map((k) => ({ item: k.item, fit: k.fit, safetyReason: k.safetyReason })),
      filteredOut: r.filteredOut.map((f) => ({ item: f.item, layer: f.layer, reason: f.reason })),
      fitError: r.fitError,
    };
    return Response.json(payload);
  } catch (err) {
    console.error("[api/trends]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Trends couldn't be loaded. Please try again." }, { status: 500 });
  }
}
