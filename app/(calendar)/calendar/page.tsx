import type { Metadata } from "next";
import { CalendarWeek } from "@/components/calendar-week";

export const metadata: Metadata = { title: "Content calendar" };

export default function CalendarPage() {
  return <CalendarWeek />;
}
