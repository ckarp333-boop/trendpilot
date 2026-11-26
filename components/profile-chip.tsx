"use client";

import Link from "next/link";
import { useHydrated } from "@/lib/client/local-store";
import { useProfile } from "@/lib/client/profile-store";

/** Which business the app is working for, top right. Links to the profile. */
export function ProfileChip() {
  const hydrated = useHydrated();
  const { profile, isCustom } = useProfile();
  if (!hydrated) return <span className="hidden h-8 w-40 md:block" />;
  const initials = profile.businessName
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <Link
      href="/profile"
      title="Edit brand profile"
      className="hidden items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm shadow-xs transition-colors hover:bg-secondary md:flex"
    >
      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-primary">
        {initials}
      </span>
      <span className="max-w-40 truncate font-medium">{profile.businessName}</span>
      {!isCustom && <span className="rounded-full bg-secondary px-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Demo</span>}
    </Link>
  );
}
