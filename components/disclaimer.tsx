import { ShieldCheck } from "lucide-react";

export function Disclaimer({ snapshotDate }: { snapshotDate?: string }) {
  return (
    <aside
      role="note"
      aria-label="Disclaimer"
      className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft/70 px-4 py-3 text-sm text-warning-foreground"
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong className="font-semibold">AI-generated ideas need your approval.</strong> Review and edit every post
        before it goes out; nothing is posted automatically.{" "}
        <span className="opacity-80">
          Trends come from a saved snapshot of YouTube&apos;s most popular videos in Canada
          {snapshotDate ? ` (captured ${snapshotDate})` : ""}, so they may be out of date, and the safety filter can make
          mistakes. Ideas are original, not copies of the videos.
        </span>
      </p>
    </aside>
  );
}
