import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns YYYY-MM-DD in the user's local timezone (avoids UTC date shifting).
export function localIsoDate(): string {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
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
