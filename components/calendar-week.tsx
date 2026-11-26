"use client";

import Link from "next/link";
import { useState } from "react";
import { SourceLink } from "@/components/trend-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCalendar, type CalendarEntry } from "@/lib/client/calendar-store";
import { addDays, elapsed, formatDateTime, formatDay, fromISODate, startOfWeek, toISODate } from "@/lib/client/dates";
import { useHydrated } from "@/lib/client/local-store";

export function CalendarWeek() {
  const hydrated = useHydrated();
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Content calendar</h1>
        <p className="text-muted-foreground">
          Approved posts, by the day you plan to post them. Saved in this browser only.
        </p>
      </div>
      {hydrated ? <Week /> : <p className="text-muted-foreground">Loading calendar…</p>}
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          &larr; Previous week
        </Button>
        <Button variant="outline" size="sm" disabled={thisWeek} onClick={() => setWeekStart(startOfWeek(new Date()))}>
          This week
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          Next week &rarr;
        </Button>
        <h2 className="ml-2 font-medium" aria-live="polite">
          Week of {formatDay(weekStart)}
        </h2>
      </div>

      {entries.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No posts yet. Pick a trend on the{" "}
            <Link href="/" className="underline underline-offset-2">
              dashboard
            </Link>
            , generate ideas, and approve the ones you like.
          </CardContent>
        </Card>
      )}

      <ol className="grid gap-3 lg:grid-cols-7" aria-label="Days of the week">
        {days.map((d) => {
          const iso = toISODate(d);
          const dayEntries = entries.filter((e) => e.scheduledDate === iso);
          return (
            <li
              key={iso}
              aria-label={formatDay(d)}
              className={`min-h-24 rounded-lg border p-2 ${iso === todayIso ? "border-primary" : ""}`}
            >
              <p className={`mb-2 text-xs font-semibold ${iso === todayIso ? "" : "text-muted-foreground"}`}>
                {formatDay(d)}
                {iso === todayIso ? " · Today" : ""}
              </p>
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
        <div className="text-sm">
          <p className="font-medium">Posts in other weeks</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {[...otherWeeks.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([ws, n]) => (
                <li key={ws}>
                  <Button variant="ghost" size="sm" onClick={() => setWeekStart(fromISODate(ws))}>
                    Week of {formatDay(fromISODate(ws))} ({n})
                  </Button>
                </li>
              ))}
          </ul>
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
    <article className={`space-y-2 rounded-md border bg-card p-2 text-xs ${entry.postedAt ? "opacity-80" : ""}`}>
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="secondary">{c.platform}</Badge>
        {entry.postedAt && <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Posted</Badge>}
      </div>
      <p className="text-muted-foreground">{c.postingWindow}</p>
      <p className="font-medium">{c.hook}</p>
      <details>
        <summary className="cursor-pointer text-muted-foreground">Caption &amp; visual</summary>
        <p className="mt-1 whitespace-pre-wrap">{c.caption}</p>
        <p className="mt-1 text-muted-foreground">
          <span className="font-medium text-foreground">Visual:</span> {c.visualIdea}
        </p>
        <p className="mt-1 text-muted-foreground">{c.hashtags.join(" ")}</p>
      </details>
      <SourceLink url={entry.trendUrl} label="Trend source" />
      {entry.postedAt ? (
        <p className="text-muted-foreground">
          Posted {formatDateTime(entry.postedAt)} · {elapsed(entry.trendCapturedAt, entry.postedAt)} after the trend was
          captured{" "}
          <button type="button" className="underline underline-offset-2" onClick={onUnposted}>
            Undo
          </button>
        </p>
      ) : (
        <Button size="xs" className="w-full" onClick={onPosted}>
          Mark posted
        </Button>
      )}
      <Button size="xs" variant="ghost" className="w-full text-destructive" onClick={onDelete}>
        Delete
      </Button>
    </article>
  );
}
