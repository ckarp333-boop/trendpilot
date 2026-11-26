"use client";

import { BrandProfileSchema, DEMO_PROFILE, type BrandProfile } from "../profile/schema";
import { createLocalStore, useLocalStore } from "./local-store";

/** null = no saved edits, use the demo profile. */
export const profileStore = createLocalStore<BrandProfile | null>(
  "trendpilot.profile.v1",
  BrandProfileSchema.nullable(),
  null,
);

export function useProfile() {
  const saved = useLocalStore(profileStore);
  return {
    profile: saved ?? DEMO_PROFILE,
    /** The profile to send to the API: undefined means "use the server's demo profile". */
    apiProfile: saved ?? undefined,
    isCustom: saved !== null,
    save: (p: BrandProfile) => profileStore.write(p),
    reset: () => profileStore.write(null),
  };
}
