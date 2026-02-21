import { sql } from "drizzle-orm";
import {
  mysqlTable,
  text,
  varchar,
  int,
  boolean,
  datetime,
  date,
  time,
  json,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Manila"),
  lateTime: time("late_time").notNull().default("08:00:00"),
  cutoffTime: time("cutoff_time").notNull().default("09:00:00"),
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  smsDailyCap: int("sms_daily_cap").notNull().default(-1),
  smsSendMode: varchar("sms_send_mode", { length: 32 }).notNull().default("ALL_MOVEMENTS"),
  allowMultipleScans: boolean("allow_multiple_scans").notNull().default(true),
  maxBreakCyclesPerDay: int("max_break_cycles_per_day").notNull().default(2),
  minScanIntervalSeconds: int("min_scan_interval_seconds").notNull().default(120),
  dismissalTime: time("dismissal_time").notNull().default("15:00:00"),
  earlyOutWindowMinutes: int("early_out_window_minutes").notNull().default(30),
  smsProvider: varchar("sms_provider", { length: 32 }).notNull().default("semaphore"),
  semaphoreApiKey: varchar("semaphore_api_key", { length: 255 }),
  semaphoreSenderName: varchar("semaphore_sender_name", { length: 64 }),
  monthlySmsCredits: int("monthly_sms_credits").notNull().default(0),
  smsOverageRateCents: int("sms_overage_rate_cents").notNull().default(150),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 191 }),
  fullName: varchar("full_name", { length: 191 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("teacher"),
  schoolId: int("school_id").references(() => schools.id),
});

export const gradeLevels = mysqlTable(
  "grade_levels",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 64 }).notNull(),
  },
  (table) => [
    index("grade_levels_school_idx").on(table.schoolId),
  ]
);

export const sections = mysqlTable(
  "sections",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    gradeLevelId: int("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    name: varchar("name", { length: 64 }).notNull(),
  },
  (table) => [
    index("sections_school_idx").on(table.schoolId),
  ]
);

export const gradeSmsPolicies = mysqlTable(
  "grade_sms_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    gradeLevelId: int("grade_level_id")
      .notNull()
      .references(() => gradeLevels.id),
    enabled: boolean("enabled").notNull().default(false),
    dailyCap: int("daily_cap").notNull().default(2),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("grade_sms_policies_school_grade_idx").on(table.schoolId, table.gradeLevelId),
    index("grade_sms_policies_school_idx").on(table.schoolId),
  ]
);

export const sectionSmsPolicies = mysqlTable(
  "section_sms_policies",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    sectionId: int("section_id")
      .notNull()
      .references(() => sections.id),
    enabled: boolean("enabled").notNull().default(false),
    dailyCap: int("daily_cap").notNull().default(2),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("section_sms_policies_school_section_idx").on(table.schoolId, table.sectionId),
    index("section_sms_policies_school_idx").on(table.schoolId),
  ]
);

export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    studentNo: varchar("student_no", { length: 64 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    gradeLevelId: int("grade_level_id").references(() => gradeLevels.id),
    sectionId: int("section_id").references(() => sections.id),
    guardianName: varchar("guardian_name", { length: 191 }),
    guardianPhone: varchar("guardian_phone", { length: 32 }),
    photoUrl: varchar("photo_url", { length: 255 }),
    qrToken: varchar("qr_token", { length: 64 }).notNull().unique(),
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

export const teacherSections = mysqlTable(
  "teacher_sections",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    sectionId: int("section_id")
      .notNull()
      .references(() => sections.id),
  },
  (table) => [
    index("teacher_sections_user_idx").on(table.userId),
  ]
);

export const kioskLocations = mysqlTable(
  "kiosk_locations",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
  },
  (table) => [
    uniqueIndex("kiosk_locations_school_slug_idx").on(
      table.schoolId,
      table.slug
    ),
    index("kiosk_locations_school_idx").on(table.schoolId),
  ]
);

export const dailyAttendances = mysqlTable(
  "daily_attendances",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id),
    date: date("date", { mode: "string" }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending_checkout"),
    checkInTime: datetime("check_in_time"),
    checkOutTime: datetime("check_out_time"),
    isLate: boolean("is_late").notNull().default(false),
    markedAbsentAt: datetime("marked_absent_at"),
  },
  (table) => [
    index("daily_attendances_school_date_idx").on(table.schoolId, table.date),
    uniqueIndex("daily_attendances_student_date_idx").on(
      table.studentId,
      table.date
    ),
  ]
);

export const attendanceEvents = mysqlTable(
  "attendance_events",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: int("student_id")
      .notNull()
      .references(() => students.id),
    dailyAttendanceId: int("daily_attendance_id").references(
      () => dailyAttendances.id
    ),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    occurredAt: datetime("occurred_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    performedByUserId: int("performed_by_user_id").references(
      () => users.id
    ),
    kioskLocationId: int("kiosk_location_id").references(
      () => kioskLocations.id
    ),
    meta: json("meta"),
  },
  (table) => [
    index("attendance_events_school_idx").on(table.schoolId),
  ]
);

export const smsTemplates = mysqlTable(
  "sms_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    type: varchar("type", { length: 32 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    templateText: text("template_text").notNull(),
  },
  (table) => [
    index("sms_templates_school_idx").on(table.schoolId),
  ]
);

export const smsLogs = mysqlTable(
  "sms_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: int("student_id").references(() => students.id),
    templateType: varchar("template_type", { length: 32 }),
    toPhone: varchar("to_phone", { length: 32 }).notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    providerMessageId: varchar("provider_message_id", { length: 191 }),
    providerResponse: json("provider_response"),
    sentAt: datetime("sent_at"),
    errorMessage: text("error_message"),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sms_logs_school_idx").on(table.schoolId),
  ]
);

