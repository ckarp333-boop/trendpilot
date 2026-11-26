import { Badge } from "@/components/ui/badge";
import type { FilterLayer } from "@/lib/safety/filter";

export function FitBadge({ score }: { score?: number }) {
  if (score === undefined) {
    return <Badge variant="outline">No score</Badge>;
  }
  const tone =
    score >= 70
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100"
      : score >= 40
        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex min-w-14 flex-col items-center rounded-md px-2 py-1 text-center ${tone}`}
      aria-label={`Fit score ${score} out of 100`}
    >
      <span className="text-lg font-semibold leading-none">{score}</span>
      <span className="text-[10px] uppercase tracking-wide">fit</span>
    </span>
  );
}

export function PlatformBadges({ category }: { category: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge className="bg-red-600 text-white hover:bg-red-600">YouTube</Badge>
      <Badge variant="secondary">{category}</Badge>
    </span>
  );
}

export function SourceLink({ url, label = "Watch source video" }: { url: string; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {label} ↗
    </a>
  );
}

export const LAYER_LABELS: Record<FilterLayer, string> = {
  category: "Category",
  blocklist: "Blocked word",
  profile: "Your topics to avoid",
  llm: "AI safety check",
};

export function formatViews(n: number): string {
  return new Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
