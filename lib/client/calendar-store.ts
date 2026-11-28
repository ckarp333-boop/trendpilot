"use client";

import { z } from "zod";
import { createLocalStore, useLocalStore } from "./local-store";

/** A concept after the owner has edited it (looser than the LLM schema). */
export const SavedConceptSchema = z.object({
  hook: z.string().trim().min(1, "Add a hook").max(300),
  caption: z.string().trim().min(1, "Add a caption").max(2200),
  visualIdea: z.string().trim().min(1, "Add a visual idea").max(1000),
  hashtags: z.array(z.string().min(2)).max(15),
  platform: z.string().trim().min(1, "Pick a platform").max(40),
  postingWindow: z.string().trim().min(1, "Add a posting window").max(100),
});
export type SavedConcept = z.infer<typeof SavedConceptSchema>;

export const CalendarEntrySchema = z.object({
  id: z.string().min(1),
  trendId: z.string().min(1),
  trendTitle: z.string(),
  trendUrl: z.string(),
  categoryName: z.string(),
  /** When the trend data was captured, for speed-to-market. */
  trendCapturedAt: z.string(),
  concept: SavedConceptSchema,
  /** Local date, YYYY-MM-DD. */
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
  postedAt: z.string().optional(),
});
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;

const EMPTY: CalendarEntry[] = [];

export const calendarStore = createLocalStore<CalendarEntry[]>(
  "trendpilot.calendar.v1",
  z.array(CalendarEntrySchema),
  EMPTY,
);

/** "#yyc", "yyc", "# YYC Eats" -> "#yyc", "#YYCEats". Drops empty or symbol-only tags. */
export function normaliseHashtags(input: string): string[] {
  return input
    .split(/[\s,]+(?=#)|,|\s+/)
    .map((t) => "#" + t.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((t) => t.length > 1);
}

export function useCalendar() {
  const entries = useLocalStore(calendarStore);
  const update = (fn: (list: CalendarEntry[]) => CalendarEntry[]) => calendarStore.write(fn(calendarStore.read()));

  return {
    entries,
    add: (entry: Omit<CalendarEntry, "id" | "createdAt">) => {
      const full: CalendarEntry = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const stored = update((list) => [...list, full]);
      return { entry: full, stored };
    },
    remove: (id: string) => update((list) => list.filter((e) => e.id !== id)),
    markPosted: (id: string) =>
      update((list) => list.map((e) => (e.id === id ? { ...e, postedAt: new Date().toISOString() } : e))),
    unmarkPosted: (id: string) =>
      update((list) => list.map((e) => (e.id === id ? { ...e, postedAt: undefined } : e))),
  };
}
