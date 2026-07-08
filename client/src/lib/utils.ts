import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PHILIPPINE_TIMEZONE = "Asia/Manila";

// Returns YYYY-MM-DD in Philippine time.
export function localIsoDate(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: PHILIPPINE_TIMEZONE });
}

export function isoDateWithOffset(offsetDays: number): string {
  const parts = localIsoDate().split("-").map(Number);
  const base = new Date(Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toLocaleDateString("en-CA", { timeZone: "UTC" });
}

// Formats a database datetime as a wall-clock time without applying browser timezone conversion.
export function formatDatabaseTime(value: string | null | undefined): string {
  if (!value) return "-";

  const normalized = value.replace("T", " ").replace(/Z$/, "");
  const match = normalized.match(/(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return normalized;

  const hour24 = Number(match[1]);
  const minute = match[2];
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}
