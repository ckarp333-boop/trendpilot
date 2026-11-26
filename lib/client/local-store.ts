"use client";

import { useSyncExternalStore } from "react";
import type { z } from "zod";

export interface LocalStore<T> {
  read(): T;
  write(value: T | null): void;
  subscribe(listener: () => void): () => void;
  fallback: T;
}

/**
 * A small localStorage-backed store, validated with zod. If localStorage is unavailable
 * (private mode, blocked storage) it keeps the value in memory for this tab instead.
 * Writing null removes the key, so read() returns the fallback.
 */
export function createLocalStore<T>(key: string, schema: z.ZodType<T>, fallback: T): LocalStore<T> {
  let memoryRaw: string | null = null;
  let cache: { raw: string | null; value: T } | undefined;
  const listeners = new Set<() => void>();

  function readRaw(): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryRaw;
    }
  }

  return {
    fallback,
    read() {
      const raw = readRaw();
      if (cache && cache.raw === raw) return cache.value;
      let value = fallback;
      if (raw) {
        try {
          const parsed = schema.safeParse(JSON.parse(raw));
          if (parsed.success) value = parsed.data;
        } catch {
          // Corrupt JSON: fall back.
        }
      }
      cache = { raw, value };
      return value;
    },
    write(value) {
      const raw = value === null ? null : JSON.stringify(value);
      memoryRaw = raw;
      try {
        if (raw === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, raw);
      } catch {
        // Storage unavailable: memoryRaw keeps the value for this tab.
      }
      cache = undefined;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = undefined;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

/** Read a LocalStore in a component. Renders the fallback on the server and first paint. */
export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.read, () => store.fallback);
}

const noopSubscribe = () => () => {};

/** False during server render and hydration, true once running in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
