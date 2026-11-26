"use client";

import Link from "next/link";
import { useState } from "react";
import { ConceptEditor } from "@/components/concept-editor";
import { Disclaimer } from "@/components/disclaimer";
import { FitBadge, formatViews, PlatformBadges, SourceLink } from "@/components/trend-bits";
import { formatSnapshotDate, useTrends } from "@/components/use-trends";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchConcepts } from "@/lib/client/api";
import { useProfile } from "@/lib/client/profile-store";
import type { Concept } from "@/lib/generate/schemas";
import type { TrendsResponse } from "@/lib/generate/types";

type Gen =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; concepts: Concept[]; source: "cache" | "llm" };

export function TrendDetail({ id }: { id: string }) {
  const { state, retry } = useTrends();

  const back = (
    <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
      &larr; Back to dashboard
    </Link>
  );

  if (state.status === "loading") {
    return (
      <section className="space-y-4">
        {back}
        <p role="status" className="text-muted-foreground">
          Loading trend…
        </p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className="space-y-4">
        {back}
        <div role="alert" className="space-y-3">
          <p>{state.message}</p>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const kept = state.data.kept.find((k) => k.item.id === id);
  if (!kept) {
    const filtered = state.data.filteredOut.find((f) => f.item.id === id);
    return (
      <section className="space-y-4">
        {back}
        <h1 className="text-2xl font-semibold">{filtered ? "This trend was filtered out" : "Trend not found"}</h1>
        <p className="text-muted-foreground">
          {filtered
            ? `It didn't pass the safety filter (${filtered.reason}), so TrendPilot won't write posts for it.`
            : "It may have dropped out of the current trend list. Pick another trend from the dashboard."}
        </p>
      </section>
    );
  }

  return <TrendWithConcepts kept={kept} snapshot={state.data.snapshot} back={back} />;
}

function TrendWithConcepts({
  kept,
  snapshot,
  back,
}: {
  kept: TrendsResponse["kept"][number];
  snapshot: TrendsResponse["snapshot"];
  back: React.ReactNode;
}) {
  const { item, fit, safetyReason } = kept;
  const { profile, apiProfile } = useProfile();
  const [gen, setGen] = useState<Gen>({ status: "idle" });

  async function generate() {
    setGen({ status: "loading" });
    try {
      const r = await fetchConcepts(item.id, apiProfile);
      setGen({ status: "ready", concepts: r.concepts, source: r.source });
    } catch (err) {
      setGen({ status: "error", message: (err as Error).message });
    }
  }

  return (
    <section className="space-y-6">
      {back}

      <div className="flex gap-4">
        <FitBadge score={fit?.score} />
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold leading-snug">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <PlatformBadges category={item.categoryName} />
            <span>{formatViews(item.views)} views</span>
            <SourceLink url={item.url} />
          </div>
        </div>
      </div>

      <Card className="py-4">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">Why it fits</p>
            <p className="text-muted-foreground">{fit?.reason ?? "No fit score available."}</p>
          </div>
          <div>
            <p className="font-medium">Why it&apos;s safe</p>
            <p className="text-muted-foreground">{safetyReason}</p>
          </div>
        </CardContent>
      </Card>

      <Disclaimer snapshotDate={formatSnapshotDate(snapshot.fetchedAt)} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Post ideas for {profile.businessName}</h2>
          {gen.status !== "loading" && (
            <Button onClick={generate}>{gen.status === "ready" ? "Generate again" : "Generate 3 post ideas"}</Button>
          )}
        </div>

        {gen.status === "idle" && (
          <p className="text-muted-foreground">
            Generate 3 original post ideas based on this trend&apos;s theme. You can edit each one before saving it.
          </p>
        )}
        {gen.status === "loading" && (
          <p role="status" className="text-muted-foreground">
            Writing post ideas… this usually takes under 30 seconds.
          </p>
        )}
        {gen.status === "error" && (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-4">
            <p>{gen.message}</p>
            <Button variant="outline" onClick={generate}>
              Try again
            </Button>
          </div>
        )}
        {gen.status === "ready" && (
          <>
            <p className="text-sm text-muted-foreground">
              Edit anything below, then approve the ones you like. Nothing is posted automatically.
              {gen.source === "cache" ? " (Saved ideas for this profile.)" : ""}
            </p>
            <ol className="grid gap-4 lg:grid-cols-3" aria-label="Post ideas">
              {gen.concepts.map((c, i) => (
                <li key={`${item.id}-${i}-${c.hook}`}>
                  <ConceptEditor
                    index={i}
                    initial={c}
                    platforms={profile.postingPlatforms}
                    trend={{
                      trendId: item.id,
                      trendTitle: item.title,
                      trendUrl: item.url,
                      categoryName: item.categoryName,
                      trendCapturedAt: snapshot.fetchedAt,
                    }}
                  />
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
