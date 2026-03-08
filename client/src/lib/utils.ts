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
