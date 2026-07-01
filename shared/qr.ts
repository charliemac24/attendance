import { createHash } from "crypto";

export function buildStudentQrToken(studentNo: unknown): string {
  const normalized = String(studentNo || "").trim();
  if (!normalized) {
    return "";
  }

  return createHash("md5").update(normalized, "utf8").digest("hex");
}
