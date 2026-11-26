"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Disclaimer } from "@/components/disclaimer";
import {
  FitBadge,
  formatViews,
  LAYER_LABELS,
  PlatformBadges,
  SourceLink,
} from "@/components/trend-bits";
import { formatSnapshotDate, useTrends } from "@/components/use-trends";
import { useProfile } from "@/lib/client/profile-store";
import type { TrendsResponse } from "@/lib/generate/types";

export function Dashboard() {
  const { state, retry } = useTrends();
  const { isCustom } = useProfile();

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          {state.status === "ready"
            ? `Safe trending YouTube topics for ${state.data.businessName}, ranked by how well they fit.`
            : "Safe trending YouTube topics, ranked by how well they fit your business."}
        </p>
      </div>

      <Disclaimer snapshotDate={state.status === "ready" ? formatSnapshotDate(state.data.snapshot.fetchedAt) : undefined} />

      {state.status === "loading" && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" role="status">
            {isCustom
              ? "Scoring trends for your profile… this can take up to 30 seconds."
              : "Loading trends…"}
          </CardContent>
        </Card>
      )}

      {state.status === "error" && (
        <Card>
          <CardContent className="space-y-3 py-6 text-center" role="alert">
            <p>{state.message}</p>
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {state.status === "ready" && <TrendResults data={state.data} />}
    </section>
  );
}

function TrendResults({ data }: { data: TrendsResponse }) {
  return (
    <>
      {data.snapshot.warning && <p className="text-sm text-amber-700 dark:text-amber-300">{data.snapshot.warning}</p>}
      {data.fitError && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {data.fitError} Trends are shown unranked.
        </p>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          {data.kept.length} safe {data.kept.length === 1 ? "trend" : "trends"}
        </h2>
        {data.kept.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              No trends passed the safety filter for this profile. Check the Filtered out list below, or loosen
              your topics to avoid on the Profile page.
            </CardContent>
          </Card>
        ) : (
          <ol className="space-y-3" aria-label="Safe trends">
            {data.kept.map(({ item, fit }, i) => (
              <li key={item.id}>
                <Card className="py-4">
                  <CardContent className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground">#{i + 1}</span>
                      <FitBadge score={fit?.score} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <Link
                        href={`/trends/${encodeURIComponent(item.id)}`}
                        className="block font-medium leading-snug hover:underline"
                      >
                        {item.title}
                      </Link>
                      {fit && <p className="text-sm">{fit.reason}</p>}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <PlatformBadges category={item.categoryName} />
                        <span>{formatViews(item.views)} views</span>
                        <SourceLink url={item.url} />
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <Link
                        href={`/trends/${encodeURIComponent(item.id)}`}
                        className={buttonVariants({ size: "sm" })}
                        aria-hidden
                        tabIndex={-1}
                      >
                        Get post ideas
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </div>

      <FilteredOutPanel items={data.filteredOut} />
    </>
  );
}

function FilteredOutPanel({ items }: { items: TrendsResponse["filteredOut"] }) {
  return (
    <details className="group rounded-lg border">
      <summary className="cursor-pointer select-none px-4 py-3 font-medium">
        Filtered out ({items.length})
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          Trends hidden by the safety filter, and why
        </span>
      </summary>
      <ul className="divide-y border-t" aria-label="Filtered out trends">
        {items.map(({ item, layer, reason }) => (
          <li key={item.id} className="space-y-1 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{LAYER_LABELS[layer]}</span>
              <span className="text-muted-foreground">{item.categoryName}</span>
            </div>
            <p className="text-muted-foreground line-through decoration-muted-foreground/40">{item.title}</p>
            <p>{reason}</p>
            <SourceLink url={item.url} label="Source" />
          </li>
        ))}
      </ul>
    </details>
  );
}
