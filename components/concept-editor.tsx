"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const edit = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setSaved(false);
  };

  return (
    <Card className="h-full py-4" aria-label={`Post idea ${index + 1}`}>
      <CardContent className="flex h-full flex-col gap-3">
        <p className="text-sm font-semibold text-muted-foreground">Idea {index + 1}</p>

        <div className="space-y-1">
          <Label htmlFor={field("hook")}>Hook</Label>
          <Input id={field("hook")} value={hook} onChange={(e) => edit(setHook)(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("caption")}>Caption</Label>
          <Textarea id={field("caption")} rows={5} value={caption} onChange={(e) => edit(setCaption)(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("visual")}>Visual idea</Label>
          <Textarea id={field("visual")} rows={3} value={visualIdea} onChange={(e) => edit(setVisualIdea)(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("tags")}>Hashtags</Label>
          <Input id={field("tags")} value={hashtags} onChange={(e) => edit(setHashtags)(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={field("platform")}>Platform</Label>
            <select
              id={field("platform")}
              value={platform}
              onChange={(e) => edit(setPlatform)(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {platformOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={field("date")}>Post on</Label>
            <Input id={field("date")} type="date" value={date} onChange={(e) => edit(setDate)(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={field("window")}>Posting window</Label>
          <Input id={field("window")} value={postingWindow} onChange={(e) => edit(setPostingWindow)(e.target.value)} />
        </div>

        <div className="mt-auto space-y-2 pt-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {saved ? (
            <p role="status" className="text-sm">
              Saved to calendar ✓{" "}
              <Link href="/calendar" className="underline underline-offset-2">
                View calendar
              </Link>
            </p>
          ) : (
            <Button className="w-full" onClick={save}>
              Approve &amp; save to calendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
