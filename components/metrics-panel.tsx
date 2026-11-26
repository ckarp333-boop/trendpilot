"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCalendar, type CalendarEntry } from "@/lib/client/calendar-store";
import { formatDay, fromISODate } from "@/lib/client/dates";
import { useHydrated } from "@/lib/client/local-store";
import {
  computeTotals,
  formatHours,
  METRICS,
  parseCount,
  speedHours,
  type EnteredField,
  type MetricKey,
} from "@/lib/client/metrics";
import { useMetrics } from "@/lib/client/metrics-store";

const nf = new Intl.NumberFormat("en-CA");

/** Which owner-entered field each metric uses (speed is automatic). */
const FIELD: Record<Exclude<MetricKey, "speed">, { field: EnteredField; unit: string }> = {
  timeSaved: { field: "timeSavedMinutes", unit: "minutes" },
  attention: { field: "impressions", unit: "views" },
  engagement: { field: "engagements", unit: "interactions" },
  clicks: { field: "clicks", unit: "clicks" },
};

export function MetricsPanel() {
  const hydrated = useHydrated();
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Value metrics</h1>
        <p className="text-muted-foreground">
          Track whether trend-based posts are worth it. Speed to market is measured automatically; enter the rest
          from each platform&apos;s own insights.
        </p>
      </div>
      {hydrated ? <Metrics /> : <p className="text-muted-foreground">Loading metrics…</p>}
    </section>
  );
}

function Metrics() {
  const { entries } = useCalendar();
  const { state, isEnabled, toggle, setValue } = useMetrics();
  const totals = computeTotals(entries, state.values);
  const sorted = [...entries].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const enteredMetrics = METRICS.filter((m) => m.key !== "speed" && isEnabled(m.key)) as {
    key: Exclude<MetricKey, "speed">;
    label: string;
  }[];

  return (
    <>
      <fieldset className="rounded-lg border px-4 py-3">
        <legend className="px-1 text-sm font-medium">Metrics to track</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {METRICS.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center gap-2 text-sm" title={m.help}>
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={isEnabled(m.key)}
                onChange={() => toggle(m.key)}
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No posts to measure yet. Approve some post ideas from the{" "}
            <Link href="/" className="underline underline-offset-2">
              dashboard
            </Link>{" "}
            and mark them posted on the calendar.
          </CardContent>
        </Card>
      ) : (
        <>
          <ValueStatement totals={totals} showSpeed={isEnabled("speed")} showTime={isEnabled("timeSaved")} />

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Totals">
            <Stat label="Posts" value={`${totals.posted} posted`} sub={`of ${totals.planned} planned`} />
            {isEnabled("speed") && (
              <Stat
                label="Avg speed to market"
                value={totals.avgSpeedHours === null ? "—" : formatHours(totals.avgSpeedHours)}
                sub="trend captured → posted"
              />
            )}
            {isEnabled("timeSaved") && (
              <Stat label="Time saved" value={formatHours(totals.timeSavedMinutes / 60)} sub="owner estimate" />
            )}
            {isEnabled("attention") && <Stat label="Attention" value={nf.format(totals.impressions)} sub="views" />}
            {isEnabled("engagement") && (
              <Stat
                label="Engagement"
                value={nf.format(totals.engagements)}
                sub={
                  totals.engagementRate === null
                    ? "interactions"
                    : `${(totals.engagementRate * 100).toFixed(1)}% of views`
                }
              />
            )}
            {isEnabled("clicks") && <Stat label="Clicks" value={nf.format(totals.clicks)} sub="link / profile" />}
          </ul>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Metrics per post</caption>
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Post
                  </th>
                  {isEnabled("speed") && (
                    <th scope="col" className="px-3 py-2 font-medium">
                      Speed to market
                    </th>
                  )}
                  {enteredMetrics.map((m) => (
                    <th key={m.key} scope="col" className="px-3 py-2 font-medium">
                      {m.label}
                      <span className="block text-xs font-normal text-muted-foreground">{FIELD[m.key].unit}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((e) => (
                  <PostRow
                    key={e.id}
                    entry={e}
                    showSpeed={isEnabled("speed")}
                    metrics={enteredMetrics}
                    values={state.values[e.id] ?? {}}
                    onChange={(field, v) => setValue(e.id, field, v)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Values are entered by the owner and stored in this browser only. TrendPilot doesn&apos;t connect to social
        media analytics (out of scope for this proof of concept).
      </p>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <li>
      <Card className="py-4">
        <CardContent>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </CardContent>
      </Card>
    </li>
  );
}

function ValueStatement({
  totals,
  showSpeed,
  showTime,
}: {
  totals: ReturnType<typeof computeTotals>;
  showSpeed: boolean;
  showTime: boolean;
}) {
  if (totals.posted === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Mark posts as posted on the calendar to measure speed to market.
      </p>
    );
  }
  const parts = [`TrendPilot helped you publish ${totals.posted} trend-based ${totals.posted === 1 ? "post" : "posts"}`];
  if (showSpeed && totals.avgSpeedHours !== null) {
    parts.push(`on average ${formatHours(totals.avgSpeedHours)} after the trend was captured`);
  }
  let sentence = parts.join(", ");
  if (showTime && totals.timeSavedMinutes > 0) {
    sentence += `, saving about ${formatHours(totals.timeSavedMinutes / 60)} of writing time`;
  }
  return <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm">{sentence}.</p>;
}

function PostRow({
  entry,
  showSpeed,
  metrics,
  values,
  onChange,
}: {
  entry: CalendarEntry;
  showSpeed: boolean;
  metrics: { key: Exclude<MetricKey, "speed">; label: string }[];
  values: Partial<Record<EnteredField, number>>;
  onChange: (field: EnteredField, value: number | undefined) => void;
}) {
  const hours = speedHours(entry);
  return (
    <tr>
      <th scope="row" className="max-w-xs px-3 py-2 text-left font-normal">
        <span className="block font-medium">{entry.concept.hook}</span>
        <span className="text-xs text-muted-foreground">
          {formatDay(fromISODate(entry.scheduledDate))} · {entry.concept.platform} ·{" "}
          {entry.postedAt ? "Posted" : "Not posted yet"}
        </span>
      </th>
      {showSpeed && (
        <td className="px-3 py-2">{hours === null ? <span className="text-muted-foreground">—</span> : formatHours(hours)}</td>
      )}
      {metrics.map((m) => {
        const { field } = FIELD[m.key];
        return (
          <td key={m.key} className="px-3 py-2">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="w-28"
              aria-label={`${m.label} for "${entry.concept.hook}"`}
              value={values[field] ?? ""}
              onChange={(e) => onChange(field, parseCount(e.target.value))}
            />
          </td>
        );
      })}
    </tr>
  );
}
