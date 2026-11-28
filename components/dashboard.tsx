"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Filter, Radar, ShieldCheck, ShieldOff, Sparkles, Trophy } from "lucide-react";
import { Disclaimer } from "@/components/disclaimer";
import { PageHeader } from "@/components/page-header";
import {
  FitRing,
  fitLabel,
  LAYER_LABELS,
  LAYER_TONES,
  PlatformBadges,
  Signals,
  SourceLink,
  Views,
} from "@/components/trend-bits";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSnapshotDate, useTrends } from "@/components/use-trends";
import { useProfile } from "@/lib/client/profile-store";
import type { TrendsResponse } from "@/lib/generate/types";
import type { FilterLayer } from "@/lib/safety/filter";

export function Dashboard() {
  const { state, retry } = useTrends();
  const { profile, isCustom } = useProfile();

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Trend radar · YouTube Canada"
        icon={Radar}
        title="DASHBOARD"
        description={`Safe trending topics for ${state.status === "ready" ? state.data.businessName : profile.businessName}, ranked by how naturally they fit your brand.`}
      />

      {state.status === "ready" && <StatTiles data={state.data} />}

      <Disclaimer
        snapshotDate={state.status === "ready" ? formatSnapshotDate(state.data.snapshot.fetchedAt) : undefined}
      />

      {state.status === "loading" && <LoadingTrends custom={isCustom} />}

      {state.status === "error" && (
        <div role="alert" className="space-y-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
          <p>{state.message}</p>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {state.status === "ready" && <TrendResults data={state.data} />}
    </section>
  );
}

function StatTiles({ data }: { data: TrendsResponse }) {
  const best = data.kept[0];
  const tiles = [
    { icon: ShieldCheck, label: "Safe trends", value: String(data.kept.length), tone: "text-success bg-success-soft" },
    { icon: ShieldOff, label: "Filtered", value: String(data.filteredOut.length), tone: "text-muted-foreground bg-secondary" },
    {
      icon: Trophy,
      label: "Best fit score",
      value: best?.fit ? String(best.fit.score) : "—",
      tone: "text-primary bg-brand-soft",
    },
    {
      icon: CalendarClock,
      label: "Snapshot",
      value: new Date(data.snapshot.fetchedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      tone: "text-warning-foreground bg-warning-soft",
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Trend summary">
      {tiles.map(({ icon: Icon, label, value, tone }) => (
        <li key={label} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-xs sm:p-4">
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${tone}`}>
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold leading-tight tabular-nums sm:text-xl">{value}</span>
            <span className="block text-xs text-muted-foreground">{label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function LoadingTrends({ custom }: { custom: boolean }) {
  return (
    <div className="space-y-3">
      <p role="status" className="text-sm text-muted-foreground">
        {custom ? "Scoring trends for your profile… this can take up to 30 seconds." : "Loading trends…"}
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-xs">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendResults({ data }: { data: TrendsResponse }) {
  return (
    <>
      {(data.snapshot.warning || data.fitError) && (
        <p className="rounded-xl bg-warning-soft px-4 py-2 text-sm text-warning-foreground">
          {data.snapshot.warning} {data.fitError ? `${data.fitError} Trends are shown unranked.` : ""}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {data.kept.length} safe {data.kept.length === 1 ? "trend" : "trends"}
          </h2>
          <p className="text-xs text-muted-foreground">Highest fit first</p>
        </div>

        {data.kept.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center text-muted-foreground">
            No trends passed the safety filter for this profile. Check the Filtered out list below, or loosen your
            topics to avoid on the Profile page.
          </div>
        ) : (
          <ol className="space-y-3" aria-label="Safe trends">
            {data.kept.map(({ item, fit }, i) => {
              const href = `/trends/${encodeURIComponent(item.id)}`;
              return (
                <li key={item.id}>
                  <article
                    className={`group relative flex gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-px hover:shadow-md sm:p-5 ${
                      i === 0 ? "ring-1 ring-primary/25" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <FitRing score={fit?.score} />
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {fitLabel(fit?.score)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">#{i + 1}</span>
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Trophy aria-hidden className="size-3" /> Best fit
                          </span>
                        )}
                      </div>
                      <Link
                        href={href}
                        className="block font-medium leading-snug after:absolute after:inset-0 after:rounded-2xl hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      {fit && (
                        <p className="flex gap-1.5 text-sm text-muted-foreground">
                          <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          {fit.reason}
                        </p>
                      )}
                      <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <PlatformBadges category={item.categoryName} />
                        <Views n={item.views} />
                        <Signals item={item} asOf={data.snapshot.fetchedAt} />
                        <SourceLink url={item.url} />
                      </div>
                    </div>
                    <div className="hidden items-center sm:flex">
                      <span
                        aria-hidden
                        className={`${buttonVariants({ size: "sm" })} gap-1 transition-transform group-hover:translate-x-0.5`}
                      >
                        Get post ideas <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <FilteredOutPanel items={data.filteredOut} />
    </>
  );
}

function FilteredOutPanel({ items }: { items: TrendsResponse["filteredOut"] }) {
  const counts = items.reduce<Partial<Record<FilterLayer, number>>>((acc, f) => {
    acc[f.layer] = (acc[f.layer] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <details className="group overflow-hidden rounded-2xl border bg-card shadow-xs">
      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 marker:content-none">
        <Filter aria-hidden className="size-4 text-muted-foreground" />
        <span className="font-medium">Filtered out ({items.length})</span>
        <span className="text-sm text-muted-foreground">Trends hidden by the safety filter, and why</span>
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="flex flex-wrap gap-2 border-t bg-muted/40 px-5 py-3">
        {(Object.keys(LAYER_LABELS) as FilterLayer[]).map((layer) =>
          counts[layer] ? (
            <span key={layer} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${LAYER_TONES[layer]}`}>
              {LAYER_LABELS[layer]} · {counts[layer]}
            </span>
          ) : null,
        )}
      </div>
      <ul className="divide-y border-t" aria-label="Filtered out trends">
        {items.map(({ item, layer, reason }) => (
          <li key={item.id} className="grid gap-1.5 px-5 py-3.5 text-sm sm:grid-cols-[10rem_1fr]">
            <div className="flex flex-wrap items-start gap-1.5 sm:flex-col">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LAYER_TONES[layer]}`}>
                {LAYER_LABELS[layer]}
              </span>
              <span className="text-xs text-muted-foreground">{item.categoryName}</span>
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-muted-foreground line-through decoration-muted-foreground/40">{item.title}</p>
              <p>{reason}</p>
              <SourceLink url={item.url} label="Source" />
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
