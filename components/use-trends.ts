"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTrends } from "@/lib/client/api";
import { useHydrated } from "@/lib/client/local-store";
import { useProfile } from "@/lib/client/profile-store";
import type { TrendsResponse } from "@/lib/generate/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TrendsResponse };

/** Load safe, ranked trends for the saved profile (waits until the profile is read). */
export function useTrends() {
  const hydrated = useHydrated();
  const { apiProfile } = useProfile();
  const profileKey = JSON.stringify(apiProfile ?? null);
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const profile = JSON.parse(profileKey) ?? undefined;
    fetchTrends(profile)
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((err: Error) => !cancelled && setState({ status: "error", message: err.message }));
    return () => {
      cancelled = true;
    };
  }, [hydrated, profileKey, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

export function formatSnapshotDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
