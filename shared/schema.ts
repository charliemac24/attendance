import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  time,
  json,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Manila"),
  lateTime: time("late_time").notNull().default("08:00:00"),
  cutoffTime: time("cutoff_time").notNull().default("09:00:00"),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  allowMultipleScans: boolean("allow_multiple_scans").notNull().default(false),
  smsProvider: text("sms_provider").notNull().default("semaphore"),
  semaphoreApiKey: text("semaphore_api_key"),
  semaphoreSenderName: text("semaphore_sender_name"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"),
  schoolId: integer("school_id").references(() => schools.id),
});

export const gradeLevels = pgTable(
  "grade_levels",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    name: text("name").notNull(),
  },
  (table) => [
    index("grade_levels_school_idx").on(table.schoolId),
  ]
);

export const sections = pgTable(
  "sections",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    gradeLevelId: integer("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    name: text("name").notNull(),
  },
  (table) => [
    index("sections_school_idx").on(table.schoolId),
  ]
);

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    studentNo: text("student_no").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    gradeLevelId: integer("grade_level_id").references(() => gradeLevels.id),
    sectionId: integer("section_id").references(() => sections.id),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    qrToken: text("qr_token").notNull().unique(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("students_school_student_no_idx").on(
      table.schoolId,
      table.studentNo
    ),
    index("students_school_idx").on(table.schoolId),
    index("students_qr_token_idx").on(table.qrToken),
  ]
);

export const teacherSections = pgTable(
  "teacher_sections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    sectionId: integer("section_id")
      .notNull()
      .references(() => sections.id),
  },
  (table) => [
    index("teacher_sections_user_idx").on(table.userId),
  ]
);

export const kioskLocations = pgTable(
  "kiosk_locations",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
  },
  (table) => [
    uniqueIndex("kiosk_locations_school_slug_idx").on(
      table.schoolId,
      table.slug
    ),
    index("kiosk_locations_school_idx").on(table.schoolId),
  ]
);

export const dailyAttendances = pgTable(
  "daily_attendances",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    date: date("date").notNull(),
    status: text("status").notNull().default("pending_checkout"),
    checkInTime: timestamp("check_in_time"),
    checkOutTime: timestamp("check_out_time"),
    isLate: boolean("is_late").notNull().default(false),
    markedAbsentAt: timestamp("marked_absent_at"),
  },
  (table) => [
    index("daily_attendances_school_date_idx").on(table.schoolId, table.date),
    uniqueIndex("daily_attendances_student_date_idx").on(
      table.studentId,
      table.date
    ),
  ]
);

export const attendanceEvents = pgTable(
  "attendance_events",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    dailyAttendanceId: integer("daily_attendance_id").references(
      () => dailyAttendances.id
    ),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    performedByUserId: integer("performed_by_user_id").references(
      () => users.id
    ),
    kioskLocationId: integer("kiosk_location_id").references(
      () => kioskLocations.id
    ),
    meta: json("meta"),
  },
  (table) => [
    index("attendance_events_school_idx").on(table.schoolId),
  ]
);

export const smsTemplates = pgTable(
  "sms_templates",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    type: text("type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    templateText: text("template_text").notNull(),
  },
  (table) => [
    index("sms_templates_school_idx").on(table.schoolId),
  ]
);

export const smsLogs = pgTable(
  "sms_logs",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: integer("student_id").references(() => students.id),
    templateType: text("template_type"),
    toPhone: text("to_phone").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    providerResponse: json("provider_response"),
    sentAt: timestamp("sent_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("sms_logs_school_idx").on(table.schoolId),
  ]
);

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
});
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertGradeLevelSchema = createInsertSchema(gradeLevels).omit({
  id: true,
});
export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
});
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});
export const insertKioskLocationSchema = createInsertSchema(
  kioskLocations
).omit({ id: true });
export const insertDailyAttendanceSchema = createInsertSchema(
  dailyAttendances
).omit({ id: true });
export const insertAttendanceEventSchema = createInsertSchema(
  attendanceEvents
).omit({ id: true });
export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
});
export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({
  id: true,
  createdAt: true,
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GradeLevel = typeof gradeLevels.$inferSelect;
export type InsertGradeLevel = z.infer<typeof insertGradeLevelSchema>;
export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type KioskLocation = typeof kioskLocations.$inferSelect;
export type InsertKioskLocation = z.infer<typeof insertKioskLocationSchema>;
export type DailyAttendance = typeof dailyAttendances.$inferSelect;
export type InsertDailyAttendance = z.infer<typeof insertDailyAttendanceSchema>;
export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
export type InsertAttendanceEvent = z.infer<typeof insertAttendanceEventSchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type UserRole = "super_admin" | "school_admin" | "gate_staff" | "teacher";

export type AttendanceStatus = "pending_checkout" | "late" | "present" | "absent";
