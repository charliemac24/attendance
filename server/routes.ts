import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import multer from "multer";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { attendanceEvents, dailyAttendances, gradeLevels, schools, sections, smsLogs, students, type Student } from "@shared/schema";
import { buildStudentQrToken } from "@shared/qr";

const MemoryStore = createMemoryStore(session);
const upload = multer({ storage: multer.memoryStorage() });
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const recentScanAtByStudent = new Map<number, number>();

declare module "express-session" {
  interface SessionData {
    userId: number;
    schoolId: number | null;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

async function getSchoolId(req: Request): Promise<number | null> {
  if (!req.session.userId) return null;
  const user = await storage.getUserById(req.session.userId);
  if (!user) return null;

  if (user.role === "super_admin") {
    const querySchoolId = req.query.school_id as string;
    if (querySchoolId) return Number(querySchoolId);
    if (req.session.schoolId) return req.session.schoolId;
    const allSchools = await storage.getSchools();
    return allSchools.length > 0 ? allSchools[0].id : null;
  }

  return user.schoolId;
}

async function getSectionScopeForUser(req: Request, schoolId: number | null): Promise<number[] | null> {
  if (!req.session.userId || !schoolId) return null;
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.role !== "teacher") return null;
  return await storage.getTeacherSectionIds(user.id);
}

function filterRecordsToSectionScope<T extends { sectionId?: number | null }>(records: T[], sectionIds: number[] | null): T[] {
  if (sectionIds === null) return records;
  const allowed = new Set(sectionIds);
  return records.filter((record) => record.sectionId !== null && record.sectionId !== undefined && allowed.has(Number(record.sectionId)));
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "63" + digits.substring(1);
  }
  if (digits.startsWith("63")) {
    return digits;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return "63" + digits;
  }
  return digits;
}

function slugifySchoolLabel(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function formatSchoolLabelFromSlug(value: string): string {
  const words = String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.toUpperCase());
  return words.join(" ");
}

function renderSmsTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/gi, (_m, token) => {
    const key = String(token).toLowerCase();
    return variables[key] ?? "";
  });
}

function getTodayIsoInTimezone(timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatIsoInTimezone(date: Date, timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTimeInTimezone(date: Date, timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}

function formatDatabaseDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return value.replace("T", " ").replace(/Z$/, "").slice(0, 19);
  }

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hour = String(value.getUTCHours()).padStart(2, "0");
  const minute = String(value.getUTCMinutes()).padStart(2, "0");
  const second = String(value.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function normalizeAttendanceRecordTimes<T extends { checkInTime?: Date | string | null; checkOutTime?: Date | string | null }>(
  record: T,
): T & { checkInTime: string | null; checkOutTime: string | null } {
  return {
    ...record,
    checkInTime: formatDatabaseDateTime(record.checkInTime),
    checkOutTime: formatDatabaseDateTime(record.checkOutTime),
  };
}

function formatEventDateForTemplate(eventTime: Date | string, timezone?: string): string {
  if (eventTime instanceof Date) {
    return formatIsoInTimezone(eventTime, timezone);
  }

  const normalized = eventTime.replace("T", " ").replace(/Z$/, "");
  return normalized.slice(0, 10);
}

function formatEventTimeForTemplate(eventTime: Date | string): string {
  if (eventTime instanceof Date) {
    return eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const normalized = eventTime.replace("T", " ").replace(/Z$/, "");
  const match = normalized.match(/(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return normalized;

  const hour24 = Number(match[1]);
  const minute = match[2];
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
}

function mysqlDateTime(value: string) {
  return sql`STR_TO_DATE(${value}, '%Y-%m-%d %H:%i:%s')`;
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function ensureStudentQrTokenIsAvailable(
  schoolId: number,
  studentNo: unknown,
  excludingStudentId?: number,
): Promise<string> {
  const qrToken = buildStudentQrToken(studentNo);
  if (!qrToken) {
    throw new Error("Student number is required.");
  }

  const existing = await storage.getStudentByQrToken(qrToken);
  if (existing && (existing.schoolId !== schoolId || existing.id !== excludingStudentId)) {
    throw new Error(`Student number ${qrToken} is already used as a QR token by another student.`);
  }

  return qrToken;
}

function parseScannedQrPayload(rawValue: unknown): {
  tokenCandidates: string[];
  studentNoCandidates: string[];
  studentIdCandidates: number[];
} {
  const raw = String(rawValue || "").trim();
  const tokenCandidates = new Set<string>();
  const studentNoCandidates = new Set<string>();
  const studentIdCandidates = new Set<number>();

  const addToken = (value: unknown) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    tokenCandidates.add(normalized);
    if (/^[0-9a-f]{32}$/i.test(normalized)) {
      tokenCandidates.add(normalized.toLowerCase());
    }
  };

  const addStudentNo = (value: unknown) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    studentNoCandidates.add(normalized);
  };

  const addStudentId = (value: unknown) => {
    const normalized = String(value || "").trim();
    if (!/^\d+$/.test(normalized)) return;
    studentIdCandidates.add(Number(normalized));
  };

  if (!raw) {
    return { tokenCandidates: [], studentNoCandidates: [], studentIdCandidates: [] };
  }

  addToken(raw);
  addStudentNo(raw);
  addStudentId(raw);

  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw) {
      addToken(decoded);
      addStudentNo(decoded);
      addStudentId(decoded);
    }
  } catch {
    // ignore malformed escape sequences in scanned payloads
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const keys = ["qrtoken", "token", "qr", "code", "studentno", "student_no", "studentid", "student_id", "id"];
      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (!value) continue;
        addToken(value);
        if (key.includes("studentno")) addStudentNo(value);
        if (key.includes("studentid") || key === "id") addStudentId(value);
      }

      const pathSegments = url.pathname.split("/").map((part) => part.trim()).filter(Boolean);
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment) {
        addToken(lastSegment);
        addStudentNo(lastSegment);
        addStudentId(lastSegment);
      }
    } catch {
      // If URL parsing fails, continue with the raw scanned value only.
    }
  }

  return {
    tokenCandidates: Array.from(tokenCandidates),
    studentNoCandidates: Array.from(studentNoCandidates),
    studentIdCandidates: Array.from(studentIdCandidates),
  };
}

