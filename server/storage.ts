import { db } from "./db";
import { eq, and, sql, like, or, inArray, gte, lte, desc } from "drizzle-orm";
import {
  schools, users, students, gradeLevels, sections,
  kioskLocations, dailyAttendances, attendanceEvents,
  smsTemplates, smsLogs, teacherSections, schoolHolidays,
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
  type SchoolHoliday, type InsertSchoolHoliday,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const DEFAULT_SMS_TEMPLATES: Array<{ type: string; text: string; enabled: boolean }> = [
  { type: "check_in", text: "[{school_name}] {student_name} checked in at {time} on {date}.", enabled: true },
  { type: "late", text: "[{school_name}] {student_name} arrived late at {time} on {date}.", enabled: true },
  { type: "check_out", text: "[{school_name}] {student_name} checked out at {time} on {date}.", enabled: true },
  { type: "out_final", text: "[{school_name}] {student_name} dismissed at {time} on {date}.", enabled: false },
  { type: "break_out", text: "[{school_name}] {student_name} went out for break at {time} on {date}.", enabled: false },
  { type: "break_in", text: "[{school_name}] {student_name} returned from break at {time} on {date}.", enabled: false },
  { type: "early_out", text: "[{school_name}] {student_name} left early at {time} on {date}.", enabled: false },
  { type: "absent", text: "[{school_name}] {student_name} was marked absent on {date}.", enabled: false },
];

export interface IStorage {
  // Auth
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;

  // Schools
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(data: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<InsertSchool>): Promise<School | undefined>;

  deleteSchool(id: number): Promise<void>;

  // Users
  getUsers(): Promise<User[]>;
  getUsersBySchool(schoolId: number): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  // Students
  getStudents(schoolId: number, search?: string): Promise<any[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByQrToken(qrToken: string): Promise<Student | undefined>;
  getActiveStudents(schoolId: number): Promise<Student[]>;
  createStudent(data: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<void>;
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
  deleteAttendanceById(schoolId: number, attendanceId: number): Promise<boolean>;
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
  purgeSchoolLogsByDate(
    schoolId: number,
    date: string,
    options?: { deleteAttendance?: boolean; deleteSms?: boolean },
  ): Promise<{ attendanceEventsDeleted: number; dailyAttendancesDeleted: number; smsLogsDeleted: number }>;

  // Holidays
  getHolidays(schoolId: number): Promise<SchoolHoliday[]>;
  createHoliday(data: InsertSchoolHoliday): Promise<SchoolHoliday>;
  updateHoliday(id: number, data: Partial<InsertSchoolHoliday>): Promise<SchoolHoliday | undefined>;
  deleteHoliday(id: number): Promise<void>;
  isHoliday(schoolId: number, date: string): Promise<boolean>;
  getHolidayDatesInRange(schoolId: number, startDate: string, endDate: string): Promise<Set<string>>;

  // Dashboard
  getDashboardKpis(schoolId: number, date: string): Promise<any>;
  getSectionBreakdown(schoolId: number, date: string): Promise<any[]>;
  getAttendanceIntelligence(schoolId: number, date: string): Promise<any>;

  // Reports
  getAttendanceReport(schoolId: number, startDate: string, endDate: string, gradeId?: number, sectionId?: number): Promise<any[]>;
  getSmsUsageReport(schoolId: number, startDate: string, endDate: string): Promise<any[]>;

  // Seed
  seed(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private async ensureSmsTemplatesForSchool(schoolId: number): Promise<void> {
    const existing = await db
      .select({ type: smsTemplates.type })
      .from(smsTemplates)
      .where(eq(smsTemplates.schoolId, schoolId));
    const existingTypes = new Set(existing.map((row) => row.type));

    const missing = DEFAULT_SMS_TEMPLATES.filter((t) => !existingTypes.has(t.type));
    if (missing.length === 0) return;

    await db.insert(smsTemplates).values(
      missing.map((t) => ({
        schoolId,
        type: t.type,
        enabled: t.enabled,
        templateText: t.text,
      })),
    );
  }

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
    const [{ id }] = await db.insert(schools).values(data).$returningId();
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school!;
  }

  async updateSchool(id: number, data: Partial<InsertSchool>): Promise<School | undefined> {
    await db.update(schools).set(data).where(eq(schools.id, id));
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async deleteSchool(id: number): Promise<void> {
    await db.delete(schoolHolidays).where(eq(schoolHolidays.schoolId, id));
    await db.delete(smsLogs).where(eq(smsLogs.schoolId, id));
    await db.delete(smsTemplates).where(eq(smsTemplates.schoolId, id));
    await db.delete(attendanceEvents).where(eq(attendanceEvents.schoolId, id));
    await db.delete(dailyAttendances).where(eq(dailyAttendances.schoolId, id));
    const schoolStudents = await db.select({ id: students.id }).from(students).where(eq(students.schoolId, id));
    const studentIds = schoolStudents.map(s => s.id);
    if (studentIds.length > 0) {
      await db.delete(students).where(eq(students.schoolId, id));
    }
    await db.delete(kioskLocations).where(eq(kioskLocations.schoolId, id));
    const schoolSections = await db.select({ id: sections.id }).from(sections).where(eq(sections.schoolId, id));
    if (schoolSections.length > 0) {
      const sectionIds = schoolSections.map(s => s.id);
      await db.delete(teacherSections).where(inArray(teacherSections.sectionId, sectionIds));
    }
    await db.delete(sections).where(eq(sections.schoolId, id));
    await db.delete(gradeLevels).where(eq(gradeLevels.schoolId, id));
    await db.delete(users).where(eq(users.schoolId, id));
    await db.delete(schools).where(eq(schools.id, id));
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersBySchool(schoolId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.schoolId, schoolId));
  }

  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [{ id }] = await db.insert(users).values({ ...data, password: hashedPassword }).$returningId();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user!;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    await db.update(users).set(updateData).where(eq(users.id, id));
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
        photoUrl: students.photoUrl,
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
    const [{ id }] = await db.insert(students).values(data).$returningId();
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student!;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    await db.update(students).set(data).where(eq(students.id, id));
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.delete(attendanceEvents).where(eq(attendanceEvents.studentId, id));
    await db.delete(dailyAttendances).where(eq(dailyAttendances.studentId, id));
    await db.delete(smsLogs).where(eq(smsLogs.studentId, id));
    await db.delete(students).where(eq(students.id, id));
  }

  async upsertStudentBySchoolAndNo(schoolId: number, studentNo: string, data: Partial<InsertStudent>): Promise<Student & { wasUpdate: boolean }> {
    const existing = await db.select().from(students).where(
      and(eq(students.schoolId, schoolId), eq(students.studentNo, studentNo))
    );

    if (existing.length > 0) {
      await db.update(students).set(data).where(eq(students.id, existing[0].id));
      const [updated] = await db.select().from(students).where(eq(students.id, existing[0].id));
      return { ...updated, wasUpdate: true };
    } else {
      const qrToken = randomBytes(16).toString("hex");
      const [{ id }] = await db.insert(students).values({
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
      }).$returningId();
      const [created] = await db.select().from(students).where(eq(students.id, id));
      return { ...created, wasUpdate: false };
    }
  }

  async getGradeLevels(schoolId: number): Promise<GradeLevel[]> {
    return db.select().from(gradeLevels).where(eq(gradeLevels.schoolId, schoolId));
  }

  async createGradeLevel(data: InsertGradeLevel): Promise<GradeLevel> {
    const [{ id }] = await db.insert(gradeLevels).values(data).$returningId();
    const [gl] = await db.select().from(gradeLevels).where(eq(gradeLevels.id, id));
    return gl!;
  }

  async updateGradeLevel(id: number, data: Partial<InsertGradeLevel>): Promise<GradeLevel | undefined> {
    await db.update(gradeLevels).set(data).where(eq(gradeLevels.id, id));
    const [gl] = await db.select().from(gradeLevels).where(eq(gradeLevels.id, id));
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
    const [{ id }] = await db.insert(gradeLevels).values({ schoolId, name }).$returningId();
    const [created] = await db.select().from(gradeLevels).where(eq(gradeLevels.id, id));
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
    const [{ id }] = await db.insert(sections).values(data).$returningId();
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section!;
  }

  async updateSection(id: number, data: Partial<InsertSection>): Promise<Section | undefined> {
    await db.update(sections).set(data).where(eq(sections.id, id));
    const [section] = await db.select().from(sections).where(eq(sections.id, id));
    return section;
  }

  async deleteSection(id: number): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  async getKiosks(schoolId: number): Promise<KioskLocation[]> {
    return db.select().from(kioskLocations).where(eq(kioskLocations.schoolId, schoolId));
  }

  async createKiosk(data: InsertKioskLocation): Promise<KioskLocation> {
    const [{ id }] = await db.insert(kioskLocations).values(data).$returningId();
    const [kiosk] = await db.select().from(kioskLocations).where(eq(kioskLocations.id, id));
    return kiosk!;
  }

  async updateKiosk(id: number, data: Partial<InsertKioskLocation>): Promise<KioskLocation | undefined> {
    await db.update(kioskLocations).set(data).where(eq(kioskLocations.id, id));
    const [kiosk] = await db.select().from(kioskLocations).where(eq(kioskLocations.id, id));
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
    const [{ id }] = await db.insert(dailyAttendances).values(data).$returningId();
    const [da] = await db.select().from(dailyAttendances).where(eq(dailyAttendances.id, id));
    return da!;
  }

  async updateDailyAttendance(id: number, data: Partial<InsertDailyAttendance>): Promise<DailyAttendance | undefined> {
    await db.update(dailyAttendances).set(data).where(eq(dailyAttendances.id, id));
    const [da] = await db.select().from(dailyAttendances).where(eq(dailyAttendances.id, id));
    return da;
  }

  async deleteAttendanceById(schoolId: number, attendanceId: number): Promise<boolean> {
    const [existing] = await db
      .select({ id: dailyAttendances.id })
      .from(dailyAttendances)
      .where(and(eq(dailyAttendances.id, attendanceId), eq(dailyAttendances.schoolId, schoolId)));

    if (!existing) return false;

    await db.delete(attendanceEvents).where(eq(attendanceEvents.dailyAttendanceId, attendanceId));
    await db.delete(dailyAttendances).where(eq(dailyAttendances.id, attendanceId));
    return true;
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
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
        studentNo: students.studentNo,
        gradeLevelId: students.gradeLevelId,
        sectionId: students.sectionId,
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
    const isHoliday = await this.isHoliday(schoolId, date);
    if (isHoliday) {
      return { records: [], total: 0 };
    }

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
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(whereClause);

    const records = await db
      .select({
        studentId: students.id,
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
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
    const [{ id }] = await db.insert(attendanceEvents).values(data).$returningId();
    const [event] = await db.select().from(attendanceEvents).where(eq(attendanceEvents.id, id));
    return event!;
  }

  async getRecentEvents(schoolId: number, limit: number = 10): Promise<any[]> {
    return db
      .select({
        id: attendanceEvents.id,
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
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
    await this.ensureSmsTemplatesForSchool(schoolId);
    return db.select().from(smsTemplates).where(eq(smsTemplates.schoolId, schoolId));
  }

  async updateSmsTemplate(id: number, data: Partial<InsertSmsTemplate>): Promise<SmsTemplate | undefined> {
    await db.update(smsTemplates).set(data).where(eq(smsTemplates.id, id));
    const [template] = await db.select().from(smsTemplates).where(eq(smsTemplates.id, id));
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
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
      })
      .from(smsLogs)
      .leftJoin(students, eq(smsLogs.studentId, students.id))
      .where(eq(smsLogs.schoolId, schoolId))
      .orderBy(desc(smsLogs.createdAt))
      .limit(100);
  }

  async createSmsLog(data: InsertSmsLog): Promise<SmsLog> {
    const [{ id }] = await db.insert(smsLogs).values(data).$returningId();
    const [log] = await db.select().from(smsLogs).where(eq(smsLogs.id, id));
    return log!;
  }

  async purgeSchoolLogsByDate(
    schoolId: number,
    date: string,
    options: { deleteAttendance?: boolean; deleteSms?: boolean } = {},
  ): Promise<{ attendanceEventsDeleted: number; dailyAttendancesDeleted: number; smsLogsDeleted: number }> {
    const deleteAttendance = options.deleteAttendance !== false;
    const deleteSms = options.deleteSms !== false;

    let attendanceEventsDeleted = 0;
    let dailyAttendancesDeleted = 0;
    let smsLogsDeleted = 0;

    if (deleteAttendance) {
      const deletedEvents: any = await db.delete(attendanceEvents).where(
        and(
          eq(attendanceEvents.schoolId, schoolId),
          sql`DATE(${attendanceEvents.occurredAt}) = ${date}`,
        ),
      );
      attendanceEventsDeleted = Number(deletedEvents?.rowsAffected ?? deletedEvents?.affectedRows ?? 0);

      const deletedDailyAttendances: any = await db.delete(dailyAttendances).where(
        and(eq(dailyAttendances.schoolId, schoolId), eq(dailyAttendances.date, date)),
      );
      dailyAttendancesDeleted = Number(deletedDailyAttendances?.rowsAffected ?? deletedDailyAttendances?.affectedRows ?? 0);
    }

    if (deleteSms) {
      const deletedSms: any = await db.delete(smsLogs).where(
        and(
          eq(smsLogs.schoolId, schoolId),
          sql`DATE(${smsLogs.createdAt}) = ${date}`,
        ),
      );
      smsLogsDeleted = Number(deletedSms?.rowsAffected ?? deletedSms?.affectedRows ?? 0);
    }

    return { attendanceEventsDeleted, dailyAttendancesDeleted, smsLogsDeleted };
  }

  async getHolidays(schoolId: number): Promise<SchoolHoliday[]> {
    return db
      .select()
      .from(schoolHolidays)
      .where(eq(schoolHolidays.schoolId, schoolId))
      .orderBy(desc(schoolHolidays.date));
  }

  async createHoliday(data: InsertSchoolHoliday): Promise<SchoolHoliday> {
    const [{ id }] = await db.insert(schoolHolidays).values(data).$returningId();
    const [holiday] = await db.select().from(schoolHolidays).where(eq(schoolHolidays.id, id));
    return holiday!;
  }

  async updateHoliday(id: number, data: Partial<InsertSchoolHoliday>): Promise<SchoolHoliday | undefined> {
    await db.update(schoolHolidays).set(data).where(eq(schoolHolidays.id, id));
    const [holiday] = await db.select().from(schoolHolidays).where(eq(schoolHolidays.id, id));
    return holiday;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(schoolHolidays).where(eq(schoolHolidays.id, id));
  }

  async isHoliday(schoolId: number, date: string): Promise<boolean> {
    const [holiday] = await db
      .select({ id: schoolHolidays.id })
      .from(schoolHolidays)
      .where(and(eq(schoolHolidays.schoolId, schoolId), eq(schoolHolidays.date, date)));
    return Boolean(holiday);
  }

  async getHolidayDatesInRange(schoolId: number, startDate: string, endDate: string): Promise<Set<string>> {
    const rows = await db
      .select({ date: schoolHolidays.date })
      .from(schoolHolidays)
      .where(
        and(
          eq(schoolHolidays.schoolId, schoolId),
          gte(schoolHolidays.date, startDate),
          lte(schoolHolidays.date, endDate),
        ),
      );

    return new Set(rows.map((r) => r.date));
  }

  async getDashboardKpis(schoolId: number, date: string) {
    const isHoliday = await this.isHoliday(schoolId, date);

    const attendances = await db
      .select({
        status: dailyAttendances.status,
        count: sql<number>`count(*)`,
      })
      .from(dailyAttendances)
      .where(
        and(eq(dailyAttendances.schoolId, schoolId), eq(dailyAttendances.date, date))
      )
      .groupBy(dailyAttendances.status);

    const [{ count: totalActive }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

    const statusMap: Record<string, number> = {};
    for (const row of attendances) {
      statusMap[row.status] = row.count;
    }

    const checkedIn = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return {
      isHoliday,
      present: statusMap["present"] || 0,
      late: statusMap["late"] || 0,
      pendingCheckout: statusMap["pending_checkout"] || 0,
      absent: statusMap["absent"] || 0,
      notCheckedIn: isHoliday ? 0 : totalActive - checkedIn,
      total: totalActive,
    };
  }

  async getSectionBreakdown(schoolId: number, date: string): Promise<any[]> {
    const isHoliday = await this.isHoliday(schoolId, date);
    if (isHoliday) return [];

    const result = await db
      .select({
        section: sections.name,
        gradeLevel: gradeLevels.name,
        status: dailyAttendances.status,
        count: sql<number>`count(*)`,
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

  async getAttendanceIntelligence(schoolId: number, date: string): Promise<any> {
    const end = new Date(date);
    const endIso = end.toISOString().slice(0, 10);
    const start = new Date(end);
    start.setDate(start.getDate() - 27);
    const startIso = start.toISOString().slice(0, 10);
    const split = new Date(end);
    split.setDate(split.getDate() - 13);
    const splitIso = split.toISOString().slice(0, 10);

    const roster = await db
      .select({
        id: students.id,
        studentNo: students.studentNo,
        firstName: students.firstName,
        lastName: students.lastName,
        gradeLevelName: gradeLevels.name,
        sectionName: sections.name,
      })
      .from(students)
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

    const rows = await db
      .select({
        studentId: dailyAttendances.studentId,
        status: dailyAttendances.status,
        date: dailyAttendances.date,
      })
      .from(dailyAttendances)
      .where(
        and(
          eq(dailyAttendances.schoolId, schoolId),
          gte(dailyAttendances.date, startIso),
          lte(dailyAttendances.date, endIso),
        ),
      );
    const holidayDates = await this.getHolidayDatesInRange(schoolId, startIso, endIso);

    const byStudent = new Map<number, Array<{ status: string; date: string }>>();
    for (const row of rows) {
      const normalizedDate = new Date(String(row.date)).toISOString().slice(0, 10);
      if (holidayDates.has(normalizedDate)) continue;
      const item = {
        status: row.status,
        date: normalizedDate,
      };
      const list = byStudent.get(row.studentId) || [];
      list.push(item);
      byStudent.set(row.studentId, list);
    }

    const scoreMap: Record<string, number> = {
      present: 100,
      late: 70,
      pending_checkout: 60,
      absent: 20,
    };

    const studentInsights = roster.map((student) => {
      const history = byStudent.get(student.id) || [];
      const counts = {
        present: 0,
        late: 0,
        pendingCheckout: 0,
        absent: 0,
      };

      let score = 100;
      for (const h of history) {
        if (h.status === "late") counts.late++;
        else if (h.status === "absent") counts.absent++;
        else if (h.status === "pending_checkout") counts.pendingCheckout++;
        else if (h.status === "present") counts.present++;

        if (h.status === "late") score -= 6;
        else if (h.status === "absent") score -= 12;
        else if (h.status === "pending_checkout") score -= 8;
      }
      score = Math.max(0, Math.min(100, score));

      const recentRows = history.filter((h) => h.date >= splitIso);
      const previousRows = history.filter((h) => h.date < splitIso);
      const avg = (arr: Array<{ status: string }>) =>
        arr.length === 0
          ? 0
          : Math.round(
              arr.reduce((sum, a) => sum + (scoreMap[a.status] ?? 50), 0) / arr.length,
            );
      const recentScore = avg(recentRows);
      const previousScore = avg(previousRows);
      const delta = recentScore - previousScore;
      const trend =
        previousRows.length === 0
          ? "stable"
          : delta >= 8
            ? "improving"
            : delta <= -8
              ? "declining"
              : "stable";

      const riskFlags: string[] = [];
      if (counts.absent >= 3) riskFlags.push("chronic_absent");
      if (counts.late >= 4) riskFlags.push("frequent_late");
      if (counts.pendingCheckout >= 3) riskFlags.push("missing_checkout_pattern");
      if (score < 70) riskFlags.push("low_attendance_score");

      return {
        studentId: student.id,
        studentNo: student.studentNo,
        studentName: `${student.firstName} ${student.lastName}`,
        gradeLevel: student.gradeLevelName || "Unassigned",
        section: student.sectionName || "Unassigned",
        score,
        trend,
        counts,
        riskFlags,
      };
    });

    const atRiskStudents = studentInsights
      .filter((s) => s.riskFlags.length > 0 || s.trend === "declining")
      .sort((a, b) => {
        const aRisk = a.riskFlags.length + (a.trend === "declining" ? 1 : 0);
        const bRisk = b.riskFlags.length + (b.trend === "declining" ? 1 : 0);
        if (bRisk !== aRisk) return bRisk - aRisk;
        return a.score - b.score;
      })
      .slice(0, 15);

    const classAgg = new Map<string, { gradeLevel: string; section: string; total: number; avgScore: number; atRiskCount: number }>();
    const gradeAgg = new Map<string, { gradeLevel: string; total: number; avgScore: number; atRiskCount: number }>();

    for (const s of studentInsights) {
      const classKey = `${s.gradeLevel}|${s.section}`;
      const classRow = classAgg.get(classKey) || {
        gradeLevel: s.gradeLevel,
        section: s.section,
        total: 0,
        avgScore: 0,
        atRiskCount: 0,
      };
      classRow.total++;
      classRow.avgScore += s.score;
      if (s.riskFlags.length > 0 || s.trend === "declining") classRow.atRiskCount++;
      classAgg.set(classKey, classRow);

      const gradeRow = gradeAgg.get(s.gradeLevel) || {
        gradeLevel: s.gradeLevel,
        total: 0,
        avgScore: 0,
        atRiskCount: 0,
      };
      gradeRow.total++;
      gradeRow.avgScore += s.score;
      if (s.riskFlags.length > 0 || s.trend === "declining") gradeRow.atRiskCount++;
      gradeAgg.set(s.gradeLevel, gradeRow);
    }

    const classInsights = Array.from(classAgg.values()).map((r) => ({
      ...r,
      avgScore: r.total > 0 ? Math.round(r.avgScore / r.total) : 0,
    }));
    const gradeInsights = Array.from(gradeAgg.values()).map((r) => ({
      ...r,
      avgScore: r.total > 0 ? Math.round(r.avgScore / r.total) : 0,
    }));

    return {
      window: { startDate: startIso, endDate: endIso },
      summary: {
        totalStudents: studentInsights.length,
        atRiskCount: atRiskStudents.length,
      },
      atRiskStudents,
      classInsights,
      gradeInsights,
    };
  }

  async getAttendanceReport(schoolId: number, startDate: string, endDate: string, gradeId?: number, sectionId?: number): Promise<any[]> {
    const conditions: any[] = [
      eq(dailyAttendances.schoolId, schoolId),
      gte(dailyAttendances.date, startDate),
      lte(dailyAttendances.date, endDate),
    ];
    if (gradeId) conditions.push(eq(students.gradeLevelId, gradeId));
    if (sectionId) conditions.push(eq(students.sectionId, sectionId));

    const records = await db
      .select({
        attendanceId: dailyAttendances.id,
        studentName: sql<string>`CONCAT(${students.firstName}, ' ', ${students.lastName})`,
        studentNo: students.studentNo,
        gradeLevel: gradeLevels.name,
        section: sections.name,
        date: dailyAttendances.date,
        checkInTime: dailyAttendances.checkInTime,
        checkOutTime: dailyAttendances.checkOutTime,
        status: dailyAttendances.status,
        isLate: dailyAttendances.isLate,
      })
      .from(dailyAttendances)
      .innerJoin(students, eq(dailyAttendances.studentId, students.id))
      .leftJoin(gradeLevels, eq(students.gradeLevelId, gradeLevels.id))
      .leftJoin(sections, eq(students.sectionId, sections.id))
      .where(and(...conditions))
      .orderBy(desc(dailyAttendances.date));

    const holidayDates = await this.getHolidayDatesInRange(schoolId, startDate, endDate);
    return records.filter((r: any) => !holidayDates.has(String(r.date)));
  }

  async getSmsUsageReport(schoolId: number, startDate: string, endDate: string): Promise<any[]> {
    return db
      .select({
        date: sql<string>`DATE(${smsLogs.createdAt})`,
        total: sql<number>`count(*)`,
        sent: sql<number>`sum(case when ${smsLogs.status} = 'sent' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${smsLogs.status} = 'failed' then 1 else 0 end)`,
        queued: sql<number>`sum(case when ${smsLogs.status} = 'queued' then 1 else 0 end)`,
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

    const [{ id: schoolId }] = await db.insert(schools).values({
      name: "Stars Educational Center Inc.",
      timezone: "Asia/Manila",
      lateTime: "08:00:00",
      cutoffTime: "09:00:00",
      smsEnabled: false,
      smsSendMode: "ALL_MOVEMENTS",
      allowMultipleScans: true,
      smsProvider: "semaphore",
    }).$returningId();
    const [school] = await db.select().from(schools).where(eq(schools.id, schoolId));

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
      const [{ id: gradeId }] = await db.insert(gradeLevels).values({ schoolId: school.id, name }).$returningId();
      const [gl] = await db.select().from(gradeLevels).where(eq(gradeLevels.id, gradeId));
      createdGrades.push(gl);
    }

    const sectionNames = ["Section A", "Section B"];
    const createdSections: Section[] = [];
    for (const gl of createdGrades.slice(0, 3)) {
      for (const sName of sectionNames) {
        const [{ id: sectionId }] = await db.insert(sections).values({
          schoolId: school.id,
          gradeLevelId: gl.id,
          name: sName,
        }).$returningId();
        const [sec] = await db.select().from(sections).where(eq(sections.id, sectionId));
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

    await db.insert(kioskLocations).values({
      schoolId: school.id,
      name: "Main Gate",
      slug: "main-gate",
    });

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

    for (const t of DEFAULT_SMS_TEMPLATES) {
      await db.insert(smsTemplates).values({
        schoolId: school.id,
        type: t.type,
        enabled: t.enabled,
        templateText: t.text,
      });
    }
  }
}

export const storage = new DatabaseStorage();
