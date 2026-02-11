import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import multer from "multer";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);
const upload = multer({ storage: multer.memoryStorage() });

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "myo-attendance-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: { maxAge: 24 * 60 * 60 * 1000 },
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
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

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

  app.delete("/api/users/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
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
        records = records.filter((r: any) => r.gradeLevel === gradeFilter || false);
      }
      if (sectionFilter && sectionFilter !== "all") {
        records = records.filter((r: any) => r.section === sectionFilter || false);
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
        isActive: true,
        gradeLevelId: req.body.gradeLevelId || null,
        sectionId: req.body.sectionId || null,
      });
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/students/:id", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const student = await storage.updateStudent(Number(req.params.id), req.body);
      res.json(student);
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

        const studentName = `${student.firstName} ${student.lastName}`;
        return res.json({
          success: true,
          message: isLate ? `${studentName} checked in (Late)` : `${studentName} checked in`,
          studentName,
          status,
          action: isLate ? "Late Check-in" : "Check-in",
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      if (existingAttendance.status === "pending_checkout" || existingAttendance.status === "late") {
        await storage.updateDailyAttendance(existingAttendance.id, {
          status: "present",
          checkOutTime: now,
        });

        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existingAttendance.id,
          eventType: "check_out",
          occurredAt: now,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kioskLocationId || null,
          meta: null,
        });

        const studentName = `${student.firstName} ${student.lastName}`;
        return res.json({
          success: true,
          message: `${studentName} checked out`,
          studentName,
          status: "present",
          action: "Check-out",
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      if (school.allowMultipleScans) {
        await storage.createAttendanceEvent({
          schoolId,
          studentId: student.id,
          dailyAttendanceId: existingAttendance.id,
          eventType: "extra_scan",
          occurredAt: now,
          performedByUserId: req.session.userId || null,
          kioskLocationId: kioskLocationId || null,
          meta: null,
        });

        const studentName = `${student.firstName} ${student.lastName}`;
        return res.json({
          success: true,
          message: `${studentName} - extra scan recorded`,
          studentName,
          status: existingAttendance.status,
          action: "Extra Scan",
          time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      const studentName = `${student.firstName} ${student.lastName}`;
      return res.json({
        success: false,
        message: `${studentName} has already completed attendance today.`,
        studentName,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Manual Attendance
  app.post("/api/attendance/manual", requireAuth, requireRole("super_admin", "school_admin"), async (req, res) => {
    try {
      const { studentId, action, timestamp } = req.body;
      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const schoolId = student.schoolId;
      const today = new Date().toISOString().split("T")[0];
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
      const school = await storage.updateSchool(schoolId, req.body);
      res.json(school);
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
      res.json(await storage.createSchool(req.body));
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/schools/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      res.json(await storage.updateSchool(Number(req.params.id), req.body));
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