async function resolveStudentFromScannedQr(
  schoolId: number,
  rawValue: unknown,
): Promise<Student | undefined> {
  const parsed = parseScannedQrPayload(rawValue);

  for (const candidate of parsed.tokenCandidates) {
    const student = await storage.getStudentByQrToken(candidate);
    if (student && student.schoolId === schoolId) {
      return student;
    }
  }

  for (const candidate of parsed.studentNoCandidates) {
    const student = await storage.getStudentBySchoolAndStudentNo(schoolId, candidate);
    if (student) {
      return student;
    }
  }

  for (const candidate of parsed.studentIdCandidates) {
    const student = await storage.getStudentBySchoolAndId(schoolId, candidate);
    if (student) {
      return student;
    }
  }

  return undefined;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateRangeOrThrow(input: { from?: unknown; to?: unknown; date?: unknown }): { from: string; to: string } {
  const from = String(input.from || input.date || "").trim();
  const to = String(input.to || input.date || "").trim();

  if (!isIsoDateString(from) || !isIsoDateString(to)) {
    throw new Error("Invalid date range. Use YYYY-MM-DD.");
  }

  if (from > to) {
    throw new Error("Invalid date range. 'From' must be on or before 'To'.");
  }

  return { from, to };
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function sendSemaphoreMessage(apiKey: string, senderName: string | null, toPhone: string, message: string) {
  const form = new URLSearchParams();
  form.set("apikey", apiKey);
  form.set("number", toPhone);
  form.set("message", message);
  if (senderName) {
    form.set("sendername", senderName);
  }

  const response = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText;
  }

  if (!response.ok) {
    const err = new Error(`Semaphore request failed (${response.status})`);
    (err as any).providerResponse = parsed;
    throw err;
  }

  const failureReason = getSemaphoreFailureReason(parsed);
  if (failureReason) {
    const err = new Error(`Semaphore rejected message: ${failureReason}`);
    (err as any).providerResponse = parsed;
    throw err;
  }

  return parsed;
}

function getSemaphoreMessageId(providerResponse: any): string | null {
  const first = Array.isArray(providerResponse) ? providerResponse[0] : providerResponse;
  return first?.message_id || first?.id || null;
}

function getSemaphoreFailureReason(providerResponse: any): string | null {
  if (!providerResponse) return "Empty response from Semaphore";
  if (typeof providerResponse === "string") {
    const s = providerResponse.toLowerCase();
    if (s.includes("error") || s.includes("invalid") || s.includes("failed") || s.includes("unauthorized")) {
      return providerResponse;
    }
    return null;
  }

  const first = Array.isArray(providerResponse) ? providerResponse[0] : providerResponse;
  if (!first) return "Empty response payload from Semaphore";

  if (typeof first.error === "string" && first.error.trim()) return first.error;
  if (typeof first.message === "string" && /invalid|unauthorized|failed|reject/i.test(first.message)) {
    return first.message;
  }

  const providerStatus = String(first.status ?? "");
  if (providerStatus && /failed|reject|invalid|error|undeliver/i.test(providerStatus)) {
    return `Provider status: ${providerStatus}`;
  }

  return null;
}

async function createSkippedSmsLog(params: {
  schoolId: number;
  studentId: number | null;
  templateType:
    | "check_in"
    | "check_out"
    | "out_final"
    | "break_out"
    | "break_in"
    | "early_out"
    | "late"
    | "absent";
  toPhone?: string | null;
  message?: string;
  reason: string;
}) {
  await storage.createSmsLog({
    schoolId: params.schoolId,
    studentId: params.studentId,
    templateType: params.templateType,
    toPhone: hasNonEmptyString(params.toPhone) ? normalizePhone(params.toPhone) : "N/A",
    message: params.message ?? "",
    status: "skipped",
    providerMessageId: null,
    providerResponse: null,
    sentAt: null,
    errorMessage: params.reason,
  });
  console.warn("SMS skipped", {
    schoolId: params.schoolId,
    studentId: params.studentId,
    templateType: params.templateType,
    toPhone: params.toPhone ?? null,
    reason: params.reason,
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function getDuplicateScanRemainingMs(studentId: number, nowMs: number, cooldownMs: number): number {
  if (cooldownMs <= 0) return 0;
  const prevMs = recentScanAtByStudent.get(studentId);
  if (!prevMs) return 0;
  const elapsed = nowMs - prevMs;
  if (elapsed >= cooldownMs) return 0;
  return cooldownMs - elapsed;
}

function markStudentScanNow(studentId: number, nowMs: number) {
  recentScanAtByStudent.set(studentId, nowMs);

  if (recentScanAtByStudent.size > 5000) {
    const cutoff = nowMs - 5 * 60_000;
    recentScanAtByStudent.forEach((at, id) => {
      if (at < cutoff) recentScanAtByStudent.delete(id);
    });
  }
}

function isAfterDismissalWindow(now: Date, dismissalTime: string, earlyOutWindowMinutes: number): boolean {
  const [hourStr, minuteStr] = dismissalTime.split(":");
  const dismissalMinutes = (Number(hourStr) * 60) + Number(minuteStr);
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return nowMinutes >= dismissalMinutes - earlyOutWindowMinutes;
}

async function getLastEventForAttendance(dailyAttendanceId: number) {
  const [event] = await db
    .select({
      eventType: attendanceEvents.eventType,
      occurredAt: attendanceEvents.occurredAt,
    })
    .from(attendanceEvents)
    .where(eq(attendanceEvents.dailyAttendanceId, dailyAttendanceId))
    .orderBy(desc(attendanceEvents.occurredAt))
    .limit(1);

  return event;
}

async function maybeSendAttendanceSms(args: {
  school: any;
  student: any;
  templateType:
    | "check_in"
    | "check_out"
    | "out_final"
    | "break_out"
    | "break_in"
    | "early_out"
    | "late"
    | "absent";
  eventTime: Date | string;
  status: string;
}) {
  const { school, student, templateType, eventTime, status } = args;
  if (!school?.id || !student?.id) return;
  if (!student.isActive) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student?.guardianPhone ?? null,
      reason: "Student is inactive",
    });
    return;
  }
  if (!school.smsEnabled) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student?.guardianPhone ?? null,
      reason: "SMS is disabled in school settings",
    });
    return;
  }

  if (school.smsProvider !== "semaphore") {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student?.guardianPhone ?? null,
      reason: `Unsupported SMS provider: ${school.smsProvider}`,
    });
    return;
  }

  if (!hasNonEmptyString(school.semaphoreApiKey)) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student?.guardianPhone ?? null,
      reason: "Missing Semaphore API key",
    });
    return;
  }

  if (!hasNonEmptyString(student?.guardianPhone)) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      reason: "Student guardian phone is empty",
    });
    return;
  }

  // Respect per-school absent toggle: skip if disabled
  if (templateType === "absent" && !school.absentSmsEnabled) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student.guardianPhone,
      reason: "Absent SMS disabled for this school",
    });
    return;
  }
  const templates = await storage.getSmsTemplates(school.id);
  let selectedTemplateType = templateType;
  let template = templates.find((t) => t.type === selectedTemplateType && t.enabled);
  if (!template && templateType === "out_final") {
    selectedTemplateType = "check_out";
    template = templates.find((t) => t.type === "check_out" && t.enabled);
  }
  if (!template) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student.guardianPhone,
      reason: `No enabled template for type: ${templateType}`,
    });
    return;
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const toPhone = normalizePhone(student.guardianPhone);
  const message = renderSmsTemplate(template.templateText, {
    school_name: school.name ?? "",
    student_name: studentName,
    grade_level: "",
    section: "",
    date: formatEventDateForTemplate(eventTime, school.timezone),
    time: formatEventTimeForTemplate(eventTime),
    status,
  });

  try {
    const providerResponse = await sendSemaphoreMessage(
      school.semaphoreApiKey,
      school.semaphoreSenderName || null,
      toPhone,
      message,
    );
    const providerMessageId = getSemaphoreMessageId(providerResponse);

    await storage.createSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType: selectedTemplateType,
      toPhone,
      message,
      status: "sent",
      providerMessageId,
      providerResponse,
      sentAt: new Date(),
      errorMessage: null,
    });
  } catch (err: any) {
    await storage.createSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType: selectedTemplateType,
      toPhone,
      message,
      status: "failed",
      providerMessageId: null,
      providerResponse: err?.providerResponse ?? null,
      sentAt: null,
      errorMessage: err?.message || "Failed to send SMS",
    });
    console.error("SMS send failed", {
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone,
      error: err?.message || String(err),
      providerResponse: err?.providerResponse ?? null,
    });
  }
}

async function buildTemplateBasedKioskMessage(args: {
  school: any;
  student: any;
  templateType: "check_in" | "check_out" | "late" | "absent";
  eventTime: Date | string;
  status: string;
}): Promise<string> {
  const { school, student, templateType, eventTime, status } = args;
  const templates = await storage.getSmsTemplates(school.id);
  const template = templates.find((t) => t.type === templateType);
  const studentName = `${student.firstName} ${student.lastName}`.trim();

  if (!template?.templateText) {
    if (templateType === "late") return `${studentName} checked in (Late)`;
    if (templateType === "check_out") return `${studentName} checked out`;
    if (templateType === "absent") return `${studentName} was marked absent`;
    return `${studentName} checked in`;
  }

  return renderSmsTemplate(template.templateText, {
    school_name: school.name ?? "",
    student_name: studentName,
    grade_level: "",
    section: "",
    date: formatEventDateForTemplate(eventTime, school.timezone),
    time: formatEventTimeForTemplate(eventTime),
    status,
  });
}

function getTimePartsInTimezone(date: Date, timezone?: string): { hour: number; minute: number } {
  if (!timezone) {
    return { hour: date.getHours(), minute: date.getMinutes() };
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return { hour, minute };
  } catch {
    return { hour: date.getHours(), minute: date.getMinutes() };
  }
}

function isLateNowForSchool(now: Date, lateTime: string, timezone?: string): boolean {
  const lateTimeParts = lateTime.split(":");
  const lateHour = parseInt(lateTimeParts[0] ?? "0", 10);
  const lateMinute = parseInt(lateTimeParts[1] ?? "0", 10);
  const { hour, minute } = getTimePartsInTimezone(now, timezone);
  return hour > lateHour || (hour === lateHour && minute > lateMinute);
}

function isPastTimeForSchool(now: Date, targetTime: string, timezone?: string): boolean {
  const targetTimeParts = targetTime.split(":");
  const targetHour = parseInt(targetTimeParts[0] ?? "0", 10);
  const targetMinute = parseInt(targetTimeParts[1] ?? "0", 10);
  const { hour, minute } = getTimePartsInTimezone(now, timezone);
  return hour > targetHour || (hour === targetHour && minute >= targetMinute);
}

function isLateStoredDateTimeForSchool(checkInTime: Date | string, lateTime: string): boolean {
  const normalized = formatDatabaseDateTime(checkInTime);
  if (!normalized) return false;

  const timePart = normalized.slice(11, 16);
  const [hourText = "0", minuteText = "0"] = timePart.split(":");
  const hour = parseInt(hourText, 10);
  const minute = parseInt(minuteText, 10);

  const lateTimeParts = lateTime.split(":");
  const lateHour = parseInt(lateTimeParts[0] ?? "0", 10);
  const lateMinute = parseInt(lateTimeParts[1] ?? "0", 10);

  return hour > lateHour || (hour === lateHour && minute > lateMinute);
}

async function getEffectiveLateTimeForStudent(student: { gradeLevelId?: number | null }, school: { lateTime: string }) {
  if (!student.gradeLevelId) {
    return school.lateTime;
  }

  const gradeLevel = await storage.getGradeLevel(Number(student.gradeLevelId));
  return gradeLevel?.lateTimeOverride || school.lateTime;
}

