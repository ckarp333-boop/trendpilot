/** Local-date helpers (no time zones needed: everything is the owner's local day). */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday of the week containing d. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  return addDays(d, -day);
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Suggested date for a concept's posting window: the next day (from today, inclusive) whose
 * name appears in the window, e.g. "Saturday 8:00-10:00 AM". Falls back to tomorrow.
 */
export function suggestedDate(postingWindow: string, today: Date = new Date()): string {
  const text = postingWindow.toLowerCase();
  const target = DAYS.findIndex((d) => text.includes(d) || new RegExp(`\\b${d.slice(0, 3)}\\b`).test(text));
  if (target === -1) return toISODate(addDays(today, 1));
  const diff = (target - today.getDay() + 7) % 7;
  return toISODate(addDays(today, diff));
}

export function formatDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "18 h", "2 d 4 h" between two ISO timestamps (never negative). */
export function elapsed(fromIso: string, toIso: string): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}
