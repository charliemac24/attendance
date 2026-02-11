import { db } from "./db";
import { eq, and, sql, like, or, notInArray, inArray, gte, lte, count, desc } from "drizzle-orm";
import {
  schools, users, students, gradeLevels, sections,
  kioskLocations, dailyAttendances, attendanceEvents,
  smsTemplates, smsLogs, teacherSections,
  type School, type InsertSchool,
  type User, type InsertUser,
  type Student, type InsertStudent,
  type GradeLevel, type InsertGradeLevel,
  type Section, type InsertSection,
  type KioskLocation, type InsertKioskLocation,
  type DailyAttendance, type InsertDailyAttendance,
  type AttendanceEvent, type InsertAttendanceEvent,
  type SmsTemplate, type InsertSmsTemplate,
  type SmsLog, type InsertSmsLog,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export interface IStorage {
  // Auth
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;

  // Schools
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(data: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<InsertSchool>): Promise<School | undefined>;

  // Users
  createUser(data: InsertUser): Promise<User>;

  // Students
  getStudents(schoolId: number, search?: string): Promise<any[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByQrToken(qrToken: string): Promise<Student | undefined>;
  getActiveStudents(schoolId: number): Promise<Student[]>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  upsertStudentBySchoolAndNo(schoolId: number, studentNo: string, data: Partial<InsertStudent>): Promise<Student & { wasUpdate: boolean }>;

  // Grade Levels
  getGradeLevels(schoolId: number): Promise<GradeLevel[]>;
  createGradeLevel(data: InsertGradeLevel): Promise<GradeLevel>;
  updateGradeLevel(id: number, data: Partial<InsertGradeLevel>): Promise<GradeLevel | undefined>;
  deleteGradeLevel(id: number): Promise<void>;
  findOrCreateGradeLevel(schoolId: number, name: string): Promise<GradeLevel>;

  // Sections
  getSections(schoolId: number): Promise<any[]>;
  createSection(data: InsertSection): Promise<Section>;
  updateSection(id: number, data: Partial<InsertSection>): Promise<Section | undefined>;
  deleteSection(id: number): Promise<void>;

  // Kiosks
  getKiosks(schoolId: number): Promise<KioskLocation[]>;
  createKiosk(data: InsertKioskLocation): Promise<KioskLocation>;
  updateKiosk(id: number, data: Partial<InsertKioskLocation>): Promise<KioskLocation | undefined>;
  deleteKiosk(id: number): Promise<void>;

  // Daily Attendance
  getDailyAttendance(studentId: number, date: string): Promise<DailyAttendance | undefined>;
  createDailyAttendance(data: InsertDailyAttendance): Promise<DailyAttendance>;
  updateDailyAttendance(id: number, data: Partial<InsertDailyAttendance>): Promise<DailyAttendance | undefined>;
  getAttendancesBySchoolAndDate(schoolId: number, date: string, status?: string): Promise<any[]>;
  getStudentsNotCheckedIn(schoolId: number, date: string, search?: string, gradeId?: number, sectionId?: number, page?: number, pageSize?: number): Promise<{ records: any[]; total: number }>;

  // Attendance Events
  createAttendanceEvent(data: InsertAttendanceEvent): Promise<AttendanceEvent>;
  getRecentEvents(schoolId: number, limit?: number): Promise<any[]>;

  // SMS Templates
  getSmsTemplates(schoolId: number): Promise<SmsTemplate[]>;
  updateSmsTemplate(id: number, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined>;

  // SMS Logs
  getSmsLogs(schoolId: number): Promise<any[]>;
  createSmsLog(data: InsertSmsLog): Promise<SmsLog>;

  // Dashboard
  getDashboardKpis(schoolId: number, date: string): Promise<any>;
  getSectionBreakdown(schoolId: number, date: string): Promise<any[]>;

  // Reports
  getAttendanceReport(schoolId: number, startDate: string, endDate: string, gradeId?: number, sectionId?: number): Promise<any[]>;
  getSmsUsageReport(schoolId: number, startDate: string, endDate: string): Promise<any[]>;

  // Seed
  seed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getSchools(): Promise<School[]> {
    return db.select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(data: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(data).returning();
    return school;
  }

  async updateSchool(id: number, data: Partial<InsertSchool>): Promise<School | undefined> {
    const [school] = await db.update(schools).set(data).where(eq(schools.id, id)).returning();
    return school;
  }

  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({ ...data, password: hashedPassword }).returning();
    return user;
  }

  async getStudents(schoolId: number, search?: string): Promise<any[]> {
    let query = db
      .select({
        id: students.id,
        schoolId: students.schoolId,
        studentNo: students.studentNo,
        firstName: students.firstName,
        lastName: students.lastName,
        gradeLevelId: students.gradeLevelId,
        sectionId: students.sectionId,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        qrToken: students.qrToken,
        isActive: students.isActive,
        gradeLevelName: gradeLevels.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(eq(students.schoolId, schoolId))
      .$dynamic();

    if (search) {
      query = query.where(
        and(
          eq(students.schoolId, schoolId),
          or(
            like(students.firstName, `%${search}%`),
            like(students.lastName, `%${search}%`),
            like(students.studentNo, `%${search}%`)
          )
        )
      );
    }

    return query;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByQrToken(qrToken: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.qrToken, qrToken));
    return student;
  }

  async getActiveStudents(schoolId: number): Promise<Student[]> {
    return db.select().from(students).where(
      and(eq(students.schoolId, schoolId), eq(students.isActive, true))
    );
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [student] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return student;
  }

  async upsertStudentBySchoolAndNo(schoolId: number, studentNo: string, data: Partial<InsertStudent>): Promise<Student & { wasUpdate: boolean }> {
    const existing = await db.select().from(students).where(
      and(eq(students.schoolId, schoolId), eq(students.studentNo, studentNo))
    );

    if (existing.length > 0) {
      const [updated] = await db.update(students).set(data).where(eq(students.id, existing[0].id)).returning();
      return { ...updated, wasUpdate: true };
    } else {
      const qrToken = randomBytes(16).toString("hex");
      const [created] = await db.insert(students).values({
        schoolId,
        studentNo,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        gradeLevelId: data.gradeLevelId || null,
        sectionId: data.sectionId || null,
        guardianName: data.guardianName || null,
        guardianPhone: data.guardianPhone || null,
        qrToken,
        isActive: true,
      }).returning();
      return { ...created, wasUpdate: false };
    }
  }

  async getGradeLevels(schoolId: number): Promise<GradeLevel[]> {
    return db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
  }

  async createGradeLevel(data: InsertGradeLevel): Promise<GradeLevel> {
    const [gl] = await db.insert(gradeLevels).values(data).returning();
    return gl;
  }

  async updateGradeLevel(id: number, data: Partial<InsertGradeLevel>): Promise<GradeLevel | undefined> {
    const [gl] = await db.update(gradeLevels).set(data).where(eq(gradeLevels.id, id)).returning();
    return gl;
  }

  async deleteGradeLevel(id: number): Promise<void> {
    await db.delete(gradeLevels).where(eq(gradeLevels.id, id));
  }

  async findOrCreateGradeLevel(schoolId: number, name: string): Promise<GradeLevel> {
    const existing = await db.select().from(gradeLevels).where(
      and(eq(gradeLevels.schoolId, schoolId), eq(gradeLevels.name, name))
    );
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(gradeLevels).values({ schoolId, name }).returning();
    return created;
  }

  async getSections(schoolId: number): Promise<any[]> {
    return db
      .select({
        id: sections.id,
        schoolId: sections.schoolId,
        gradeLevelId: sections.gradeLevelId,
        name: sections.name,
        gradeLevelName: gradeLevels.name,
      })
      .from(sections)
      .leftJoin(gradeLevels, eq(sections.gradeLevelId, gradeLevels.id))
      .where(eq(sections.schoolId, schoolId));
  }

  async createSection(data: InsertSection): Promise<Section> {
    const [section] = await db.insert(sections).values(data).returning();
    return section;
  }

  async updateSection(id: number, data: Partial<InsertSection>): Promise<Section | undefined> {
    const [section] = await db.update(sections).set(data).where(eq(sections.id, id)).returning();
    return section;
  }

  async deleteSection(id: number): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  async getKiosks(schoolId: number): Promise<KioskLocation[]> {
    return db.select().from(kioskLocations).where(eq(kioskLocations.schoolId, schoolId));
  }

  async createKiosk(data: InsertKioskLocation): Promise<KioskLocation> {
    const [kiosk] = await db.insert(kioskLocations).values(data).returning();
    return kiosk;
  }

  async updateKiosk(id: number, data: Partial<InsertKioskLocation>): Promise<KioskLocation | undefined> {
    const [kiosk] = await db.update(kioskLocations).set(data).where(eq(kioskLocations.id, id)).returning();
    return kiosk;
  }

  async deleteKiosk(id: number): Promise<void> {
    await db.delete(kioskLocations).where(eq(kioskLocations.id, id));
  }

  async getDailyAttendance(studentId: number, date: string): Promise<DailyAttendance | undefined> {
    const [da] = await db.select().from(dailyAttendances).where(
      and(eq(dailyAttendances.studentId, studentId), eq(dailyAttendances.date, date))
    );
    return da;
  }

  async createDailyAttendance(data: InsertDailyAttendance): Promise<DailyAttendance> {
    const [da] = await db.insert(dailyAttendances).values(data).returning();
    return da;
  }

  async updateDailyAttendance(id: number, data: Partial<InsertDailyAttendance>): Promise<DailyAttendance | undefined> {
    const [da] = await db.update(dailyAttendances).set(data).where(eq(dailyAttendances.id, id)).returning();
    return da;
  }

  async getAttendancesBySchoolAndDate(schoolId: number, date: string, status?: string): Promise<any[]> {
    const conditions = [
      eq(dailyAttendances.schoolId, schoolId),
      eq(dailyAttendances.date, date),
    ];
    if (status) {
      conditions.push(eq(dailyAttendances.status, status));
    }

    return db
      .select({
        id: dailyAttendances.id,
        studentId: dailyAttendances.studentId,
        date: dailyAttendances.date,
        status: dailyAttendances.status,
        checkInTime: dailyAttendances.checkInTime,
        checkOutTime: dailyAttendances.checkOutTime,
        isLate: dailyAttendances.isLate,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
        studentNo: students.studentNo,
        gradeLevel: gradeLevels.name,
        section: sections.name,
        guardianPhone: students.guardianPhone,
      })
      .from(dailyAttendances)
      .innerJoin(students, eq(dailyAttendances.studentId, students.id))
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(...conditions));
  }

  async getStudentsNotCheckedIn(
    schoolId: number,
    date: string,
    search?: string,
    gradeId?: number,
    sectionId?: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ records: any[]; total: number }> {
    const checkedInStudentIds = db
      .select({ studentId: dailyAttendances.studentId })
      .from(dailyAttendances)
      .where(
        and(
          eq(dailyAttendances.schoolId, schoolId),
          eq(dailyAttendances.date, date)
        )
      );

    const conditions: any[] = [
      eq(students.schoolId, schoolId),
      eq(students.isActive, true),
      sql`${students.id} NOT IN (${checkedInStudentIds})`,
    ];

    if (search) {
      conditions.push(
        or(
          like(students.firstName, `%${search}%`),
          like(students.lastName, `%${search}%`),
          like(students.studentNo, `%${search}%`)
        )
      );
    }
    if (gradeId) conditions.push(eq(students.gradeLevelId, gradeId));
    if (sectionId) conditions.push(eq(students.sectionId, sectionId));

    const whereClause = and(...conditions);

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(whereClause);

    const records = await db
      .select({
        studentId: students.id,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
        studentNo: students.studentNo,
        gradeLevel: gradeLevels.name,
        section: sections.name,
        guardianPhone: students.guardianPhone,
      })
      .from(students)
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(whereClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      records: records.map((r) => ({
        ...r,
        status: "not_checked_in",
        checkInTime: null,
        checkOutTime: null,
      })),
      total: totalCount,
    };
  }

  async createAttendanceEvent(data: InsertAttendanceEvent): Promise<AttendanceEvent> {
    const [event] = await db.insert(attendanceEvents).values(data).returning();
    return event;
  }

  async getRecentEvents(schoolId: number, limit: number = 10): Promise<any[]> {
    return db
      .select({
        id: attendanceEvents.id,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
        eventType: attendanceEvents.eventType,
        occurredAt: attendanceEvents.occurredAt,
      })
      .from(attendanceEvents)
      .innerJoin(students, eq(attendanceEvents.studentId, students.id))
      .where(eq(attendanceEvents.schoolId, schoolId))
      .orderBy(desc(attendanceEvents.occurredAt))
      .limit(limit);
  }

  async getSmsTemplates(schoolId: number): Promise<SmsTemplate[]> {
    return db.select().from(smsTemplates).where(eq(smsTemplates.schoolId, schoolId));
  }

  async updateSmsTemplate(id: number, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    const [template] = await db.update(smsTemplates).set(data).where(eq(smsTemplates.id, id)).returning();
    return template;
  }

  async getSmsLogs(schoolId: number): Promise<any[]> {
    return db
      .select({
        id: smsLogs.id,
        schoolId: smsLogs.schoolId,
        studentId: smsLogs.studentId,
        templateType: smsLogs.templateType,
        toPhone: smsLogs.toPhone,
        message: smsLogs.message,
        status: smsLogs.status,
        providerMessageId: smsLogs.providerMessageId,
        providerResponse: smsLogs.providerResponse,
        sentAt: smsLogs.sentAt,
        errorMessage: smsLogs.errorMessage,
        createdAt: smsLogs.createdAt,
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      })
      .from(smsLogs)
      .leftJoin(students, eq(smsLogs.studentId, students.id))
      .where(eq(smsLogs.schoolId, schoolId))
      .orderBy(desc(smsLogs.createdAt))
      .limit(100);
  }

  async createSmsLog(data: InsertSmsLog): Promise<SmsLog> {
    const [log] = await db.insert(smsLogs).values(data).returning();
    return log;
  }

  async getDashboardKpis(schoolId: number, date: string) {
    const attendances = await db
      .select({
        status: dailyAttendances.status,
        count: sql<number>`count(*)::int`,
      })
      .from(dailyAttendances)
      .where(
        and(eq(dailyAttendances.schoolId, schoolId), eq(dailyAttendances.date, date))
      )
      .groupBy(dailyAttendances.status);

    const [{ count: totalActive }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

    const statusMap: Record<string, number> = {};
    for (const row of attendances) {
      statusMap[row.status] = row.count;
    }

    const checkedIn = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return {
      present: statusMap["present"] || 0,
      late: statusMap["late"] || 0,
      pendingCheckout: statusMap["pending_checkout"] || 0,
      absent: statusMap["absent"] || 0,
      notCheckedIn: totalActive - checkedIn,
      total: totalActive,
    };
  }

  async getSectionBreakdown(schoolId: number, date: string): Promise<any[]> {
    const result = await db
      .select({
        section: sections.name,
        gradeLevel: gradeLevels.name,
        status: dailyAttendances.status,
        count: sql<number>`count(*)::int`,
      })
      .from(dailyAttendances)
      .innerJoin(students, eq(dailyAttendances.studentId, students.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .where(
        and(eq(dailyAttendances.schoolId, schoolId), eq(dailyAttendances.date, date))
      )
      .groupBy(sections.name, gradeLevels.name, dailyAttendances.status);

    const sectionMap = new Map<string, any>();
    for (const row of result) {
      const key = `${row.section || "No Section"}-${row.gradeLevel || "No Grade"}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          section: row.section || "No Section",
          gradeLevel: row.gradeLevel || "No Grade",
          present: 0,
          late: 0,
          absent: 0,
          pendingCheckout: 0,
          total: 0,
        });
      }
      const s = sectionMap.get(key);
      s[row.status === "pending_checkout" ? "pendingCheckout" : row.status] = row.count;
      s.total += row.count;
    }

    return Array.from(sectionMap.values());
  }

  async getAttendanceReport(schoolId: number, startDate: string, endDate: string, gradeId?: number, sectionId?: number): Promise<any[]> {
    const conditions: any[] = [
      eq(dailyAttendances.schoolId, schoolId),
      gte(dailyAttendances.date, startDate),
      lte(dailyAttendances.date, endDate),
    ];
    if (gradeId) conditions.push(eq(students.gradeLevelId, gradeId));
    if (sectionId) conditions.push(eq(students.sectionId, sectionId));

    return db
      .select({
        studentName: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
        studentNo: students.studentNo,
        gradeLevel: gradeLevels.name,
        section: sections.name,
        date: dailyAttendances.date,
        checkInTime: dailyAttendances.checkInTime,
        checkOutTime: dailyAttendances.checkOutTime,
        status: dailyAttendances.status,
      })
      .from(dailyAttendances)
      .innerJoin(students, eq(dailyAttendances.studentId, students.id))
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(...conditions))
      .orderBy(desc(dailyAttendances.date));
  }

  async getSmsUsageReport(schoolId: number, startDate: string, endDate: string): Promise<any[]> {
    return db
      .select({
        date: sql<string>`DATE(${smsLogs.createdAt})::text`,
        total: sql<number>`count(*)::int`,
        sent: sql<number>`count(*) FILTER (WHERE ${smsLogs.status} = 'sent')::int`,
        failed: sql<number>`count(*) FILTER (WHERE ${smsLogs.status} = 'failed')::int`,
        queued: sql<number>`count(*) FILTER (WHERE ${smsLogs.status} = 'queued')::int`,
      })
      .from(smsLogs)
      .where(
        and(
          eq(smsLogs.schoolId, schoolId),
          gte(sql`DATE(${smsLogs.createdAt})`, startDate),
          lte(sql`DATE(${smsLogs.createdAt})`, endDate)
        )
      )
      .groupBy(sql`DATE(${smsLogs.createdAt})`)
      .orderBy(desc(sql`DATE(${smsLogs.createdAt})`));
  }

  async seed(): Promise<void> {
    const existingSchools = await db.select().from(schools);
    if (existingSchools.length > 0) return;

    const [school] = await db.insert(schools).values({
      name: "Stars Educational Center Inc.",
      timezone: "Asia/Manila",
      lateTime: "08:00:00",
      cutoffTime: "09:00:00",
      smsEnabled: false,
      allowMultipleScans: false,
      smsProvider: "semaphore",
    }).returning();

    const hashPw = await bcrypt.hash("password", 10);

    await db.insert(users).values([
      { username: "super", password: hashPw, fullName: "Super Admin", role: "super_admin", schoolId: null },
      { username: "admin", password: hashPw, fullName: "School Admin", role: "school_admin", schoolId: school.id },
      { username: "gate", password: hashPw, fullName: "Gate Staff", role: "gate_staff", schoolId: school.id },
      { username: "teacher", password: hashPw, fullName: "Teacher User", role: "teacher", schoolId: school.id },
    ]);

    const gradeNames = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
    const createdGrades: GradeLevel[] = [];
    for (const name of gradeNames) {
      const [gl] = await db.insert(gradeLevels).values({ schoolId: school.id, name }).returning();
      createdGrades.push(gl);
    }

    const sectionNames = ["Section A", "Section B"];
    const createdSections: Section[] = [];
    for (const gl of createdGrades.slice(0, 3)) {
      for (const sName of sectionNames) {
        const [sec] = await db.insert(sections).values({
          schoolId: school.id,
          gradeLevelId: gl.id,
          name: sName,
        }).returning();
        createdSections.push(sec);
      }
    }

    const teacherUser = await this.getUserByUsername("teacher");
    if (teacherUser && createdSections.length > 0) {
      await db.insert(teacherSections).values({
        userId: teacherUser.id,
        sectionId: createdSections[0].id,
      });
    }

    const [kiosk] = await db.insert(kioskLocations).values({
      schoolId: school.id,
      name: "Main Gate",
      slug: "main-gate",
    }).returning();

    const firstNames = [
      "Juan", "Maria", "Carlos", "Ana", "Pedro", "Sofia", "Miguel", "Isabella",
      "Antonio", "Lucia", "Gabriel", "Valentina", "Rafael", "Camila", "Diego",
      "Emma", "Sebastian", "Mia", "Mateo", "Victoria", "Daniel", "Natalia",
      "Alejandro", "Daniela", "Fernando", "Adriana", "Ricardo", "Paula",
      "Francisco", "Andrea",
    ];
    const lastNames = [
      "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Torres", "Ramos",
      "Flores", "Cruz", "Lopez", "Martinez", "Rodriguez", "Hernandez", "Gonzalez",
      "Rivera", "Perez", "Sanchez", "Ramirez", "Morales", "Castillo", "Ortiz",
      "Gomez", "Diaz", "Vargas", "Romero", "Castro", "Alvarez", "Ruiz",
      "Fernandez", "Jimenez",
    ];

    for (let i = 0; i < 30; i++) {
      const gradeIdx = Math.floor(i / 5) % createdGrades.length;
      const sectionIdx = i < createdSections.length ? i % createdSections.length : 0;

      const qrToken = randomBytes(16).toString("hex");
      const phone = `6391${String(7000000 + i).padStart(7, "0")}`;

      await db.insert(students).values({
        schoolId: school.id,
        studentNo: `2025-${String(i + 1).padStart(3, "0")}`,
        firstName: firstNames[i],
        lastName: lastNames[i],
        gradeLevelId: createdGrades[gradeIdx].id,
        sectionId: createdSections.length > sectionIdx ? createdSections[sectionIdx].id : null,
        guardianName: `Parent of ${firstNames[i]}`,
        guardianPhone: phone,
        qrToken,
        isActive: true,
      });
    }

    const templateDefaults = [
      { type: "check_in", text: "[{school_name}] {student_name} checked in at {time} on {date}." },
      { type: "check_out", text: "[{school_name}] {student_name} checked out at {time} on {date}." },
      { type: "late", text: "[{school_name}] {student_name} arrived late at {time} on {date}." },
      { type: "absent", text: "[{school_name}] {student_name} was marked absent on {date}." },
    ];

    for (const t of templateDefaults) {
      await db.insert(smsTemplates).values({
        schoolId: school.id,
        type: t.type,
        enabled: true,
        templateText: t.text,
      });
    }
  }
}

export const storage = new DatabaseStorage();
