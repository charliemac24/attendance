const DEFAULT_APP_TIMEZONE = "Asia/Manila";

export function formatDateTimeInTimezone(date: Date, timezone = DEFAULT_APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}

export function formatQueueDateTime(date: Date): string {
  return formatDateTimeInTimezone(date, DEFAULT_APP_TIMEZONE);
}
