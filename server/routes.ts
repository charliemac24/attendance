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
import { attendanceEvents, gradeLevels, gradeSmsPolicies, schools, sectionSmsPolicies, sections, smsLogs } from "@shared/schema";

const MemoryStore = createMemoryStore(session);
const upload = multer({ storage: multer.memoryStorage() });
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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

function renderSmsTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/gi, (_m, token) => {
    const key = String(token).toLowerCase();
    return variables[key] ?? "";
  });
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

// SMS cap supports -1 to mean unlimited.
function normalizeSmsDailyCap(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const normalized = Math.trunc(n);
  if (normalized === -1) return -1;
  return Math.min(1000, Math.max(1, normalized));
}

function isAfterDismissalWindow(now: Date, dismissalTime: string, earlyOutWindowMinutes: number): boolean {
  const [hourStr, minuteStr] = dismissalTime.split(":");
  const dismissalMinutes = (Number(hourStr) * 60) + Number(minuteStr);
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  return nowMinutes >= dismissalMinutes - earlyOutWindowMinutes;
}

async function getEffectiveSmsDailyCap(params: {
  schoolId: number;
  gradeLevelId: number | null;
  sectionId: number | null;
  schoolCap: number;
}): Promise<number> {
  const baseCap = normalizeSmsDailyCap(params.schoolCap, 2);

  if (params.sectionId) {
    const [sectionPolicy] = await db
      .select()
      .from(sectionSmsPolicies)
      .where(
        and(
          eq(sectionSmsPolicies.schoolId, params.schoolId),
          eq(sectionSmsPolicies.sectionId, params.sectionId),
          eq(sectionSmsPolicies.enabled, true),
        ),
      )
      .limit(1);
    if (sectionPolicy) return normalizeSmsDailyCap(sectionPolicy.dailyCap, baseCap);
  }

  if (params.gradeLevelId) {
    const [gradePolicy] = await db
      .select()
      .from(gradeSmsPolicies)
      .where(
        and(
          eq(gradeSmsPolicies.schoolId, params.schoolId),
          eq(gradeSmsPolicies.gradeLevelId, params.gradeLevelId),
          eq(gradeSmsPolicies.enabled, true),
        ),
      )
      .limit(1);
    if (gradePolicy) return normalizeSmsDailyCap(gradePolicy.dailyCap, baseCap);
  }

  return baseCap;
}

