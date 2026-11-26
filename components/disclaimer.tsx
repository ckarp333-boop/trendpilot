export function Disclaimer({ snapshotDate }: { snapshotDate?: string }) {
  return (
    <aside
      role="note"
      aria-label="Disclaimer"
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <strong>AI-generated ideas need your approval.</strong> Review and edit every post before it goes out.
      Nothing is posted automatically.{" "}
      <span className="text-amber-900/80 dark:text-amber-100/80">
        Trends come from a saved snapshot of YouTube&apos;s most popular videos in Canada
        {snapshotDate ? ` (captured ${snapshotDate})` : ""}, so they may be out of date, and the safety filter
        can make mistakes. Concepts are original ideas, not copies of the videos.
      </span>
    </aside>
  );
}
