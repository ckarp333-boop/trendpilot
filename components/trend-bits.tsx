import { ExternalLink, Eye, Heart, Rocket, Zap } from "lucide-react";
import type { FilterLayer } from "@/lib/safety/filter";
import type { TrendItem } from "@/lib/youtube/schema";
import { computeSignals } from "@/lib/youtube/signals";

function fitTone(score: number) {
  if (score >= 70) return { stroke: "var(--success)", label: "Great fit" };
  if (score >= 40) return { stroke: "var(--warning)", label: "Good fit" };
  return { stroke: "var(--muted-foreground)", label: "Stretch" };
}

/** Circular fit-score meter (0-100). */
export function FitRing({ score, size = 56 }: { score?: number; size?: number }) {
  if (score === undefined) {
    return (
      <div
        role="img"
        aria-label="No fit score"
        className="grid shrink-0 place-items-center rounded-full border border-dashed text-xs text-muted-foreground"
        style={{ width: size, height: size }}
      >
        n/a
      </div>
    );
  }
  const stroke = Math.max(4, Math.round(size / 12));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { stroke: color } = fitTone(score);
  return (
    <div
      role="img"
      aria-label={`Fit score ${score} out of 100`}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center leading-none" aria-hidden>
        <span className="text-center">
          <span className="block font-semibold tabular-nums" style={{ fontSize: size * 0.3 }}>
            {score}
          </span>
          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">fit</span>
        </span>
      </span>
    </div>
  );
}

export function fitLabel(score?: number) {
  return score === undefined ? "Not scored" : fitTone(score).label;
}

export function PlatformBadges({ category }: { category: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.95_0.03_25)] px-2 py-0.5 text-xs font-medium text-[oklch(0.5_0.19_27)] dark:bg-[oklch(0.3_0.06_25)] dark:text-[oklch(0.85_0.08_25)]">
        <span aria-hidden className="size-1.5 rounded-full bg-[oklch(0.6_0.22_27)]" />
        YouTube
      </span>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{category}</span>
    </span>
  );
}

export function Views({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Eye aria-hidden className="size-3.5" />
      {formatViews(n)} views
    </span>
  );
}

/** Velocity, engagement and breakout chips for one trend. Hidden signals are skipped. */
export function Signals({ item, asOf }: { item: TrendItem; asOf: string }) {
  const s = computeSignals(item, asOf);
  const chips: { icon: typeof Eye; text: string; title: string; hot: boolean }[] = [
    {
      icon: Zap,
      text: `${formatViews(Math.round(s.viewsPerHour))}/hr`,
      title: `Velocity: about ${formatViews(Math.round(s.viewsPerHour))} views per hour over ${formatHours(s.hoursLive)} since posting`,
      hot: s.viewsPerHour >= HOT_VIEWS_PER_HOUR,
    },
  ];
  if (s.engagementRate !== null) {
    chips.push({
      icon: Heart,
      text: `${formatPercent(s.engagementRate)} engaged`,
      title: "Engagement: likes plus comments as a share of views",
      hot: s.engagementRate >= HOT_ENGAGEMENT,
    });
  }
  if (s.breakoutRatio !== null) {
    chips.push({
      icon: Rocket,
      text: `${formatRatio(s.breakoutRatio)} reach`,
      title: `Breakout: views are ${formatRatio(s.breakoutRatio)} the channel's ${formatViews(item.channelSubscribers ?? 0)} subscribers`,
      hot: s.breakoutRatio >= HOT_BREAKOUT,
    });
  }
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Engagement signals">
      {chips.map(({ icon: Icon, text, title, hot }) => (
        <span
          key={title}
          title={title}
          className={`inline-flex items-center gap-1 text-xs ${hot ? "font-medium text-primary" : "text-muted-foreground"}`}
        >
          <Icon aria-hidden className="size-3.5" />
          {text}
          <span className="sr-only">. {title}</span>
        </span>
      ))}
    </span>
  );
}

/** Thresholds for highlighting a signal. Rough rules of thumb for mostPopular videos. */
const HOT_VIEWS_PER_HOUR = 100_000;
const HOT_ENGAGEMENT = 0.04;
const HOT_BREAKOUT = 10;

function formatPercent(r: number): string {
  return `${(r * 100).toFixed(r < 0.1 ? 1 : 0)}%`;
}

function formatRatio(r: number): string {
  return `${r >= 10 ? Math.round(r).toLocaleString("en-CA") : r.toFixed(1)}×`;
}

function formatHours(h: number): string {
  return h < 48 ? `${Math.round(h)} hours` : `${Math.round(h / 24)} days`;
}

export function SourceLink({ url, label = "Watch source video" }: { url: string; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      {label}
      <ExternalLink aria-hidden className="size-3" />
    </a>
  );
}

export const LAYER_LABELS: Record<FilterLayer, string> = {
  category: "Category",
  blocklist: "Blocked word",
  profile: "Your topics to avoid",
  llm: "AI safety check",
};

export const LAYER_TONES: Record<FilterLayer, string> = {
  category: "bg-secondary text-secondary-foreground",
  blocklist: "bg-[oklch(0.95_0.035_25)] text-[oklch(0.48_0.17_27)] dark:bg-[oklch(0.3_0.06_25)] dark:text-[oklch(0.85_0.08_25)]",
  profile: "bg-warning-soft text-warning-foreground",
  llm: "bg-[oklch(0.95_0.03_295)] text-[oklch(0.45_0.15_295)] dark:bg-[oklch(0.3_0.06_295)] dark:text-[oklch(0.85_0.08_295)]",
};

export function formatViews(n: number): string {
  return new Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const PLATFORM_TONES: Record<string, string> = {
  instagram: "bg-[oklch(0.95_0.04_350)] text-[oklch(0.48_0.18_350)] dark:bg-[oklch(0.3_0.07_350)] dark:text-[oklch(0.85_0.09_350)]",
  tiktok: "bg-[oklch(0.94_0.03_200)] text-[oklch(0.42_0.08_220)] dark:bg-[oklch(0.3_0.05_200)] dark:text-[oklch(0.85_0.07_200)]",
  facebook: "bg-[oklch(0.94_0.04_260)] text-[oklch(0.45_0.16_260)] dark:bg-[oklch(0.3_0.07_260)] dark:text-[oklch(0.85_0.08_260)]",
};

export function PlatformChip({ platform }: { platform: string }) {
  const tone = PLATFORM_TONES[platform.toLowerCase()] ?? "bg-secondary text-secondary-foreground";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{platform}</span>;
}