async function getStudentSmsSentCountForDate(schoolId: number, studentId: number, dateIso: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(smsLogs)
    .where(
      and(
        eq(smsLogs.schoolId, schoolId),
        eq(smsLogs.studentId, studentId),
        sql`DATE(${smsLogs.createdAt}) = ${dateIso}`,
        sql`${smsLogs.status} IN ('sent', 'queued')`,
      ),
    );

  return Number(row?.count || 0);
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
  eventTime: Date;
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

  const today = eventTime.toISOString().slice(0, 10);
  const effectiveCap = await getEffectiveSmsDailyCap({
    schoolId: school.id,
    gradeLevelId: student.gradeLevelId ?? null,
    sectionId: student.sectionId ?? null,
    schoolCap: school.smsDailyCap,
  });
  const usedCount = await getStudentSmsSentCountForDate(school.id, student.id, today);
  if (effectiveCap !== -1 && usedCount >= effectiveCap) {
    await createSkippedSmsLog({
      schoolId: school.id,
      studentId: student.id,
      templateType,
      toPhone: student.guardianPhone,
      reason: `Daily SMS cap reached (${usedCount}/${effectiveCap})`,
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
    date: eventTime.toISOString().slice(0, 10),
    time: eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionMaxAgeMs = Number(process.env.SESSION_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);

  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  const studentPhotoDir = path.join(uploadsRoot, "students");
  fs.mkdirSync(studentPhotoDir, { recursive: true });
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

      const sanitized = userList.map(({ password: _, ...u }) => u);
      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.session.userId!);
      if (!currentUser) return res.status(401).json({ message: "User not found" });

      const { username, password, fullName, email, role, schoolId: targetSchoolId } = req.body;

      if (currentUser.role === "school_admin") {
        if (!["gate_staff", "teacher"].includes(role)) {
          return res.status(403).json({ message: "School admin can only create gate_staff or teacher accounts" });
        }
        if (targetSchoolId && targetSchoolId !== currentUser.schoolId) {
          return res.status(403).json({ message: "Cannot create users for another school" });
        }
      }

      const assignSchoolId = currentUser.role === "super_admin" ? targetSchoolId : currentUser.schoolId;
      const newUser = await storage.createUser({
        username,
        password,
        fullName,
        email: email || null,
        role,
        schoolId: assignSchoolId,
      });

      const { password: _, ...userWithoutPw } = newUser;
      res.json(userWithoutPw);
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

      const updated = await storage.updateUser(Number(req.params.id), updateData);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userWithoutPw } = updated;
      res.json(userWithoutPw);
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
      if (!schoolId) return res.json({ date: "", kpis: { present: 0, late: 0, pendingCheckout: 0, absent: 0, notCheckedIn: 0, total: 0 }, recentEvents: [], sectionBreakdown: [] });

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const kpis = await storage.getDashboardKpis(schoolId, date);
      const recentEvents = await storage.getRecentEvents(schoolId, 10);
      const sectionBreakdown = await storage.getSectionBreakdown(schoolId, date);

      res.json({ date, kpis, recentEvents, sectionBreakdown });
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

      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
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

      const { status } = req.params;
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
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
          page, pageSize
        );
        return res.json({ ...result, page, pageSize });
      }

      const dbStatus = status === "pending_checkout" ? "pending_checkout" : (status as string);
      let records = await storage.getAttendancesBySchoolAndDate(schoolId, date, dbStatus);

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
      const paged = records.slice((page - 1) * pageSize, page * pageSize);

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
      const search = req.query.search as string;
      const results = await storage.getStudents(schoolId, search);
      res.json(results);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/students", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(400).json({ message: "No school context" });

      const qrToken = randomBytes(16).toString("hex");
      const student = await storage.createStudent({
        ...req.body,
        schoolId,
        qrToken,
        isActive: req.body.isActive === false ? false : true,
        gradeLevelId: req.body.gradeLevelId || null,
        sectionId: req.body.sectionId || null,
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
      const payload = {
        ...req.body,
        isActive: typeof req.body.isActive === "boolean" ? req.body.isActive : undefined,
      };
      const student = await storage.updateStudent(Number(req.params.id), payload);
      res.json(student);
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
      let imported = 0;
      let updated = 0;

      for (const row of rows) {
        if (row.status !== "ok") continue;

        const gradeLevel = await storage.findOrCreateGradeLevel(schoolId, row.gradeLevel);

        const result = await storage.upsertStudentBySchoolAndNo(schoolId, row.studentId, {
          firstName: row.firstName,
          lastName: row.lastName,
          guardianPhone: row.normalizedPhone,
          gradeLevelId: gradeLevel.id,
        });

        if (result.wasUpdate) {
          updated++;
        } else {
          imported++;
        }
      }

      res.json({ imported, updated, total: imported + updated });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Grade Levels
  app.get("/api/grade-levels", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      res.json(await storage.getGradeLevels(schoolId));
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
      res.json(await storage.getSections(schoolId));
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
  app.post("/api/kiosk/scan", requireAuth, async (req, res) => {
    try {
      const { qrToken, kioskLocationId } = req.body;
      const student = await storage.getStudentByQrToken(qrToken);
      if (!student) {
        return res.json({ success: false, message: "Student not found. Invalid QR code." });
      }

      if (!student.isActive) {
        return res.json({ success: false, message: "Student is inactive." });
      }

      const schoolId = student.schoolId;
      const school = await storage.getSchool(schoolId);
      if (!school) {
        return res.json({ success: false, message: "School not found." });
      }

      const today = new Date().toISOString().split("T")[0];
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
      const existingAttendance = await storage.getDailyAttendance(student.id, today);

      if (!existingAttendance) {
        const lateTimeParts = school.lateTime.split(":");
        const lateHour = parseInt(lateTimeParts[0]);
        const lateMinute = parseInt(lateTimeParts[1]);
        const isLate = now.getHours() > lateHour || (now.getHours() === lateHour && now.getMinutes() > lateMinute);

        const status = isLate ? "late" : "pending_checkout";

        const attendance = await storage.createDailyAttendance({
          schoolId,
          studentId: student.id,
          date: today,
          status,
          checkInTime: now,
          isLate,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: attendance.id,
          eventType: isLate ? "late_check_in" : "check_in",
          occurredAt: now,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kioskLocationId || null,
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
        return res.json({
          success: true,
          message: isLate ? `${studentName} checked in (Late)` : `${studentName} checked in`,
          studentName,
          photoUrl: student.photoUrl || null,
          status,
          action: isLate ? "Late Check-in" : "Check-in",
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      if (existingAttendance.status === "pending_checkout" || existingAttendance.status === "late") {
        const minScanIntervalSeconds = clampNumber(school.minScanIntervalSeconds, 0, 600, 120);
        const earlyOutWindowMinutes = clampNumber(school.earlyOutWindowMinutes, 0, 180, 30);
        const dismissalTime = school.dismissalTime || "15:00:00";
        const lastEvent = await getLastEventForAttendance(existingAttendance.id);

        if (lastEvent?.occurredAt && minScanIntervalSeconds > 0) {
          const diffSeconds = Math.floor((now.getTime() - new Date(lastEvent.occurredAt).getTime()) / 1000);
          if (diffSeconds >= 0 && diffSeconds < minScanIntervalSeconds) {
            return res.json({
              success: false,
              message: `Please wait ${minScanIntervalSeconds - diffSeconds}s before scanning again.`,
              studentName: `${student.firstName} ${student.lastName}`,
              photoUrl: student.photoUrl || null,
            });
          }
        }

        const studentName = `${student.firstName} ${student.lastName}`;
        const canFinalizeCheckout = isAfterDismissalWindow(now, dismissalTime, earlyOutWindowMinutes);
        const isReturningFromBreak = lastEvent?.eventType === "break_out" || lastEvent?.eventType === "early_out";

        if (isReturningFromBreak) {
          await storage.createAttendanceEvent({
            schoolId,
            studentId: student.id,
            dailyAttendanceId: existingAttendance.id,
            eventType: "break_in",
            occurredAt: now,
            performedByUserId: req.session.userId || null,
            kioskLocationId: kioskLocationId || null,
            meta: null,
          });

          await maybeSendAttendanceSms({
            school,
            student,
            templateType: "break_in",
            eventTime: now,
            status: existingAttendance.status,
          });

          return res.json({
            success: true,
            message: `${studentName} returned from break`,
            studentName,
            photoUrl: student.photoUrl || null,
            status: existingAttendance.status,
            action: "Break In",
            time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }

        if (canFinalizeCheckout) {
          await storage.updateDailyAttendance(existingAttendance.id, {
            status: "present",
            checkOutTime: now,
          });

          await storage.createAttendanceEvent({
            schoolId,
            studentId: student.id,
            dailyAttendanceId: existingAttendance.id,
            eventType: "out_final",
            occurredAt: now,
            performedByUserId: req.session.userId || null,
            kioskLocationId: kioskLocationId || null,
            meta: null,
          });

          await maybeSendAttendanceSms({
            school,
            student,
            // Use the standard check-out template for end-of-day dismissal
            templateType: "check_out",
            eventTime: now,
            status: "present",
          });

          return res.json({
            success: true,
            message: `${studentName} checked out`,
            studentName,
            photoUrl: student.photoUrl || null,
            status: "present",
            action: "Final Out",
            time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existingAttendance.id,
          eventType: "early_out",
          occurredAt: now,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kioskLocationId || null,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: "early_out",
          eventTime: now,
          status: existingAttendance.status,
        });

        return res.json({
          success: true,
          message: `${studentName} left early`,
          studentName,
          photoUrl: student.photoUrl || null,
          status: existingAttendance.status,
          action: "Early Out",
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      await storage.createAttendanceEvent({
        schoolId,
        studentId: student.id,
        dailyAttendanceId: existingAttendance.id,
        eventType: "scan_ignored",
        occurredAt: now,
        performedByUserId: req.session.userId || null,
        kioskLocationId: kioskLocationId || null,
        meta: null,
      });

      const studentName = `${student.firstName} ${student.lastName}`;
      return res.json({
        success: true,
        message: `${studentName} - scan recorded after final out`,
        studentName,
        photoUrl: student.photoUrl || null,
        status: existingAttendance.status,
        action: "Scan Ignored",
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
      const today = new Date().toISOString().split("T")[0];
      const isHoliday = await storage.isHoliday(schoolId, today);
      if (isHoliday) {
        return res.status(400).json({ message: "No classes today (holiday). Manual attendance is disabled." });
      }
      const now = timestamp ? new Date(timestamp) : new Date();

      if (action === "check_in") {
        const existing = await storage.getDailyAttendance(student.id, today);
        if (existing) {
          return res.status(400).json({ message: "Student already has attendance for today" });
        }

        const attendance = await storage.createDailyAttendance({
          schoolId,
          studentId: student.id,
          date: today,
          status: "pending_checkout",
          checkInTime: now,
          isLate: false,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: attendance.id,
          eventType: "manual_check_in",
          occurredAt: now,
          performedByUserId: req.session.userId || null,
          meta: null,
        });

        await maybeSendAttendanceSms({
          school,
          student,
          templateType: "check_in",
          eventTime: now,
          status: "pending_checkout",
        });

        return res.json({ success: true, message: "Manual check-in recorded" });
      }

      if (action === "check_out") {
        const existing = await storage.getDailyAttendance(student.id, today);
        if (!existing) {
          return res.status(400).json({ message: "No check-in found for today" });
        }

        await storage.updateDailyAttendance(existing.id, {
          status: "present",
          checkOutTime: now,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existing.id,
          eventType: "manual_check_out",
          occurredAt: now,
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

  app.patch("/api/settings/school", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school" });
      const payload = {
        ...req.body,
        smsDailyCap: -1,
        smsSendMode: "ALL_MOVEMENTS",
        allowMultipleScans: true,
        minScanIntervalSeconds: clampNumber(req.body.minScanIntervalSeconds, 0, 600, 120),
        earlyOutWindowMinutes: clampNumber(req.body.earlyOutWindowMinutes, 0, 180, 30),
      };
      const school = await storage.updateSchool(schoolId, payload);
      res.json(school);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/settings/sms-policies", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school context" });

      const school = await storage.getSchool(schoolId);
      if (!school) return res.status(404).json({ message: "School not found" });

      const gradeRows = await db
        .select({
          gradeLevelId: gradeLevels.id,
          gradeLevelName: gradeLevels.name,
          enabled: sql<boolean>`coalesce(${gradeSmsPolicies.enabled}, false)`,
          dailyCap: sql<number>`coalesce(${gradeSmsPolicies.dailyCap}, 2)`,
        })
        .from(gradeLevels)
        .leftJoin(
          gradeSmsPolicies,
          and(
            eq(gradeSmsPolicies.schoolId, schoolId),
            eq(gradeSmsPolicies.gradeLevelId, gradeLevels.id),
          ),
        )
        .where(eq(gradeLevels.schoolId, schoolId))
        .orderBy(gradeLevels.name);

      const sectionRows = await db
        .select({
          sectionId: sections.id,
          sectionName: sections.name,
          gradeLevelName: gradeLevels.name,
          enabled: sql<boolean>`coalesce(${sectionSmsPolicies.enabled}, false)`,
          dailyCap: sql<number>`coalesce(${sectionSmsPolicies.dailyCap}, 2)`,
        })
        .from(sections)
        .leftJoin(gradeLevels, eq(sections.gradeLevelId, gradeLevels.id))
        .leftJoin(
          sectionSmsPolicies,
          and(
            eq(sectionSmsPolicies.schoolId, schoolId),
            eq(sectionSmsPolicies.sectionId, sections.id),
          ),
        )
        .where(eq(sections.schoolId, schoolId))
        .orderBy(gradeLevels.name, sections.name);

      res.json({
        schoolPolicy: {
          smsDailyCap: school.smsDailyCap,
          smsSendMode: school.smsSendMode,
          allowMultipleScans: school.allowMultipleScans,
          maxBreakCyclesPerDay: school.maxBreakCyclesPerDay,
          minScanIntervalSeconds: school.minScanIntervalSeconds,
          dismissalTime: school.dismissalTime,
          earlyOutWindowMinutes: school.earlyOutWindowMinutes,
        },
        gradePolicies: gradeRows.map((row) => ({
          ...row,
          dailyCap: normalizeSmsDailyCap(row.dailyCap, school.smsDailyCap),
        })),
        sectionPolicies: sectionRows.map((row) => ({
          ...row,
          dailyCap: normalizeSmsDailyCap(row.dailyCap, school.smsDailyCap),
        })),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/settings/sms-policies/grade/:gradeLevelId", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school context" });
      const gradeLevelId = Number(req.params.gradeLevelId);
      if (!Number.isFinite(gradeLevelId)) return res.status(400).json({ message: "Invalid grade level" });

      const [grade] = await db
        .select({ id: gradeLevels.id })
        .from(gradeLevels)
        .where(and(eq(gradeLevels.id, gradeLevelId), eq(gradeLevels.schoolId, schoolId)))
        .limit(1);
      if (!grade) return res.status(404).json({ message: "Grade level not found" });

      const enabled = Boolean(req.body.enabled);
      const dailyCap = normalizeSmsDailyCap(req.body.dailyCap, 2);

      await db
        .insert(gradeSmsPolicies)
        .values({
          schoolId,
          gradeLevelId,
          enabled,
          dailyCap,
          updatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            enabled,
            dailyCap,
            updatedAt: new Date(),
          },
        });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/settings/sms-policies/section/:sectionId", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.status(404).json({ message: "No school context" });
      const sectionId = Number(req.params.sectionId);
      if (!Number.isFinite(sectionId)) return res.status(400).json({ message: "Invalid section" });

      const [section] = await db
        .select({ id: sections.id })
        .from(sections)
        .where(and(eq(sections.id, sectionId), eq(sections.schoolId, schoolId)))
        .limit(1);
      if (!section) return res.status(404).json({ message: "Section not found" });

      const enabled = Boolean(req.body.enabled);
      const dailyCap = normalizeSmsDailyCap(req.body.dailyCap, 2);

      await db
        .insert(sectionSmsPolicies)
        .values({
          schoolId,
          sectionId,
          enabled,
          dailyCap,
          updatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            enabled,
            dailyCap,
            updatedAt: new Date(),
          },
        });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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
      res.json(await storage.getSmsLogs(schoolId));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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
      const { startDate, endDate, grade, section } = req.query;
      res.json(await storage.getAttendanceReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
        grade && grade !== "all" ? Number(grade) : undefined,
        section && section !== "all" ? Number(section) : undefined,
      ));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/absentees", requireAuth, async (req, res) => {
    try {
      const schoolId = await getSchoolId(req);
      if (!schoolId) return res.json([]);
      const { startDate, endDate, grade, section } = req.query;

      const allRecords = await storage.getAttendanceReport(
        schoolId,
        startDate as string || new Date().toISOString().split("T")[0],
        endDate as string || new Date().toISOString().split("T")[0],
        grade && grade !== "all" ? Number(grade) : undefined,
        section && section !== "all" ? Number(section) : undefined,
      );

      res.json(allRecords.filter((r: any) => r.status === "absent"));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/reports/sms-usage", requireAuth, async (req, res) => {
    try {
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
      const { startDate, endDate, grade, section } = req.query;
      const { type } = req.params;

      let data: any[];
      if (type === "sms-usage") {
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
        data = await storage.getAttendanceReport(
          schoolId,
          startDate as string || new Date().toISOString().split("T")[0],
          endDate as string || new Date().toISOString().split("T")[0],
          grade && grade !== "all" ? Number(grade) : undefined,
          section && section !== "all" ? Number(section) : undefined,
        );
        if (type === "absentees") {
          data = data.filter((r: any) => r.status === "absent");
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
