"use client";

import { createLocalStore, useLocalStore } from "./local-store";
import {
  DEFAULT_METRICS_STATE,
  MetricsStateSchema,
  type EnteredField,
  type MetricKey,
  type MetricsState,
} from "./metrics";

export const metricsStore = createLocalStore<MetricsState>(
  "trendpilot.metrics.v1",
  MetricsStateSchema,
  DEFAULT_METRICS_STATE,
);

export function useMetrics() {
  const state = useLocalStore(metricsStore);
  const update = (fn: (s: MetricsState) => MetricsState) => metricsStore.write(fn(metricsStore.read()));

  return {
    state,
    isEnabled: (k: MetricKey) => state.enabled[k] ?? true,
    toggle: (k: MetricKey) =>
      update((s) => ({ ...s, enabled: { ...s.enabled, [k]: !(s.enabled[k] ?? true) } })),
    setValue: (entryId: string, field: EnteredField, value: number | undefined) =>
      update((s) => {
        const current = { ...s.values[entryId] };
        if (value === undefined) delete current[field];
        else current[field] = value;
        return { ...s, values: { ...s.values, [entryId]: current } };
      }),
  };
}
