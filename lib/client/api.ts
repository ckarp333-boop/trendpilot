"use client";

import type { GenerateResponse, TrendsResponse } from "../generate/types";
import type { BrandProfile } from "../profile/schema";

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    throw new Error(
      name === "TimeoutError"
        ? "This is taking longer than expected. Please try again."
        : "Couldn't reach the TrendPilot server. Check your connection and try again.",
    );
  }
  const json = (await res.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!res.ok || !json) throw new Error(json?.error ?? "Something went wrong. Please try again.");
  return json;
}

/** Safe, ranked trends for a profile (undefined = demo profile). */
export function fetchTrends(profile?: BrandProfile): Promise<TrendsResponse> {
  return postJson<TrendsResponse>("/api/trends", { profile }, 120_000);
}

/** 3 post concepts for a safe trend. */
export function fetchConcepts(trendId: string, profile?: BrandProfile): Promise<GenerateResponse> {
  return postJson<GenerateResponse>("/api/generate", { trendId, profile }, 120_000);
}
