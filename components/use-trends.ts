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

/** How long the dashboard and trend pages reuse one trends response in this tab. */
const CLIENT_TTL_MS = 5 * 60_000;
let lastFetch: { key: string; at: number; promise: Promise<TrendsResponse> } | undefined;

/**
 * One /api/trends request per profile per CLIENT_TTL_MS, shared by the dashboard and trend pages,
 * so moving between them doesn't re-run scoring. A failed request is never reused.
 */
function loadTrends(profileKey: string, force: boolean): Promise<TrendsResponse> {
  const now = Date.now();
  if (force || !lastFetch || lastFetch.key !== profileKey || now - lastFetch.at > CLIENT_TTL_MS) {
    const promise = fetchTrends(JSON.parse(profileKey) ?? undefined);
    const entry = { key: profileKey, at: now, promise };
    lastFetch = entry;
    promise.catch(() => {
      if (lastFetch === entry) lastFetch = undefined;
    });
  }
  return lastFetch.promise;
}

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
    loadTrends(profileKey, attempt > 0)
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
