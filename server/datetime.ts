export const PHILIPPINE_TIMEZONE = "Asia/Manila";

export function getPhilippineTimezone(): string {
  return PHILIPPINE_TIMEZONE;
}

export function formatDateTimeInTimezone(date: Date, _timezone = PHILIPPINE_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHILIPPINE_TIMEZONE,
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
  return formatDateTimeInTimezone(date, PHILIPPINE_TIMEZONE);
}
