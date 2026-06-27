export function normalizeGradeLevelName(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const stripped = raw.replace(/^grade\s+/i, "").trim();
  if (!stripped) return "";

  if (/^[a-z]$/i.test(stripped)) {
    return stripped.toUpperCase();
  }

  return stripped;
}

const GRADE_LEVEL_ORDER = ["T", "N", "K", "1", "2", "3", "4", "5", "6"] as const;

export function getGradeLevelSortRank(value: string | null | undefined): number {
  const normalized = normalizeGradeLevelName(value);
  const index = GRADE_LEVEL_ORDER.indexOf(normalized as (typeof GRADE_LEVEL_ORDER)[number]);
  if (index !== -1) return index;

  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return GRADE_LEVEL_ORDER.length + numeric;

  return GRADE_LEVEL_ORDER.length + 100;
}