export const globalSmsSettings = mysqlTable(
  "global_sms_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    defaultSmsMode: varchar("default_sms_mode", { length: 32 })
      .notNull()
      .default("FIRST_IN_LAST_OUT"),
    defaultSmsDailyCapPerStudent: int("default_sms_daily_cap_per_student")
      .notNull()
      .default(2),
    allowAllMovements: boolean("allow_all_movements").notNull().default(false),
    allowDigest: boolean("allow_digest").notNull().default(false),
    allowExceptionOnly: boolean("allow_exception_only").notNull().default(false),
    maxSmsDailyCapPerStudent: int("max_sms_daily_cap_per_student")
      .notNull()
      .default(4),
    allowUnlimitedCap: boolean("allow_unlimited_cap").notNull().default(false),
    allowAllGuardiansRecipients: boolean("allow_all_guardians_recipients")
      .notNull()
      .default(true),
    updatedByUserId: int("updated_by_user_id").references(() => users.id),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  }
);

export const schoolNotificationSettings = mysqlTable(
  "school_notification_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    smsMode: varchar("sms_mode", { length: 32 }),
    smsDailyCapPerStudent: int("sms_daily_cap_per_student"),
    smsRecipientsMode: varchar("sms_recipients_mode", { length: 32 }),
    smsQuietHoursStart: time("sms_quiet_hours_start"),
    smsQuietHoursEnd: time("sms_quiet_hours_end"),
    smsLastOutCutoffTime: time("sms_last_out_cutoff_time"),
    updatedByUserId: int("updated_by_user_id").references(() => users.id),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("school_notification_settings_school_idx").on(table.schoolId),
    index("school_notification_settings_mode_idx").on(table.smsMode),
  ]
);

export const smsNotifications = mysqlTable(
  "sms_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    studentId: int("student_id").references(() => students.id),
    dailyAttendanceId: int("daily_attendance_id").references(
      () => dailyAttendances.id
    ),
    templateType: varchar("template_type", { length: 32 }),
    smsMode: varchar("sms_mode", { length: 32 }),
    recipientsMode: varchar("recipients_mode", { length: 32 }),
    recipientCount: int("recipient_count").notNull().default(1),
    toPhone: varchar("to_phone", { length: 32 }),
    message: text("message").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    providerMessageId: varchar("provider_message_id", { length: 191 }),
    providerResponse: json("provider_response"),
    errorMessage: text("error_message"),
    sentAt: datetime("sent_at"),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("sms_notifications_school_created_idx").on(
      table.schoolId,
      table.createdAt
    ),
    index("sms_notifications_school_status_idx").on(table.schoolId, table.status),
    index("sms_notifications_student_idx").on(table.studentId),
  ]
);

export const schoolHolidays = mysqlTable(
  "school_holidays",
  {
    id: int("id").autoincrement().primaryKey(),
    schoolId: int("school_id")
      .notNull()
      .references(() => schools.id),
    date: date("date", { mode: "string" }).notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    type: varchar("type", { length: 32 }).notNull().default("holiday"),
    isRecurring: boolean("is_recurring").notNull().default(false),
  },
  (table) => [
    uniqueIndex("school_holidays_school_date_name_idx").on(table.schoolId, table.date, table.name),
    index("school_holidays_school_date_idx").on(table.schoolId, table.date),
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
export const insertGradeSmsPolicySchema = createInsertSchema(gradeSmsPolicies).omit({
  id: true,
});
export const insertSectionSmsPolicySchema = createInsertSchema(sectionSmsPolicies).omit({
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
export const insertAttendanceEventSchema = createInsertSchema(attendanceEvents);
export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
});
export const insertSmsLogSchema = createInsertSchema(smsLogs);
export const insertGlobalSmsSettingsSchema = createInsertSchema(
  globalSmsSettings
).omit({ id: true });
export const insertSchoolNotificationSettingsSchema = createInsertSchema(
  schoolNotificationSettings
).omit({ id: true });
export const insertSmsNotificationSchema = createInsertSchema(
  smsNotifications
).omit({ id: true });
export const insertSchoolHolidaySchema = createInsertSchema(schoolHolidays).omit({
  id: true,
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type GradeLevel = typeof gradeLevels.$inferSelect;
export type InsertGradeLevel = z.infer<typeof insertGradeLevelSchema>;
export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type GradeSmsPolicy = typeof gradeSmsPolicies.$inferSelect;
export type InsertGradeSmsPolicy = z.infer<typeof insertGradeSmsPolicySchema>;
export type SectionSmsPolicy = typeof sectionSmsPolicies.$inferSelect;
export type InsertSectionSmsPolicy = z.infer<typeof insertSectionSmsPolicySchema>;
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
export type GlobalSmsSettings = typeof globalSmsSettings.$inferSelect;
export type InsertGlobalSmsSettings = z.infer<typeof insertGlobalSmsSettingsSchema>;
export type SchoolNotificationSettings = typeof schoolNotificationSettings.$inferSelect;
export type InsertSchoolNotificationSettings = z.infer<
  typeof insertSchoolNotificationSettingsSchema
>;
export type SmsNotification = typeof smsNotifications.$inferSelect;
export type InsertSmsNotification = z.infer<typeof insertSmsNotificationSchema>;
export type SchoolHoliday = typeof schoolHolidays.$inferSelect;
export type InsertSchoolHoliday = z.infer<typeof insertSchoolHolidaySchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type UserRole = "super_admin" | "school_admin" | "gate_staff" | "teacher";

export type AttendanceStatus = "pending_checkout" | "late" | "present" | "absent";
