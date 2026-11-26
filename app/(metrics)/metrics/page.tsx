import type { Metadata } from "next";
import { MetricsPanel } from "@/components/metrics-panel";

export const metadata: Metadata = { title: "Value metrics" };

export default function MetricsPage() {
  return <MetricsPanel />;
}
