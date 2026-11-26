"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { CalendarCheck, CircleCheck } from "lucide-react";
import { PlatformChip } from "@/components/trend-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normaliseHashtags, SavedConceptSchema, useCalendar, type CalendarEntry } from "@/lib/client/calendar-store";
import { suggestedDate } from "@/lib/client/dates";
import type { Concept } from "@/lib/generate/schemas";

type TrendRef = Pick<CalendarEntry, "trendId" | "trendTitle" | "trendUrl" | "categoryName" | "trendCapturedAt">;

export function ConceptEditor({
  index,
  initial,
  platforms,
  trend,
}: {
  index: number;
  initial: Concept;
  platforms: readonly string[];
  trend: TrendRef;
}) {
  const uid = useId();
  const { add } = useCalendar();
  const [hook, setHook] = useState(initial.hook);
  const [caption, setCaption] = useState(initial.caption);
  const [visualIdea, setVisualIdea] = useState(initial.visualIdea);
  const [hashtags, setHashtags] = useState(initial.hashtags.join(" "));
  const [platform, setPlatform] = useState(initial.platform);
  const [postingWindow, setPostingWindow] = useState(initial.postingWindow);
  const [date, setDate] = useState(() => suggestedDate(initial.postingWindow));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const platformOptions = platforms.includes(platform) ? platforms : [platform, ...platforms];

  function save() {
    const parsed = SavedConceptSchema.safeParse({
      hook,
      caption,
      visualIdea,
      hashtags: normaliseHashtags(hashtags),
      platform,
      postingWindow,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the fields.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a date for this post.");
      return;
    }
    add({ ...trend, concept: parsed.data, scheduledDate: date });
    setError(null);
    setSaved(true);
  }

  const field = (name: string) => `${uid}-${name}`;
  const edit =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setSaved(false);
    };
  const labelClass = "text-xs font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <article
      aria-label={`Post idea ${index + 1}`}
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-shadow hover:shadow-md ${
        saved ? "ring-2 ring-success/40" : ""
      }`}
    >
      <header className="flex items-center justify-between gap-2 border-b bg-muted/40 px-5 py-3">
        <span className="text-sm font-semibold">Idea {index + 1}</span>
        <PlatformChip platform={platform} />
      </header>

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <div className="space-y-1.5">
          <Label htmlFor={field("hook")} className={labelClass}>
            Hook
          </Label>
          <Input
            id={field("hook")}
            className="font-medium"
            value={hook}
            onChange={(e) => edit(setHook)(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field("caption")} className={labelClass}>
            Caption
          </Label>
          <Textarea id={field("caption")} rows={5} value={caption} onChange={(e) => edit(setCaption)(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field("visual")} className={labelClass}>
            Visual idea
          </Label>
          <Textarea
            id={field("visual")}
            rows={3}
            value={visualIdea}
            onChange={(e) => edit(setVisualIdea)(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field("tags")} className={labelClass}>
            Hashtags
          </Label>
          <Input
            id={field("tags")}
            className="text-primary"
            value={hashtags}
            onChange={(e) => edit(setHashtags)(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={field("platform")} className={labelClass}>
              Platform
            </Label>
            <select
              id={field("platform")}
              value={platform}
              onChange={(e) => edit(setPlatform)(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {platformOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={field("date")} className={labelClass}>
              Post on
            </Label>
            <Input id={field("date")} type="date" value={date} onChange={(e) => edit(setDate)(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={field("window")} className={labelClass}>
            Posting window
          </Label>
          <Input
            id={field("window")}
            value={postingWindow}
            onChange={(e) => edit(setPostingWindow)(e.target.value)}
          />
        </div>
      </div>

      <footer className="space-y-2 border-t px-5 py-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved ? (
          <p role="status" className="flex items-center gap-1.5 text-sm text-success">
            <CircleCheck aria-hidden className="size-4" />
            Saved to calendar ✓
            <Link href="/calendar" className="ml-auto font-medium text-foreground underline underline-offset-2">
              View calendar
            </Link>
          </p>
        ) : (
          <Button className="w-full" size="lg" onClick={save}>
            <CalendarCheck aria-hidden className="size-4" />
            Approve &amp; save to calendar
          </Button>
        )}
      </footer>
    </article>
  );
}