function normalizeDailyReportStatuses(records: any[]): any[] {
  return records.map((r: any) => {
    const hasCheckIn = Boolean(r?.checkInTime);
    const hasCheckOut = Boolean(r?.checkOutTime);
    const isAbsentLike = r?.status === "absent" || r?.status === "excused";
    if (hasCheckIn && !hasCheckOut && !isAbsentLike) {
      return { ...r, status: "pending_checkout" };
    }
    return r;
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionMaxAgeMs = Number(process.env.SESSION_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);
  const gateStaffSessionMaxAgeMs = 24 * 60 * 60 * 1000;
  const applySessionLifetimeByRole = (req: Request, role: string) => {
    req.session.cookie.maxAge = role === "gate_staff" ? gateStaffSessionMaxAgeMs : sessionMaxAgeMs;
  };

  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const studentPhotoDir = path.join(uploadsRoot, "students");
  const schoolLogoDir = path.join(uploadsRoot, "schools");
  fs.mkdirSync(studentPhotoDir, { recursive: true });
  fs.mkdirSync(schoolLogoDir, { recursive: true });
  app.use("/uploads", express.static(uploadsRoot));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "myo-attendance-secret-key",
      name: "myo_attendance_sid",
      proxy: true,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new MemoryStore({ checkPeriod: 86400000, ttl: sessionMaxAgeMs }),
      cookie: {
        maxAge: sessionMaxAgeMs,
        httpOnly: true,
        sameSite: "lax",
        secure: "auto",
      },
    })
  );

  await storage.seed();

  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });

      req.session.userId = user.id;

      let school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
      let selectedSchoolId = user.schoolId;

      if (user.role === "super_admin") {
        const allSchools = await storage.getSchools();
        if (allSchools.length > 0) {
          school = allSchools[0];
          selectedSchoolId = allSchools[0].id;
        }
        req.session.schoolId = selectedSchoolId;
      } else {
        req.session.schoolId = user.schoolId;
      }

      applySessionLifetimeByRole(req, user.role);

      const { password: _, ...userWithoutPw } = user;
      res.json({ ...userWithoutPw, school, selectedSchoolId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {});
    res.json({ ok: true });
  });

  app.get("/api/public/school-branding", async (req, res) => {
    try {
      const schoolParam = String(req.query.school || "").trim();
      if (!schoolParam) {
        return res.json({
          school: null,
          displayName: "MYO School Attendance",
          logoUrl: null,
        });
      }

      const normalizedSlug = slugifySchoolLabel(schoolParam);
      const school = normalizedSlug ? await storage.getSchoolByLoginSlug(normalizedSlug) : undefined;
      const brandedDisplayName = normalizedSlug
        ? `${formatSchoolLabelFromSlug(normalizedSlug)} School Attendance`
        : "MYO School Attendance";
      return res.json({
        school: school
          ? {
              id: school.id,
              name: school.name,
              loginSlug: school.loginSlug,
              logoUrl: school.logoUrl,
            }
          : null,
        displayName: brandedDisplayName,
        logoUrl: school?.logoUrl || null,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.json(null);
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.json(null);
    }

    let school = user.schoolId ? await storage.getSchool(user.schoolId) : null;
    let selectedSchoolId = user.schoolId;

    if (user.role === "super_admin") {
      selectedSchoolId = req.session.schoolId || null;
      if (selectedSchoolId) {
        school = await storage.getSchool(selectedSchoolId) || null;
      } else {
        const allSchools = await storage.getSchools();
        if (allSchools.length > 0) {
          school = allSchools[0];
          selectedSchoolId = allSchools[0].id;
          req.session.schoolId = selectedSchoolId;
        }
      }
    }

    applySessionLifetimeByRole(req, user.role);

    const { password: _, ...userWithoutPw } = user;
    res.json({ ...userWithoutPw, school, selectedSchoolId });
  });

  app.post("/api/auth/switch-school", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user || user.role !== "super_admin") {
      return res.status(403).json({ message: "Only super admin can switch schools" });
    }
    const { schoolId } = req.body;
    const school = await storage.getSchool(schoolId);
    if (!school) return res.status(404).json({ message: "School not found" });
    req.session.schoolId = schoolId;
    res.json({ ok: true, school });
  });

  // User Management
  app.get("/api/users", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "User not found" });

      let userList;
      if (user.role === "super_admin") {
        const schoolIdFilter = req.query.school_id ? Number(req.query.school_id) : null;
        if (schoolIdFilter) {
          userList = await storage.getUsersBySchool(schoolIdFilter);
        } else {
          userList = await storage.getUsers();
        }
      } else {
        if (!user.schoolId) return res.json([]);
        userList = await storage.getUsersBySchool(user.schoolId);
      }

      const teacherIds = userList.filter((u) => u.role === "teacher").map((u) => u.id);
      const teacherSectionsByUser = new Map<number, number[]>();
      await Promise.all(
        teacherIds.map(async (teacherId) => {
          teacherSectionsByUser.set(teacherId, await storage.getTeacherSectionIds(teacherId));
        }),
      );

      const sanitized = userList.map(({ password: _, ...u }) => ({
        ...u,
        teacherSectionIds: teacherSectionsByUser.get(u.id) || [],
      }));
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.session.userId!);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      const { username, password, fullName, email, role, schoolId: targetSchoolId, teacherSectionIds } = req.body;

      if (currentUser.role === "school_admin") {
        if (!["gate_staff", "teacher"].includes(role)) {
          return res.status(403).json({ message: "School admin can only create gate_staff or teacher accounts" });
        }
        if (targetSchoolId && targetSchoolId !== currentUser.schoolId) {
          return res.status(403).json({ message: "Cannot create users for another school" });
        }
      }

      const assignSchoolId = currentUser.role === "super_admin" ? targetSchoolId : currentUser.schoolId;
      if ((role === "teacher" || Array.isArray(teacherSectionIds)) && !assignSchoolId) {
        return res.status(400).json({ message: "Teacher accounts must belong to a school." });
      }

      if (role === "teacher" && Array.isArray(teacherSectionIds) && teacherSectionIds.length > 0) {
        const schoolSections = await storage.getSections(assignSchoolId);
        const validSectionIds = new Set(schoolSections.map((section: any) => section.id));
        const hasInvalid = teacherSectionIds.some((sectionId: any) => !validSectionIds.has(Number(sectionId)));
        if (hasInvalid) {
          return res.status(400).json({ message: "One or more assigned sections are invalid for the selected school." });
        }
      }

      const newUser = await storage.createUser({
        username,
        password,
        fullName,
        email: email || null,
        role,
        schoolId: assignSchoolId,
      });

      if (role === "teacher") {
        await storage.replaceTeacherSections(
          newUser.id,
          Array.isArray(teacherSectionIds) ? teacherSectionIds.map((sectionId: any) => Number(sectionId)) : [],
        );
      }

      const { password: _, ...userWithoutPw } = newUser;
      res.json({
        ...userWithoutPw,
        teacherSectionIds: role === "teacher"
          ? (Array.isArray(teacherSectionIds) ? teacherSectionIds.map((sectionId: any) => Number(sectionId)) : [])
          : [],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/users/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.session.userId!);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      const targetUser = await storage.getUserById(Number(req.params.id));
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      if (currentUser.role === "school_admin" && targetUser.schoolId !== currentUser.schoolId) {
        return res.status(403).json({ message: "Cannot edit users from another school" });
      }

      if (currentUser.role === "school_admin" && req.body.role) {
        if (!["gate_staff", "teacher"].includes(req.body.role)) {
          return res.status(403).json({ message: "School admin can only assign gate_staff or teacher roles" });
        }
      }

      const updateData: any = {};
      if (req.body.fullName) updateData.fullName = req.body.fullName;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.role) updateData.role = req.body.role;
      if (req.body.password) updateData.password = req.body.password;
      if (req.body.schoolId !== undefined && currentUser.role === "super_admin") {
        updateData.schoolId = req.body.schoolId;
      }

      const nextSchoolId =
        updateData.schoolId !== undefined
          ? updateData.schoolId
          : targetUser.schoolId;
      const nextRole = updateData.role || targetUser.role;

      if (nextRole === "teacher" && Array.isArray(req.body.teacherSectionIds) && req.body.teacherSectionIds.length > 0) {
        if (!nextSchoolId) {
          return res.status(400).json({ message: "Teacher accounts must belong to a school." });
        }
        const schoolSections = await storage.getSections(nextSchoolId);
        const validSectionIds = new Set(schoolSections.map((section: any) => section.id));
        const hasInvalid = req.body.teacherSectionIds.some((sectionId: any) => !validSectionIds.has(Number(sectionId)));
        if (hasInvalid) {
          return res.status(400).json({ message: "One or more assigned sections are invalid for this school." });
        }
      }

      const updated = await storage.updateUser(Number(req.params.id), updateData);
      if (!updated) return res.status(404).json({ message: "User not found" });

      if (nextRole === "teacher") {
        await storage.replaceTeacherSections(
          updated.id,
          Array.isArray(req.body.teacherSectionIds) ? req.body.teacherSectionIds.map((sectionId: any) => Number(sectionId)) : [],
        );
      } else {
        await storage.replaceTeacherSections(updated.id, []);
      }

      const { password: _, ...userWithoutPw } = updated;
      res.json({
        ...userWithoutPw,
        teacherSectionIds: nextRole === "teacher" ? await storage.getTeacherSectionIds(updated.id) : [],
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.session.userId!);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      const targetUser = await storage.getUserById(Number(req.params.id));
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ message: "Cannot delete your own account" });
      }

      if (currentUser.role === "school_admin") {
        if (targetUser.schoolId !== currentUser.schoolId) {
          return res.status(403).json({ message: "Cannot delete users from another school" });
        }
        if (!["gate_staff", "teacher"].includes(targetUser.role)) {
          return res.status(403).json({ message: "School admin can only delete gate_staff or teacher accounts" });
        }
      }

      await storage.deleteUser(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Dashboard
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) {
        return res.json({
          date: "",
          kpis: { checkedOut: 0, lateArrivals: 0, onCampus: 0, absent: 0, notCheckedIn: 0, total: 0 },
          recentEvents: [],
          gradeBreakdown: [],
        });
      }

      const school = await storage.getSchool(schoolId);
      const date = (req.query.date as string) || getTodayIsoInTimezone(school?.timezone);
      const kpis = await storage.getDashboardKpis(schoolId, date);
      const recentEvents = await storage.getRecentEvents(schoolId, 10);
      const gradeBreakdown = await storage.getGradeAttendanceBreakdown(schoolId, date);

      res.json({ date, kpis, recentEvents, gradeBreakdown });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/dashboard/recent-activity", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const deleted = await storage.clearRecentEvents(schoolId);
      res.json({ deleted });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/attendance-intelligence", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) {
        return res.json({
          window: { startDate: "", endDate: "" },
          summary: { totalStudents: 0, atRiskCount: 0 },
          atRiskStudents: [],
          classInsights: [],
          gradeInsights: [],
        });
      }

      const school = await storage.getSchool(schoolId);
      const date = (req.query.date as string) || getTodayIsoInTimezone(school?.timezone);
      const intelligence = await storage.getAttendanceIntelligence(schoolId, date);
      res.json(intelligence);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Today status pages
  app.get("/api/today/:status", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json({ records: [], total: 0, page: 1, pageSize: 20 });
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      if (sectionScope && sectionScope.length === 0) {
        return res.json({ records: [], total: 0, page: 1, pageSize: 20 });
      }
      const school = await storage.getSchool(schoolId);
      if (!school) return res.json({ records: [], total: 0, page: 1, pageSize: 20 });

      const { status } = req.params;
      const date = (req.query.date as string) || getTodayIsoInTimezone(school.timezone);
      const search = req.query.search as string;
      const gradeFilter = req.query.grade as string;
      const sectionFilter = req.query.section as string;
      const page = Number(req.query.page) || 1;
      const pageSize = 20;

      if (status === "not_checked_in") {
        const result = await storage.getStudentsNotCheckedIn(
          schoolId, date, search,
          gradeFilter && gradeFilter !== "all" ? Number(gradeFilter) : undefined,
          sectionFilter && sectionFilter !== "all" ? Number(sectionFilter) : undefined,
          page, pageSize,
          sectionScope,
        );
        return res.json({ records: result.records, total: result.total, page, pageSize });
      }

      let records: any[] = [];
      if (status === "pending_checkout" || status === "late") {
        // Backfill old pending records that should have been marked late.
        const pendingForDay = await storage.getAttendancesBySchoolAndDate(schoolId, date, "pending_checkout");
        const staleLateRows = pendingForDay.filter(
          (row: any) =>
            !row.isLate &&
            row.checkInTime &&
            isLateStoredDateTimeForSchool(row.checkInTime, school.lateTime),
        );
        if (staleLateRows.length > 0) {
          await Promise.all(
            staleLateRows.map((row: any) =>
              storage.updateDailyAttendance(row.id, {
                status: "late",
                isLate: true,
              }),
            ),
          );
        }
      }

      if (status === "pending_checkout") {
        const [pendingRecords, lateRecords] = await Promise.all([
          storage.getAttendancesBySchoolAndDate(schoolId, date, "pending_checkout"),
          storage.getAttendancesBySchoolAndDate(schoolId, date, "late"),
        ]);
        records = [...pendingRecords, ...lateRecords];
      } else if (status === "present") {
        records = await storage.getAttendancesBySchoolAndDate(schoolId, date, "present");
      } else if (status === "late") {
        records = (await storage.getAttendancesBySchoolAndDate(schoolId, date, ["present", "late", "pending_checkout"]))
          .filter((record: any) => Boolean(record.isLate));
      } else {
        records = await storage.getAttendancesBySchoolAndDate(schoolId, date, status as string);
      }

      records = filterRecordsToSectionScope(records, sectionScope);

      if (search) {
        const s = search.toLowerCase();
        records = records.filter(
          (r: any) =>
            r.studentName?.toLowerCase().includes(s) ||
            r.studentNo?.toLowerCase().includes(s)
        );
      }
      if (gradeFilter && gradeFilter !== "all") {
        const gradeId = Number(gradeFilter);
        records = records.filter((r: any) => Number(r.gradeLevelId) === gradeId);
      }
      if (sectionFilter && sectionFilter !== "all") {
        const sectionId = Number(sectionFilter);
        records = records.filter((r: any) => Number(r.sectionId) === sectionId);
      }

      const total = records.length;
      const paged = records
        .slice((page - 1) * pageSize, page * pageSize)
        .map((record: any) => normalizeAttendanceRecordTimes(record));

      res.json({ records: paged, total, page, pageSize });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Students
  app.get("/api/students", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      const search = req.query.search as string;
      const statusParam = req.query.status as string | undefined;
      const status = statusParam === "active" || statusParam === "inactive" || statusParam === "all"
        ? statusParam
        : "all";
      const results = filterRecordsToSectionScope(await storage.getStudents(schoolId, search, status), sectionScope);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      let gradeLevelId = req.body.gradeLevelId || null;
      const sectionId = req.body.sectionId || null;
      if (sectionId) {
        const schoolSections = await storage.getSections(schoolId);
        const selectedSection = schoolSections.find((section) => section.id === Number(sectionId));
        if (!selectedSection) {
          return res.status(400).json({ message: "Selected section does not belong to this school" });
        }
        if (gradeLevelId && Number(gradeLevelId) !== Number(selectedSection.gradeLevelId)) {
          return res.status(400).json({ message: "Selected section does not belong to the chosen grade level" });
        }
        gradeLevelId = selectedSection.gradeLevelId;
      }

      const qrToken = await ensureStudentQrTokenIsAvailable(schoolId, req.body.studentNo);
      const student = await storage.createStudent({
        ...req.body,
        schoolId,
        qrToken,
        isActive: req.body.isActive === false ? false : true,
        gradeLevelId,
        sectionId,
      });
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students/photo", requireAuth, requireRole("super_admin", "school_admin"), photoUpload.single("photo"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No image uploaded" });
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
      let ext = path.extname(file.originalname || "").toLowerCase();
      if (!allowedExt.has(ext)) {
        const mimeToExt: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/gif": ".gif",
        };
        ext = mimeToExt[file.mimetype] || ".jpg";
      }

      const fileName = `${schoolId}-${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
      const filePath = path.join(studentPhotoDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const photoUrl = `/uploads/students/${fileName}`;
      res.json({ photoUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/students/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const existingStudent = await storage.getStudent(Number(req.params.id));
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      let gradeLevelId = req.body.gradeLevelId;
      let sectionId = req.body.sectionId;
      if (sectionId === "") sectionId = null;
      if (gradeLevelId === "") gradeLevelId = null;

      if (sectionId) {
        const schoolSections = await storage.getSections(existingStudent.schoolId);
        const selectedSection = schoolSections.find((section) => section.id === Number(sectionId));
        if (!selectedSection) {
          return res.status(400).json({ message: "Selected section does not belong to this school" });
        }
        if (gradeLevelId && Number(gradeLevelId) !== Number(selectedSection.gradeLevelId)) {
          return res.status(400).json({ message: "Selected section does not belong to the chosen grade level" });
        }
        gradeLevelId = selectedSection.gradeLevelId;
      }

      const nextStudentNo =
        req.body.studentNo === undefined ? existingStudent.studentNo : String(req.body.studentNo || "").trim();
      const qrToken = await ensureStudentQrTokenIsAvailable(existingStudent.schoolId, nextStudentNo, existingStudent.id);

      const payload = {
        ...req.body,
        studentNo: nextStudentNo,
        qrToken,
        isActive: typeof req.body.isActive === "boolean" ? req.body.isActive : undefined,
        gradeLevelId,
        sectionId,
      };
      const student = await storage.updateStudent(Number(req.params.id), payload);
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students/:id/regenerate-qr-token", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const existingStudent = await storage.getStudent(Number(req.params.id));
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      const qrToken = await ensureStudentQrTokenIsAvailable(
        existingStudent.schoolId,
        existingStudent.studentNo,
        existingStudent.id,
      );

      const student = await storage.updateStudent(existingStudent.id, { qrToken });
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students/promotions/apply", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      if (items.length === 0) {
        return res.status(400).json({ message: "Select at least one student to promote." });
      }

      const normalizedItems = items.map((item: any) => ({
        studentId: Number(item.studentId),
        action: String(item.action || "").trim(),
        targetGradeLevelId:
          item.targetGradeLevelId === null || item.targetGradeLevelId === undefined || item.targetGradeLevelId === ""
            ? null
            : Number(item.targetGradeLevelId),
        targetSectionId:
          item.targetSectionId === null || item.targetSectionId === undefined || item.targetSectionId === ""
            ? null
            : Number(item.targetSectionId),
      }));

      const allowedActions = new Set(["promote", "retain", "graduate", "transfer_out"]);
      for (const item of normalizedItems) {
        if (!Number.isFinite(item.studentId) || item.studentId <= 0) {
          return res.status(400).json({ message: "Each promotion item must include a valid student." });
        }
        if (!allowedActions.has(item.action)) {
          return res.status(400).json({ message: "Invalid promotion action provided." });
        }
        if (item.targetGradeLevelId !== null && (!Number.isFinite(item.targetGradeLevelId) || item.targetGradeLevelId <= 0)) {
          return res.status(400).json({ message: "Invalid target grade level provided." });
        }
        if (item.targetSectionId !== null && (!Number.isFinite(item.targetSectionId) || item.targetSectionId <= 0)) {
          return res.status(400).json({ message: "Invalid target section provided." });
        }
      }

      const result = await storage.bulkPromoteStudents(schoolId, normalizedItems);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students/bulk-assign-section", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const studentIds: number[] = Array.isArray(req.body?.studentIds)
        ? req.body.studentIds.map((value: any) => Number(value))
        : [];
      const sectionId =
        req.body?.sectionId === null || req.body?.sectionId === undefined || req.body?.sectionId === ""
          ? null
          : Number(req.body.sectionId);

      if (studentIds.length === 0 || studentIds.some((value) => !Number.isFinite(value) || value <= 0)) {
        return res.status(400).json({ message: "Select at least one valid student." });
      }

      if (sectionId !== null && (!Number.isFinite(sectionId) || sectionId <= 0)) {
        return res.status(400).json({ message: "Select a valid section." });
      }

      const result = await storage.bulkAssignStudentsToSection(schoolId, studentIds, sectionId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/students/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const student = await storage.getStudent(Number(req.params.id));
      if (!student) return res.status(404).json({ message: "Student not found" });

      if (student.schoolId !== schoolId) {
        return res.status(403).json({ message: "Cannot delete students from another school" });
      }

      await storage.deleteStudent(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // CSV Import
  app.post("/api/students/import/preview", requireAuth, requireRole("super_admin", "school_admin"), upload.single("file"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const csvText = file.buffer.toString("utf-8");
      const lines = csvText.split(/\r?\n/).filter((l) => l.trim());

      if (lines.length < 2) return res.status(400).json({ message: "CSV must have headers and data" });

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredHeaders = ["grade level", "first name", "last name", "student id", "contact number"];
      const headerMap: Record<string, number> = {};

      for (const rh of requiredHeaders) {
        const idx = headers.indexOf(rh);
        if (idx === -1) {
          return res.status(400).json({ message: `Missing required header: ${rh}` });
        }
        headerMap[rh] = idx;
      }

      const rows: any[] = [];
      let validCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.every((p) => !p)) continue;

        const gradeLevel = parts[headerMap["grade level"]] || "";
        const firstName = parts[headerMap["first name"]] || "";
        const lastName = parts[headerMap["last name"]] || "";
        const studentId = parts[headerMap["student id"]] || "";
        const contactNumber = parts[headerMap["contact number"]] || "";

        const errors: string[] = [];
        if (!gradeLevel) errors.push("Grade Level required");
        if (!firstName) errors.push("First Name required");
        if (!lastName) errors.push("Last Name required");
        if (!studentId) errors.push("Student ID required");
        if (!contactNumber) errors.push("Contact Number required");

        const normalizedPhone = contactNumber ? normalizePhone(contactNumber) : "";
        if (contactNumber && normalizedPhone.length < 10) {
          errors.push("Invalid phone number");
        }

        const status = errors.length === 0 ? "ok" : "error";
        if (status === "ok") validCount++;
        else errorCount++;

        rows.push({
          gradeLevel,
          firstName,
          lastName,
          studentId,
          contactNumber,
          normalizedPhone,
          status,
          errors,
        });
      }

      res.json({ rows, validCount, errorCount });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students/import/confirm", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const { rows } = req.body;
      if (!Array.isArray(rows)) {
        return res.status(400).json({ message: "Invalid import payload" });
      }

      const validRows = rows.filter((row: any) => row?.status === "ok");
      if (validRows.length === 0) {
        return res.status(400).json({ message: "No valid rows to import" });
      }

      let imported = 0;
      let updated = 0;
      const importedStudentNos = new Set<string>();

      for (const row of validRows) {
        importedStudentNos.add(String(row.studentId));

        const gradeLevel = await storage.findOrCreateGradeLevel(schoolId, row.gradeLevel);

        const result = await storage.upsertStudentBySchoolAndNo(schoolId, row.studentId, {
          firstName: row.firstName,
          lastName: row.lastName,
          guardianPhone: row.normalizedPhone,
          gradeLevelId: gradeLevel.id,
          isActive: true,
        });

        if (result.wasUpdate) {
          updated++;
        } else {
          imported++;
        }
      }

      const deactivated = await storage.deactivateStudentsMissingFromRoster(
        schoolId,
        Array.from(importedStudentNos),
      );

      res.json({ imported, updated, deactivated, total: imported + updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Grade Levels
  app.get("/api/grade-levels", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      const grades = await storage.getGradeLevels(schoolId);
      if (sectionScope === null) return res.json(grades);

      const scopedSections = await storage.getSections(schoolId);
      const visibleGradeIds = new Set(
        scopedSections
          .filter((section: any) => sectionScope.includes(section.id))
          .map((section: any) => section.gradeLevelId),
      );
      res.json(grades.filter((grade) => visibleGradeIds.has(grade.id)));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/grade-levels", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });
      res.json(await storage.createGradeLevel({ ...req.body, schoolId }));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/grade-levels/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      res.json(await storage.updateGradeLevel(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/grade-levels/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      await storage.deleteGradeLevel(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Sections
  app.get("/api/sections", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      const allSections = await storage.getSections(schoolId);
      if (sectionScope === null) return res.json(allSections);
      res.json(allSections.filter((section: any) => sectionScope.includes(section.id)));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sections", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });
      res.json(await storage.createSection({ ...req.body, schoolId }));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sections/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      res.json(await storage.updateSection(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/sections/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      await storage.deleteSection(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Kiosks
  app.get("/api/kiosks", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      res.json(await storage.getKiosks(schoolId));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/kiosks", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });
      res.json(await storage.createKiosk({ ...req.body, schoolId }));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/kiosks/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      res.json(await storage.updateKiosk(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/kiosks/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      await storage.deleteKiosk(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Kiosk Scan
  app.post("/api/kiosk/scan", requireAuth, requireRole("super_admin", "school_admin", "gate_staff"), async (req, res) => {
    try {
      const { qrToken, kioskLocationId } = req.body;
      const actor = await storage.getUserById(req.session.userId!);
      if (!actor) {
        return res.status(401).json({ success: false, message: "User not found." });
      }

      const normalizedToken = String(qrToken || "").trim();
      const normalizedKioskId = Number(kioskLocationId);
      if (!normalizedToken) {
        return res.status(400).json({ success: false, message: "QR token is required." });
      }
      if (!Number.isInteger(normalizedKioskId) || normalizedKioskId <= 0) {
        return res.status(400).json({ success: false, message: "A valid kiosk location is required." });
      }

      const kiosk = await storage.getKiosk(normalizedKioskId);
      if (!kiosk) {
        return res.status(400).json({ success: false, message: "Kiosk location is invalid." });
      }

      if (actor.role !== "super_admin" && actor.schoolId !== kiosk.schoolId) {
        return res.status(403).json({ success: false, message: "You do not have access to this kiosk." });
      }

      const student = await resolveStudentFromScannedQr(kiosk.schoolId, normalizedToken);
      if (!student) {
        return res.json({ success: false, message: "Student not found. Invalid or outdated QR code." });
      }

      if (actor.role !== "super_admin" && actor.schoolId !== student.schoolId) {
        return res.status(403).json({ success: false, message: "You do not have access to scan for this school." });
      }

      if (student.schoolId !== kiosk.schoolId) {
        return res.status(400).json({ success: false, message: "QR code does not belong to this kiosk's school." });
      }

      if (!student.isActive) {
        return res.json({ success: false, message: "Student is inactive." });
      }

      const schoolId = student.schoolId;
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.json({ success: false, message: "School not found." });
      }

      const today = getTodayIsoInTimezone(school.timezone);
      const isHoliday = await storage.isHoliday(schoolId, today);
      if (isHoliday) {
        return res.json({
          success: false,
          message: "No classes today (holiday). Scans are disabled.",
          studentName: `${student.firstName} ${student.lastName}`,
          photoUrl: student.photoUrl || null,
        });
      }

      const now = new Date();
      const nowLocal = formatDateTimeInTimezone(now, school.timezone);
      const existingAttendance = await storage.getDailyAttendance(student.id, today);
      const minScanIntervalSeconds = clampNumber(school.minScanIntervalSeconds, 0, 600, 120);
      const remainingMs = getDuplicateScanRemainingMs(student.id, now.getTime(), minScanIntervalSeconds * 1000);
      if (remainingMs > 0) {
        // Ignore accidental immediate re-scans after a successful scan without
        // surfacing a failure message or creating duplicate records/SMS.
        if (existingAttendance) {
          const studentName = `${student.firstName} ${student.lastName}`;
          const isCheckedOut = Boolean(existingAttendance.checkOutTime) || existingAttendance.status === "present";
          const isLate = existingAttendance.status === "late";
          const templateType = isCheckedOut ? "check_out" : isLate ? "late" : "check_in";
          const eventTime = isCheckedOut
            ? formatDatabaseDateTime(existingAttendance.checkOutTime) ?? nowLocal
            : formatDatabaseDateTime(existingAttendance.checkInTime) ?? nowLocal;
          const templateMessage = await buildTemplateBasedKioskMessage({
            school,
            student,
            templateType,
            eventTime,
            status: existingAttendance.status,
          });
          return res.json({
            success: true,
            message: templateMessage,
            studentName,
            photoUrl: student.photoUrl || null,
            status: existingAttendance.status,
            action: isCheckedOut ? "Check-out" : isLate ? "Late Arrival" : "Check-in",
            time: formatEventTimeForTemplate(eventTime),
          });
        }

        return res.json({
          success: false,
          message: `Please wait ${Math.ceil(remainingMs / 1000)}s before scanning this student again.`,
          studentName: `${student.firstName} ${student.lastName}`,
          photoUrl: student.photoUrl || null,
        });
      }
      markStudentScanNow(student.id, now.getTime());

      if (!existingAttendance) {
        const effectiveLateTime = await getEffectiveLateTimeForStudent(student, school);
        const isLate = isLateNowForSchool(now, effectiveLateTime, school.timezone);

        const status = isLate ? "late" : "pending_checkout";

        const attendance = await storage.createDailyAttendance({
          schoolId,
          studentId: student.id,
          date: today,
          status,
          checkInTime: mysqlDateTime(nowLocal) as any,
          isLate,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: attendance.id,
          eventType: isLate ? "late_check_in" : "check_in",
          occurredAt: mysqlDateTime(nowLocal) as any,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kiosk.id,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: isLate ? "late" : "check_in",
          eventTime: now,
          status,
        });

        const studentName = `${student.firstName} ${student.lastName}`;
        const templateMessage = await buildTemplateBasedKioskMessage({
          school,
          student,
          templateType: isLate ? "late" : "check_in",
          eventTime: nowLocal,
          status,
        });
        return res.json({
          success: true,
          message: templateMessage,
          studentName,
          photoUrl: student.photoUrl || null,
          status,
          action: isLate ? "Late Arrival" : "Check-in",
          time: formatEventTimeForTemplate(nowLocal),
        });
      }

      if (existingAttendance.status === "pending_checkout" || existingAttendance.status === "late") {
        await storage.updateDailyAttendance(existingAttendance.id, {
          status: "present",
          checkOutTime: mysqlDateTime(nowLocal) as any,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existingAttendance.id,
          eventType: "out_final",
          occurredAt: mysqlDateTime(nowLocal) as any,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kiosk.id,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: "check_out",
          eventTime: now,
          status: "present",
        });

        const studentName = `${student.firstName} ${student.lastName}`;
        const templateMessage = await buildTemplateBasedKioskMessage({
          school,
          student,
          templateType: "check_out",
          eventTime: nowLocal,
          status: "present",
        });
        return res.json({
          success: true,
          message: templateMessage,
          studentName,
          photoUrl: student.photoUrl || null,
          status: "present",
          action: "Check-out",
          time: formatEventTimeForTemplate(nowLocal),
        });
      }

      await storage.createAttendanceEvent({
        schoolId,
        studentId: student.id,
        dailyAttendanceId: existingAttendance.id,
        eventType: "scan_ignored",
        occurredAt: mysqlDateTime(nowLocal) as any,
        performedByUserId: req.session.userId || null,
        kioskLocationId: kiosk.id,
        meta: null,
      });

      const studentName = `${student.firstName} ${student.lastName}`;
      const checkOutTime = formatDatabaseDateTime(existingAttendance.checkOutTime) ?? nowLocal;
      const templateMessage = await buildTemplateBasedKioskMessage({
        school,
        student,
        templateType: "check_out",
        eventTime: checkOutTime,
        status: existingAttendance.status,
      });
      return res.json({
        success: true,
        message: templateMessage,
        studentName,
        photoUrl: student.photoUrl || null,
        status: existingAttendance.status,
        action: "Check-out",
        time: formatEventTimeForTemplate(checkOutTime),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Manual Attendance
  app.post("/api/attendance/manual", requireAuth, requireRole("super_admin", "school_admin", "gate_staff"), async (req, res) => {
    try {
      const { studentId, action, timestamp } = req.body;
      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const schoolId = student.schoolId;
      const school = await storage.getSchool(schoolId);
      if (!school) return res.status(404).json({ message: "School not found" });
      const today = getTodayIsoInTimezone(school.timezone);
      const isHoliday = await storage.isHoliday(schoolId, today);
      if (isHoliday) {
        return res.status(400).json({ message: "No classes today (holiday). Manual attendance is disabled." });
      }
      const now = timestamp ? new Date(timestamp) : new Date();
      const nowLocal = formatDateTimeInTimezone(now, school.timezone);

      if (action === "check_in") {
        const existing = await storage.getDailyAttendance(student.id, today);
        if (existing) {
          return res.status(400).json({ message: "Student already has attendance for today" });
        }

        const effectiveLateTime = await getEffectiveLateTimeForStudent(student, school);
        const isLate = isLateNowForSchool(now, effectiveLateTime, school.timezone);
        const status = isLate ? "late" : "pending_checkout";

        const attendance = await storage.createDailyAttendance({
          schoolId,
          studentId: student.id,
          date: today,
          status,
          checkInTime: mysqlDateTime(nowLocal) as any,
          isLate,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: attendance.id,
          eventType: isLate ? "late_check_in" : "manual_check_in",
          occurredAt: mysqlDateTime(nowLocal) as any,
          performedByUserId: req.session.userId || null,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: isLate ? "late" : "check_in",
          eventTime: now,
          status,
        });

        return res.json({
          success: true,
          message: isLate ? "Manual check-in recorded as late" : "Manual check-in recorded",
          status,
        });
      }

      if (action === "check_out") {
        const existing = await storage.getDailyAttendance(student.id, today);
        if (!existing) {
          return res.status(400).json({ message: "No check-in found for today" });
        }

        await storage.updateDailyAttendance(existing.id, {
          status: "present",
          checkOutTime: mysqlDateTime(nowLocal) as any,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existing.id,
          eventType: "manual_check_out",
          occurredAt: mysqlDateTime(nowLocal) as any,
          performedByUserId: req.session.userId || null,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: "check_out",
          eventTime: now,
          status: "present",
        });

        return res.json({ success: true, message: "Manual check-out recorded" });
      }

      res.status(400).json({ message: "Invalid action" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Manual absent / excused
  app.post("/api/attendance/status", requireAuth, requireRole("super_admin", "school_admin", "gate_staff", "teacher"), async (req, res) => {
    try {
      const { studentId, status, date, note } = req.body;
      if (!studentId || !["absent", "excused"].includes(status)) {
        return res.status(400).json({ message: "Invalid payload" });
      }

      const currentUser = req.session.userId ? await storage.getUserById(req.session.userId) : null;
      if (!currentUser) return res.status(401).json({ message: "Unauthorized" });
      if (currentUser.role === "teacher" && status !== "absent") {
        return res.status(403).json({ message: "Teachers can only mark students absent" });
      }

      const student = await storage.getStudent(Number(studentId));
      if (!student) return res.status(404).json({ message: "Student not found" });

      if (currentUser.role === "teacher") {
        const teacherSections = await storage.getTeacherSectionIds(currentUser.id);
        if (!student.sectionId || !teacherSections.includes(student.sectionId)) {
          return res.status(403).json({ message: "You can only update students in your assigned sections" });
        }
      }

      const school = await storage.getSchool(student.schoolId);
      if (!school) return res.status(404).json({ message: "School not found" });

      const targetDate = date ? new Date(date) : new Date();
      const isoDate = formatIsoInTimezone(targetDate, school.timezone);

      const existingAttendance = await storage.getDailyAttendance(student.id, isoDate);
      if (existingAttendance && existingAttendance.status === "present") {
        return res.status(400).json({ message: "Student already marked present" });
      }

      const now = new Date();
      const nowLocal = formatDateTimeInTimezone(now, school.timezone);
      let dailyAttendanceId: number;

      if (existingAttendance) {
        await storage.updateDailyAttendance(existingAttendance.id, {
          status,
          markedAbsentAt: status === "absent" ? (mysqlDateTime(nowLocal) as any) : null,
        });
        dailyAttendanceId = existingAttendance.id;
      } else {
        const attendance = await storage.createDailyAttendance({
          schoolId: student.schoolId,
          studentId: student.id,
          date: isoDate,
          status,
          checkInTime: null,
          checkOutTime: null,
          isLate: false,
          markedAbsentAt: status === "absent" ? (mysqlDateTime(nowLocal) as any) : null,
        });
        dailyAttendanceId = attendance.id;
      }

      await storage.createAttendanceEvent({
        schoolId: student.schoolId,
        studentId: student.id,
        dailyAttendanceId,
        eventType: status === "absent" ? "manual_absent" : "manual_excused",
        occurredAt: mysqlDateTime(nowLocal) as any,
        performedByUserId: req.session.userId || null,
        kioskLocationId: null,
        meta: note ? { note } : null,
      });

      if (status === "absent") {
        await maybeSendAttendanceSms({
          school,
          student,
          templateType: "absent",
          eventTime: now,
          status,
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Settings
  app.get("/api/settings/school", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });
      const school = await storage.getSchool(schoolId);
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/settings/school/logo", requireAuth, requireRole("super_admin", "school_admin"), photoUpload.single("logo"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const file = req.file;
      if (!file) return res.status(400).json({ message: "No image uploaded" });
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
      let ext = path.extname(file.originalname || "").toLowerCase();
      if (!allowedExt.has(ext)) {
        const mimeToExt: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/gif": ".gif",
          "image/svg+xml": ".svg",
        };
        ext = mimeToExt[file.mimetype] || ".png";
      }

      const fileName = `${schoolId}-${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
      const filePath = path.join(schoolLogoDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const logoUrl = `/uploads/schools/${fileName}`;
      const school = await storage.updateSchool(schoolId, { logoUrl });
      res.json({ logoUrl, school });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/settings/school", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });
      const normalizedLoginSlug = req.body.loginSlug === undefined
        ? undefined
        : slugifySchoolLabel(String(req.body.loginSlug || ""));
      if (normalizedLoginSlug) {
        const existing = await storage.getSchoolByLoginSlug(normalizedLoginSlug);
        if (existing && existing.id !== schoolId) {
          return res.status(400).json({ message: "Login slug is already used by another school." });
        }
      }
      const payload = {
        ...req.body,
        loginSlug: normalizedLoginSlug === undefined ? req.body.loginSlug : normalizedLoginSlug || null,
        smsDailyCap: -1,
        smsSendMode: "ALL_MOVEMENTS",
        allowMultipleScans: true,
        absentSmsEnabled: Boolean(req.body.absentSmsEnabled),
        minScanIntervalSeconds: clampNumber(req.body.minScanIntervalSeconds, 0, 600, 120),
        earlyOutWindowMinutes: clampNumber(req.body.earlyOutWindowMinutes, 0, 180, 30),
      };
      const school = await storage.updateSchool(schoolId, payload);
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/settings/school/generate-student-qr-tokens", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });

      const schoolStudents = await storage.getStudents(schoolId, undefined, "all");
      for (const student of schoolStudents) {
        const qrToken = buildStudentQrToken(student.studentNo);
        const existing = await storage.getStudentByQrToken(qrToken);
        if (existing && (existing.schoolId !== schoolId || existing.id !== student.id)) {
          return res.status(400).json({
            message: `Cannot generate QR tokens because student number ${student.studentNo} is already used by another student.`,
          });
        }
      }

      const result = await storage.syncSchoolStudentQrTokensToStudentNos(schoolId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/cron/mark-absent", async (req, res) => {
    try {
      const cronSecret = String(process.env.CRON_SECRET || "").trim();
      const providedSecret = String(
        req.header("x-cron-secret")
        || req.header("authorization")?.replace(/^Bearer\s+/i, "")
        || req.query.secret
        || req.body?.secret
        || "",
      ).trim();

      if (!cronSecret) {
        return res.status(500).json({ message: "CRON_SECRET is not configured" });
      }

      if (!providedSecret || providedSecret !== cronSecret) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const dateOverride = String(req.body?.date || req.query.date || "").trim();
      if (dateOverride && !/^\d{4}-\d{2}-\d{2}$/.test(dateOverride)) {
        return res.status(400).json({ message: "Invalid date. Use YYYY-MM-DD." });
      }

      const now = new Date();
      const schools = await storage.getSchools();
      const results: Array<{
        schoolId: number;
        schoolName: string;
        date: string;
        cutoffTime: string;
        markedAbsent: number;
        skipped: boolean;
        reason?: string;
      }> = [];

      for (const school of schools) {
        const targetDate = dateOverride || getTodayIsoInTimezone(school.timezone);
        const isHoliday = await storage.isHoliday(school.id, targetDate);
        if (isHoliday) {
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            date: targetDate,
            cutoffTime: school.cutoffTime,
            markedAbsent: 0,
            skipped: true,
            reason: "holiday",
          });
          continue;
        }

        if (!dateOverride && !isPastTimeForSchool(now, school.cutoffTime, school.timezone)) {
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            date: targetDate,
            cutoffTime: school.cutoffTime,
            markedAbsent: 0,
            skipped: true,
            reason: "before_cutoff",
          });
          continue;
        }

        const unattendedStudents = await db
          .select({
            id: students.id,
            schoolId: students.schoolId,
            firstName: students.firstName,
            lastName: students.lastName,
            guardianPhone: students.guardianPhone,
          })
          .from(students)
          .where(
            and(
              eq(students.schoolId, school.id),
              eq(students.isActive, true),
              sql`${students.id} NOT IN (
                ${db
                  .select({ studentId: dailyAttendances.studentId })
                  .from(dailyAttendances)
                  .where(
                    and(
                      eq(dailyAttendances.schoolId, school.id),
                      eq(dailyAttendances.date, targetDate),
                    ),
                  )}
              )`,
            ),
          );

        let markedAbsent = 0;
        const nowLocal = formatDateTimeInTimezone(now, school.timezone);

        for (const student of unattendedStudents) {
          const attendance = await storage.createDailyAttendance({
            schoolId: school.id,
            studentId: student.id,
            date: targetDate,
            status: "absent",
            checkInTime: null,
            checkOutTime: null,
            isLate: false,
            markedAbsentAt: mysqlDateTime(nowLocal) as any,
          });

          await storage.createAttendanceEvent({
            schoolId: school.id,
            studentId: student.id,
            dailyAttendanceId: attendance.id,
            eventType: "auto_absent_cutoff",
            occurredAt: mysqlDateTime(nowLocal) as any,
            performedByUserId: null,
            kioskLocationId: null,
            meta: { source: "cron", cutoffTime: school.cutoffTime },
          });

          await maybeSendAttendanceSms({
            school,
            student,
            templateType: "absent",
            eventTime: now,
            status: "absent",
          });

          markedAbsent++;
        }

        results.push({
          schoolId: school.id,
          schoolName: school.name,
          date: targetDate,
          cutoffTime: school.cutoffTime,
          markedAbsent,
          skipped: false,
        });
      }

      res.json({
        success: true,
        processedAt: now.toISOString(),
        results,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/settings/purge-logs", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });

      const { from, to } = getDateRangeOrThrow(req.body || {});

      const deleteAttendance = req.body?.deleteAttendance !== false;
      const deleteSms = req.body?.deleteSms !== false;
      if (!deleteAttendance && !deleteSms) {
        return res.status(400).json({ message: "Nothing to purge. Select at least one log type." });
      }

      const result = await storage.purgeSchoolLogsByDateRange(schoolId, from, to, {
        deleteAttendance,
        deleteSms,
      });

      res.json({
        success: true,
        schoolId,
        from,
        to,
        ...result,
      });
    } catch (err: any) {
      const message = err?.message || "Failed to purge logs";
      if (message.startsWith("Invalid date range")) {
        return res.status(400).json({ message });
      }
      res.status(500).json({ message });
    }
  });

  // Holidays
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      res.json(await storage.getHolidays(schoolId));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/holidays", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });
      const payload = {
        schoolId,
        date: req.body.date,
        name: req.body.name,
        type: req.body.type || "holiday",
        isRecurring: Boolean(req.body.isRecurring),
      };
      res.json(await storage.createHoliday(payload));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/holidays/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      res.json(await storage.updateHoliday(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/holidays/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      await storage.deleteHoliday(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SMS Templates
  app.get("/api/sms-templates", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      res.json(await storage.getSmsTemplates(schoolId));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sms-templates/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      res.json(await storage.updateSmsTemplate(Number(req.params.id), req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // SMS Logs
  app.get("/api/sms-logs", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);

      const from = String(req.query.from || "").trim();
      const to = String(req.query.to || "").trim();
      if ((from && !isIsoDateString(from)) || (to && !isIsoDateString(to))) {
        return res.status(400).json({ message: "Invalid date range. Use YYYY-MM-DD." });
      }
      if (from && to && from > to) {
        return res.status(400).json({ message: "Invalid date range. 'From' must be on or before 'To'." });
      }

      res.json(await storage.getSmsLogs(schoolId, {
        from: from || undefined,
        to: to || undefined,
        limit: 100,
      }));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sms-logs/export", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });

      const { from, to } = getDateRangeOrThrow({
        from: req.query.from,
        to: req.query.to,
      });

      const logs = await storage.getSmsLogs(schoolId, { from, to });
      const headers = [
        "studentName",
        "templateType",
        "toPhone",
        "message",
        "status",
        "providerMessageId",
        "errorMessage",
        "sentAt",
        "createdAt",
      ];

      const csvRows = [headers.join(",")];
      for (const log of logs) {
        csvRows.push(headers.map((header) => csvCell(log[header as keyof typeof log])).join(","));
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=sms-logs-${from}-to-${to}.csv`);
      res.send(csvRows.join("\n"));
    } catch (err: any) {
      const message = err?.message || "Failed to export SMS logs";
      if (message.startsWith("Invalid date range")) {
        return res.status(400).json({ message });
      }
      res.status(500).json({ message });
    }
  });

  app.post("/api/sms/test", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const school = await storage.getSchool(schoolId);
      if (!school) return res.status(404).json({ message: "School not found" });
      if (!school.smsEnabled) return res.status(400).json({ message: "SMS is disabled for this school" });
      if (school.smsProvider !== "semaphore") return res.status(400).json({ message: "Only semaphore provider is supported" });
      if (!hasNonEmptyString(school.semaphoreApiKey)) return res.status(400).json({ message: "Missing Semaphore API key" });

      const rawPhone = hasNonEmptyString(req.body?.phone) ? req.body.phone : "";
      if (!rawPhone) return res.status(400).json({ message: "Phone is required" });
      const toPhone = normalizePhone(rawPhone);
      const testMessage =
        hasNonEmptyString(req.body?.message)
          ? req.body.message
          : `[${school.name}] Test SMS from MYO Attendance sent at ${new Date().toISOString()}`;

      const providerResponse = await sendSemaphoreMessage(
        school.semaphoreApiKey,
        school.semaphoreSenderName || null,
        toPhone,
        testMessage,
      );
      const providerMessageId = getSemaphoreMessageId(providerResponse);

      await storage.createSmsLog({
        schoolId: school.id,
        studentId: null,
        templateType: null,
        toPhone,
        message: testMessage,
        status: "sent",
        providerMessageId,
        providerResponse,
        sentAt: new Date(),
        errorMessage: null,
      });

      return res.json({ ok: true, providerResponse });
    } catch (err: any) {
      return res.status(500).json({
        message: err?.message || "Failed to send test SMS",
        providerResponse: err?.providerResponse ?? null,
      });
    }
  });

  // Schools (super_admin)
  app.get("/api/schools", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      res.json(await storage.getSchools());
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/schools", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { adminUsername, adminPassword, adminFullName, adminEmail, ...schoolData } = req.body;
      const school = await storage.createSchool({
        ...schoolData,
        smsSendMode: "ALL_MOVEMENTS",
        allowMultipleScans: true,
        monthlySmsCredits: clampNumber(schoolData.monthlySmsCredits, 0, 1000000, 0),
        smsOverageRateCents: clampNumber(schoolData.smsOverageRateCents, 0, 100000, 150),
      });

      if (adminUsername && adminPassword) {
        await storage.createUser({
          username: adminUsername,
          password: adminPassword,
          fullName: adminFullName || `${school.name} Admin`,
          email: adminEmail || null,
          role: "school_admin",
          schoolId: school.id,
        });
      }

      res.json(school);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/schools/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const payload = {
        ...req.body,
        smsSendMode: "ALL_MOVEMENTS",
        allowMultipleScans: true,
        monthlySmsCredits: clampNumber(req.body.monthlySmsCredits, 0, 1000000, 0),
        smsOverageRateCents: clampNumber(req.body.smsOverageRateCents, 0, 100000, 150),
      };
      res.json(await storage.updateSchool(Number(req.params.id), payload));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/schools/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      await storage.deleteSchool(Number(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Reports
  app.get("/api/reports/daily", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      if (sectionScope && sectionScope.length === 0) return res.json([]);
      const { startDate, endDate, grade, section, studentName, studentNo } = req.query;
      const records = filterRecordsToSectionScope(await storage.getAttendanceReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
        grade && grade !== "all" ? Number(grade) : undefined,
        section && section !== "all" ? Number(section) : undefined,
      ), sectionScope);
      const normalized = normalizeDailyReportStatuses(records);
      const nameFilter = String(studentName || "").trim().toLowerCase();
      const studentNoFilter = String(studentNo || "").trim().toLowerCase();
      const filtered = normalized.filter((r: any) => {
        if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
        if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
        return true;
      });
      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/absentees", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      if (sectionScope && sectionScope.length === 0) return res.json([]);
      const { startDate, endDate, grade, section, studentName, studentNo } = req.query;

      const allRecords = filterRecordsToSectionScope(await storage.getAttendanceReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
        grade && grade !== "all" ? Number(grade) : undefined,
        section && section !== "all" ? Number(section) : undefined,
      ), sectionScope);

      const nameFilter = String(studentName || "").trim().toLowerCase();
      const studentNoFilter = String(studentNo || "").trim().toLowerCase();
      const filtered = allRecords.filter((r: any) => {
        if (r.status !== "absent") return false;
        if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
        if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
        return true;
      });

      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/late-history", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      if (sectionScope && sectionScope.length === 0) return res.json([]);
      const { startDate, endDate, grade, section, studentName, studentNo } = req.query;

      const allRecords = filterRecordsToSectionScope(await storage.getAttendanceReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
        grade && grade !== "all" ? Number(grade) : undefined,
        section && section !== "all" ? Number(section) : undefined,
      ), sectionScope);

      const nameFilter = String(studentName || "").trim().toLowerCase();
      const studentNoFilter = String(studentNo || "").trim().toLowerCase();

      const filtered = allRecords.filter((r: any) => {
        if (!r?.isLate) return false;
        if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
        if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
        return true;
      });

      res.json(filtered);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/reports/attendance/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });

      const attendanceId = Number(req.params.id);
      if (!Number.isInteger(attendanceId) || attendanceId <= 0) {
        return res.status(400).json({ message: "Invalid attendance id" });
      }

      const deleted = await storage.deleteAttendanceById(schoolId, attendanceId);
      if (!deleted) return res.status(404).json({ message: "Attendance record not found" });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/reports/attendance/bulk-delete", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });

      const startDate = String(req.body?.startDate || "").trim();
      const endDate = String(req.body?.endDate || "").trim();
      if (!isIsoDateString(startDate) || !isIsoDateString(endDate)) {
        return res.status(400).json({ message: "Invalid date range. Use YYYY-MM-DD." });
      }
      if (startDate > endDate) {
        return res.status(400).json({ message: "Invalid date range. 'From' must be on or before 'To'." });
      }

      const gradeId = req.body?.grade && req.body.grade !== "all" ? Number(req.body.grade) : undefined;
      const sectionId = req.body?.section && req.body.section !== "all" ? Number(req.body.section) : undefined;
      const studentName = String(req.body?.studentName || "").trim() || undefined;
      const studentNo = String(req.body?.studentNo || "").trim() || undefined;

      const result = await storage.deleteAttendanceReportRecords(schoolId, {
        startDate,
        endDate,
        gradeId,
        sectionId,
        studentName,
        studentNo,
      });

      return res.json({
        ok: true,
        startDate,
        endDate,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/sms-usage", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role === "teacher") return res.status(403).json({ message: "Forbidden" });
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const { startDate, endDate } = req.query;
      res.json(await storage.getSmsUsageReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
      ));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/sms-billing", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const monthParam = String(req.query.month || "").trim();
      const now = new Date();
      const monthMatch = /^(\d{4})-(\d{2})$/.exec(monthParam);
      const year = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
      const monthIndex = monthMatch ? Number(monthMatch[2]) - 1 : now.getMonth();

      const start = new Date(Date.UTC(year, monthIndex, 1));
      const end = new Date(Date.UTC(year, monthIndex + 1, 0));
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const rows = await db
        .select({
          schoolId: schools.id,
          schoolName: schools.name,
          monthlySmsCredits: schools.monthlySmsCredits,
          smsOverageRateCents: schools.smsOverageRateCents,
          sentCount: sql<number>`sum(case when ${smsLogs.status} = 'sent' and DATE(${smsLogs.createdAt}) between ${startDate} and ${endDate} then 1 else 0 end)`,
        })
        .from(schools)
        .leftJoin(smsLogs, eq(smsLogs.schoolId, schools.id))
        .groupBy(schools.id, schools.name, schools.monthlySmsCredits, schools.smsOverageRateCents)
        .orderBy(schools.name);

      const data = rows.map((r) => {
        const sent = Number(r.sentCount || 0);
        const credits = Number(r.monthlySmsCredits || 0);
        const excess = Math.max(sent - credits, 0);
        const rateCents = Number(r.smsOverageRateCents || 0);
        const overageAmountCents = excess * rateCents;
        return {
          schoolId: r.schoolId,
          schoolName: r.schoolName,
          month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
          sentCount: sent,
          monthlySmsCredits: credits,
          excessCount: excess,
          smsOverageRateCents: rateCents,
          overageAmountCents,
        };
      });

      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/:type/export", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });
      const user = await storage.getUserById(req.session.userId!);
      const sectionScope = await getSectionScopeForUser(req, schoolId);
      const { startDate, endDate, grade, section } = req.query;
      const { type } = req.params;

      let data: any[];
      if (type === "sms-usage") {
        if (user?.role === "teacher") {
          return res.status(403).json({ message: "Forbidden" });
        }
        data = await storage.getSmsUsageReport(
          schoolId,
          startDate as string || new Date().toISOString().split("T")[0],
          endDate as string || new Date().toISOString().split("T")[0],
        );
      } else if (type === "sms-billing") {
        const user = await storage.getUserById(req.session.userId!);
        if (!user || user.role !== "super_admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
        const monthParam = String(req.query.month || "").trim();
        const now = new Date();
        const monthMatch = /^(\d{4})-(\d{2})$/.exec(monthParam);
        const year = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
        const monthIndex = monthMatch ? Number(monthMatch[2]) - 1 : now.getMonth();
        const start = new Date(Date.UTC(year, monthIndex, 1));
        const end = new Date(Date.UTC(year, monthIndex + 1, 0));
        const startIso = start.toISOString().slice(0, 10);
        const endIso = end.toISOString().slice(0, 10);

        const rows = await db
          .select({
            schoolName: schools.name,
            sentCount: sql<number>`sum(case when ${smsLogs.status} = 'sent' and DATE(${smsLogs.createdAt}) between ${startIso} and ${endIso} then 1 else 0 end)`,
            monthlySmsCredits: schools.monthlySmsCredits,
            smsOverageRateCents: schools.smsOverageRateCents,
          })
          .from(schools)
          .leftJoin(smsLogs, eq(smsLogs.schoolId, schools.id))
          .groupBy(schools.id, schools.name, schools.monthlySmsCredits, schools.smsOverageRateCents)
          .orderBy(schools.name);

        data = rows.map((r) => {
          const sent = Number(r.sentCount || 0);
          const credits = Number(r.monthlySmsCredits || 0);
          const excess = Math.max(sent - credits, 0);
          const rateCents = Number(r.smsOverageRateCents || 0);
          return {
            month: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
            schoolName: r.schoolName,
            sentCount: sent,
            monthlySmsCredits: credits,
            excessCount: excess,
            smsOverageRatePhp: (rateCents / 100).toFixed(2),
            amountDuePhp: (excess * rateCents / 100).toFixed(2),
          };
        });
      } else {
        data = filterRecordsToSectionScope(await storage.getAttendanceReport(
          schoolId,
          startDate as string || new Date().toISOString().split("T")[0],
          endDate as string || new Date().toISOString().split("T")[0],
          grade && grade !== "all" ? Number(grade) : undefined,
          section && section !== "all" ? Number(section) : undefined,
        ), sectionScope);
        if (type === "daily") {
          data = normalizeDailyReportStatuses(data);
          const nameFilter = String(req.query.studentName || "").trim().toLowerCase();
          const studentNoFilter = String(req.query.studentNo || "").trim().toLowerCase();
          data = data.filter((r: any) => {
            if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
            if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
            return true;
          });
        } else if (type === "absentees") {
          const nameFilter = String(req.query.studentName || "").trim().toLowerCase();
          const studentNoFilter = String(req.query.studentNo || "").trim().toLowerCase();
          data = data.filter((r: any) => {
            if (r.status !== "absent") return false;
            if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
            if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
            return true;
          });
        } else if (type === "late-history") {
          const nameFilter = String(req.query.studentName || "").trim().toLowerCase();
          const studentNoFilter = String(req.query.studentNo || "").trim().toLowerCase();
          data = data.filter((r: any) => {
            if (!r?.isLate) return false;
            if (nameFilter && !String(r.studentName || "").toLowerCase().includes(nameFilter)) return false;
            if (studentNoFilter && !String(r.studentNo || "").toLowerCase().includes(studentNoFilter)) return false;
            return true;
          });
        }
      }

      if (data.length === 0) {
        return res.status(200).send("No data");
      }

      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(",")];
      for (const row of data) {
        csvRows.push(headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(","));
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${type}-report.csv`);
      res.send(csvRows.join("\n"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
