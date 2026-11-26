"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, Clock, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PlatformChip, SourceLink } from "@/components/trend-bits";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendar, type CalendarEntry } from "@/lib/client/calendar-store";
import { addDays, elapsed, formatDateTime, formatDay, fromISODate, startOfWeek, toISODate } from "@/lib/client/dates";
import { useHydrated } from "@/lib/client/local-store";

export function CalendarWeek() {
  const hydrated = useHydrated();
  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Planner"
        icon={CalendarDays}
        title="Content calendar"
        description="Approved posts, by the day you plan to post them. Saved in this browser only."
      />
      {hydrated ? (
        <Week />
      ) : (
        <>
          <p className="sr-only">Loading calendar…</p>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </>
      )}
    </section>
  );
}

function Week() {
  const { entries, remove, markPosted, unmarkPosted } = useCalendar();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const todayIso = toISODate(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekIsos = new Set(days.map(toISODate));
  const thisWeek = toISODate(startOfWeek(new Date())) === toISODate(weekStart);
  const inWeek = entries.filter((e) => weekIsos.has(e.scheduledDate));
  const postedInWeek = inWeek.filter((e) => e.postedAt).length;

  const otherWeeks = new Map<string, number>();
  for (const e of entries) {
    if (weekIsos.has(e.scheduledDate)) continue;
    const ws = toISODate(startOfWeek(fromISODate(e.scheduledDate)));
    otherWeeks.set(ws, (otherWeeks.get(ws) ?? 0) + 1);
  }

  function onDelete(e: CalendarEntry) {
    if (window.confirm(`Delete "${e.concept.hook}" from the calendar?`)) remove(e.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full border bg-card p-1 shadow-xs">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft aria-hidden className="size-4" /> Previous week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={thisWeek}
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            This week
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next week <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
        <h2 className="font-semibold" aria-live="polite">
          Week of {formatDay(weekStart)}
        </h2>
        <p className="ml-auto text-sm text-muted-foreground">
          {inWeek.length} planned · {postedInWeek} posted
        </p>
      </div>

      {entries.length === 0 && (
        <div className="grid place-items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-primary">
            <CalendarPlus aria-hidden className="size-6" />
          </span>
          <p className="font-medium">No posts yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Pick a trend on the{" "}
            <Link href="/" className="underline underline-offset-2">
              dashboard
            </Link>
            , generate ideas, and approve the ones you like.
          </p>
        </div>
      )}

      <ol className="grid gap-3 lg:grid-cols-7" aria-label="Days of the week">
        {days.map((d) => {
          const iso = toISODate(d);
          const isToday = iso === todayIso;
          const dayEntries = entries.filter((e) => e.scheduledDate === iso);
          return (
            <li
              key={iso}
              aria-label={formatDay(d)}
              className={`flex min-h-28 flex-col rounded-2xl border p-2.5 lg:min-h-80 ${
                isToday ? "border-primary/40 bg-brand-soft/50 ring-1 ring-primary/20" : "bg-card/70"
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between px-0.5">
                <p className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {d.toLocaleDateString("en-CA", { weekday: "short" })}
                </p>
                <p className="flex items-center gap-1.5">
                  {isToday && (
                    <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-medium text-primary-foreground">
                      Today
                    </span>
                  )}
                  <span className={`text-sm font-semibold tabular-nums ${isToday ? "text-primary" : ""}`}>
                    {d.getDate()}
                  </span>
                </p>
              </div>
              <ul className="space-y-2">
                {dayEntries.map((e) => (
                  <li key={e.id}>
                    <EntryCard
                      entry={e}
                      onDelete={() => onDelete(e)}
                      onPosted={() => markPosted(e.id)}
                      onUnposted={() => unmarkPosted(e.id)}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {otherWeeks.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="font-medium">Posts in other weeks:</p>
          {[...otherWeeks.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([ws, n]) => (
              <button
                key={ws}
                type="button"
                className={`${buttonVariants({ variant: "outline", size: "sm" })} rounded-full`}
                onClick={() => setWeekStart(fromISODate(ws))}
              >
                Week of {formatDay(fromISODate(ws))} ({n})
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  onDelete,
  onPosted,
  onUnposted,
}: {
  entry: CalendarEntry;
  onDelete: () => void;
  onPosted: () => void;
  onUnposted: () => void;
}) {
  const c = entry.concept;
  return (
    <article
      className={`space-y-2 rounded-xl border bg-card p-2.5 text-xs shadow-xs ${
        entry.postedAt ? "border-success/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1">
        <PlatformChip platform={c.platform} />
        {entry.postedAt && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success">
            <CircleCheck aria-hidden className="size-3" /> Posted
          </span>
        )}
      </div>
      <p className="flex items-center gap-1 text-muted-foreground">
        <Clock aria-hidden className="size-3 shrink-0" />
        {c.postingWindow}
      </p>
      <p className="text-[13px] font-medium leading-snug">{c.hook}</p>
      <details className="group">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Caption &amp; visual</summary>
        <p className="mt-1.5 whitespace-pre-wrap">{c.caption}</p>
        <p className="mt-1.5 text-muted-foreground">
          <span className="font-medium text-foreground">Visual:</span> {c.visualIdea}
        </p>
        <p className="mt-1.5 text-primary">{c.hashtags.join(" ")}</p>
      </details>
      <SourceLink url={entry.trendUrl} label="Trend source" />
      {entry.postedAt ? (
        <p className="text-muted-foreground">
          Posted {formatDateTime(entry.postedAt)} · {elapsed(entry.trendCapturedAt, entry.postedAt)} after the trend was
          captured{" "}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={onUnposted}>
            Undo
          </button>
        </p>
      ) : (
        <Button size="xs" className="w-full" onClick={onPosted}>
          Mark posted
        </Button>
      )}
      <Button size="xs" variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 aria-hidden className="size-3" /> Delete
      </Button>
    </article>
  );
}
