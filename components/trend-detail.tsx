"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, RefreshCw, SearchX, ShieldCheck, ShieldOff, Sparkles, WandSparkles } from "lucide-react";
import { ConceptEditor } from "@/components/concept-editor";
import { Disclaimer } from "@/components/disclaimer";
import { FitRing, fitLabel, PlatformBadges, Signals, SourceLink, Views } from "@/components/trend-bits";
import { formatSnapshotDate, useTrends } from "@/components/use-trends";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchConcepts } from "@/lib/client/api";
import { useProfile } from "@/lib/client/profile-store";
import type { Concept } from "@/lib/generate/schemas";
import type { TrendsResponse } from "@/lib/generate/types";

type Gen =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; concepts: Concept[]; source: "cache" | "llm" };

const back = (
  <Link
    href="/"
    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
  >
    <ArrowLeft aria-hidden className="size-4" /> Back to dashboard
  </Link>
);

export function TrendDetail({ id }: { id: string }) {
  const { state, retry } = useTrends();

  if (state.status === "loading") {
    return (
      <section className="space-y-6">
        {back}
        <p role="status" className="sr-only">
          Loading trend…
        </p>
        <div className="flex gap-5 rounded-2xl border bg-card p-6 shadow-xs">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className="space-y-6">
        {back}
        <div role="alert" className="space-y-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
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
    const Icon = filtered ? ShieldOff : SearchX;
    return (
      <section className="space-y-6">
        {back}
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary">
            <Icon aria-hidden className="size-6 text-muted-foreground" />
          </span>
          <h1 className="text-2xl font-semibold">{filtered ? "This trend was filtered out" : "Trend not found"}</h1>
          <p className="text-muted-foreground">
            {filtered
              ? `It didn't pass the safety filter (${filtered.reason}), so TrendPilot won't write posts for it.`
              : "It may have dropped out of the current trend list. Pick another trend from the dashboard."}
          </p>
        </div>
      </section>
    );
  }

  return <TrendWithConcepts kept={kept} snapshot={state.data.snapshot} />;
}

function TrendWithConcepts({
  kept,
  snapshot,
}: {
  kept: TrendsResponse["kept"][number];
  snapshot: TrendsResponse["snapshot"];
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
    <section className="space-y-8">
      {back}

      <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="flex flex-col gap-5 bg-gradient-to-br from-brand-soft/80 via-card to-card p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex flex-col items-center gap-1">
            <FitRing score={fit?.score} size={84} />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {fitLabel(fit?.score)}
            </span>
          </div>
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Trending on YouTube</p>
            <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{item.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <PlatformBadges category={item.categoryName} />
              <Views n={item.views} />
              <Signals item={item} asOf={snapshot.fetchedAt} />
              <SourceLink url={item.url} />
            </div>
          </div>
        </div>
        <div className="grid border-t sm:grid-cols-2 sm:divide-x">
          <div className="flex gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-primary">
              <Sparkles aria-hidden className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium">Why it fits</p>
              <p className="text-sm text-muted-foreground">{fit?.reason ?? "No fit score available."}</p>
            </div>
          </div>
          <div className="flex gap-3 border-t p-5 sm:border-t-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
              <ShieldCheck aria-hidden className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-medium">Why it&apos;s safe</p>
              <p className="text-sm text-muted-foreground">{safetyReason}</p>
            </div>
          </div>
        </div>
      </div>

      <Disclaimer snapshotDate={formatSnapshotDate(snapshot.fetchedAt)} />

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Post ideas for {profile.businessName}</h2>
            <p className="text-sm text-muted-foreground">
              {gen.status === "ready"
                ? `Edit anything, then approve the ones you like. Nothing is posted automatically.${gen.source === "cache" ? " These are the saved ideas for the demo profile; edit them freely." : ""}`
                : "Three original ideas based on this trend's theme, in your brand's voice."}
            </p>
          </div>
          {/* Saved ideas come from the cache, so "Generate again" would only return the same three. */}
          {gen.status !== "loading" && !(gen.status === "ready" && gen.source === "cache") && (
            <Button size="lg" onClick={generate} variant={gen.status === "ready" ? "outline" : "default"}>
              {gen.status === "ready" ? (
                <RefreshCw aria-hidden className="size-4" />
              ) : (
                <WandSparkles aria-hidden className="size-4" />
              )}
              {gen.status === "ready" ? "Generate again" : "Generate 3 post ideas"}
            </Button>
          )}
        </div>

        {gen.status === "idle" && (
          <div className="grid place-items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-primary">
              <WandSparkles aria-hidden className="size-6" />
            </span>
            <p className="font-medium">Ready when you are</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Ideas reference only the trend&apos;s general theme. They never copy the video, its creator or its audio.
            </p>
          </div>
        )}

        {gen.status === "loading" && (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              Writing post ideas… this usually takes under 30 seconds.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </>
        )}

        {gen.status === "error" && (
          <div role="alert" className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p>{gen.message}</p>
            <Button variant="outline" onClick={generate}>
              Try again
            </Button>
          </div>
        )}

        {gen.status === "ready" && (
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
        )}
      </div>
    </section>
  );
}
