"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Croissant,
  type LucideIcon,
  MessageCircleHeart,
  RotateCcw,
  Save,
  ShieldAlert,
  Store,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/lib/client/local-store";
import { useProfile } from "@/lib/client/profile-store";
import { BrandProfileSchema, DEMO_PROFILE, type BrandProfile } from "@/lib/profile/schema";

type Draft = Record<keyof BrandProfile, string>;

function toDraft(p: BrandProfile): Draft {
  return {
    businessName: p.businessName,
    businessType: p.businessType,
    location: p.location,
    products: p.products.join("\n"),
    values: p.values.join("\n"),
    tone: p.tone,
    audience: p.audience.join("\n"),
    topicsToAvoid: p.topicsToAvoid.join("\n"),
    postingPlatforms: p.postingPlatforms.join("\n"),
    openingHours: p.openingHours ?? "",
  };
}

function fromDraft(d: Draft) {
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    businessName: d.businessName.trim(),
    businessType: d.businessType.trim(),
    location: d.location.trim(),
    products: lines(d.products),
    values: lines(d.values),
    tone: d.tone.trim(),
    audience: lines(d.audience),
    topicsToAvoid: lines(d.topicsToAvoid),
    postingPlatforms: lines(d.postingPlatforms),
    openingHours: d.openingHours.trim() || undefined,
  };
}

const sameProfile = (a: BrandProfile, b: BrandProfile) =>
  JSON.stringify(BrandProfileSchema.parse(a)) === JSON.stringify(BrandProfileSchema.parse(b));

const LABELS: Record<keyof BrandProfile, { label: string; hint?: string }> = {
  businessName: { label: "Business name" },
  businessType: { label: "Type of business" },
  location: { label: "Location" },
  products: { label: "Products", hint: "One per line" },
  values: { label: "Values", hint: "One per line" },
  tone: { label: "Tone of voice" },
  audience: { label: "Audience", hint: "One per line" },
  topicsToAvoid: { label: "Topics to avoid", hint: "One per line. Trends that mention these are filtered out." },
  postingPlatforms: { label: "Posting platforms", hint: "One per line, e.g. Instagram" },
  openingHours: { label: "Opening hours", hint: "Optional. Used to suggest posting times." },
};

export function ProfileForm() {
  const hydrated = useHydrated();
  // Remount the editor once the saved profile has been read from localStorage.
  return <ProfileEditor key={hydrated ? "ready" : "ssr"} />;
}

function ProfileEditor() {
  const { profile, isCustom, save, reset } = useProfile();
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile));
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = (k: keyof BrandProfile) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setStatus(null);
  };

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = BrandProfileSchema.safeParse(fromDraft(draft));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = LABELS[issue.path[0] as keyof BrandProfile]?.label ?? "A field";
      setStatus({ kind: "error", text: `${field}: ${issue.message}` });
      return;
    }
    // Identical to the demo: keep using the demo (and its saved AI results).
    const stored = sameProfile(parsed.data, DEMO_PROFILE) ? reset() : save(parsed.data);
    setDraft(toDraft(parsed.data));
    setStatus(
      stored
        ? { kind: "ok", text: "Profile saved." }
        : { kind: "error", text: "Saved for this browser tab only: your browser's storage is full or blocked." },
    );
  }

  function onReset() {
    if (!window.confirm("Reset to the Rise & Grind demo profile? Your edits will be lost.")) return;
    reset();
    setDraft(toDraft(DEMO_PROFILE));
    setStatus({ kind: "ok", text: "Reset to the demo profile." });
  }

  const textField = (k: keyof BrandProfile, multiline = false, rows = 3) => (
    <div className="space-y-1.5" key={k}>
      <Label htmlFor={`profile-${k}`}>{LABELS[k].label}</Label>
      {multiline ? (
        <Textarea id={`profile-${k}`} rows={rows} value={draft[k]} onChange={(e) => set(k)(e.target.value)} />
      ) : (
        <Input id={`profile-${k}`} value={draft[k]} onChange={(e) => set(k)(e.target.value)} />
      )}
      {LABELS[k].hint && <p className="text-xs text-muted-foreground">{LABELS[k].hint}</p>}
    </div>
  );

  const section = (icon: LucideIcon, title: string, description: string, body: React.ReactNode) => {
    const Icon = icon;
    return (
      <section className="grid gap-5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 lg:grid-cols-[14rem_1fr]">
        <div className="space-y-1.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-primary">
            <Icon aria-hidden className="size-4.5" />
          </span>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{body}</div>
      </section>
    );
  };

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={isCustom ? "Your profile" : "Demo profile"}
        icon={Store}
        title="Brand profile"
        description={
          isCustom
            ? "You're using your own edited profile. It's saved in this browser only."
            : "You're using the Rise & Grind Bakery demo profile (a fictional business). Edit anything to make it yours."
        }
      />

      <form onSubmit={onSave} className="space-y-4">
        {section(
          Building2,
          "The business",
          "Who you are and where.",
          <>
            {textField("businessName")}
            {textField("businessType")}
            <div className="sm:col-span-2">{textField("location")}</div>
          </>,
        )}
        {section(
          Croissant,
          "What you offer",
          "Products and values the AI should build posts around.",
          <>
            {textField("products", true, 6)}
            {textField("values", true, 6)}
          </>,
        )}
        {section(
          MessageCircleHeart,
          "Voice and audience",
          "How you sound and who you're talking to.",
          <>
            {textField("tone", true, 4)}
            {textField("audience", true, 4)}
          </>,
        )}
        {section(
          ShieldAlert,
          "Safety and posting",
          "Topics to keep away from, and where and when you post.",
          <>
            {textField("topicsToAvoid", true, 6)}
            <div className="space-y-4">
              {textField("postingPlatforms", true, 3)}
              {textField("openingHours")}
            </div>
          </>,
        )}

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card/90 p-4 shadow-lg backdrop-blur">
          <Button type="submit" size="lg">
            <Save aria-hidden className="size-4" />
            Save profile
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={onReset}>
            <RotateCcw aria-hidden className="size-4" />
            Reset to demo profile
          </Button>
          {status ? (
            <p
              role={status.kind === "error" ? "alert" : "status"}
              className={status.kind === "error" ? "text-sm text-destructive" : "text-sm text-success"}
            >
              {status.text}{" "}
              {status.kind === "ok" && (
                <Link href="/" className="font-medium text-foreground underline underline-offset-2">
                  See trends
                </Link>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground sm:ml-auto sm:max-w-sm sm:text-right">
              Editing the profile means fresh AI scores and ideas (up to 30 seconds). The demo profile uses saved
              results.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
