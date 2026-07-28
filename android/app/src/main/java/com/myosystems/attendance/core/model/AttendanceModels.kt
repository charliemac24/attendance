package com.myosystems.attendance.core.model

data class DashboardKpis(
    val checkedOut: Int,
    val lateArrivals: Int,
    val onCampus: Int,
    val absent: Int,
    val notCheckedIn: Int,
    val total: Int,
)

data class DashboardSmsCredits(
    val month: String,
    val monthlyCredits: Int,
    val usedCredits: Int,
    val remainingCredits: Int,
    val overageCount: Int,
)

data class RecentAttendanceEvent(
    val id: Int,
    val studentName: String,
    val eventType: String,
    val occurredAt: String,
)

data class GradeAttendanceBreakdown(
    val gradeLevel: String,
    val totalStudents: Int,
    val checkedIn: Int,
    val checkedOut: Int,
    val attendanceRate: Double,
    val lateArrivals: Int,
    val absent: Int,
    val onCampus: Int,
    val notCheckedIn: Int,
)

data class AttendanceRecord(
    val id: Int? = null,
    val studentId: Int,
    val studentName: String,
    val studentNo: String,
    val gradeLevel: String,
    val section: String,
    val checkInTime: String?,
    val checkOutTime: String?,
    val status: String,
    val guardianPhone: String? = null,
    val missedCheckoutYesterday: Boolean = false,
)

data class DashboardSummary(
    val date: String,
    val kpis: DashboardKpis,
    val smsCredits: DashboardSmsCredits,
    val recentEvents: List<RecentAttendanceEvent>,
    val gradeBreakdown: List<GradeAttendanceBreakdown>,
    val missedCheckoutsPreviousDay: List<AttendanceRecord>,
)

data class AttendanceRiskSummary(
    val totalStudents: Int,
    val atRiskCount: Int,
)

data class AtRiskStudent(
    val studentId: Int,
    val studentNo: String,
    val studentName: String,
    val gradeLevel: String,
    val section: String,
    val score: Int,
    val trend: String,
    val riskFlags: List<String>,
)

data class AttendanceIntelligence(
    val startDate: String,
    val endDate: String,
    val summary: AttendanceRiskSummary,
    val atRiskStudents: List<AtRiskStudent>,
)

data class TodayAttendancePage(
    val records: List<AttendanceRecord>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
)

data class GradeLevelSummary(
    val id: Int,
    val name: String,
    val lateTimeOverride: String? = null,
    val fridayLateTimeOverride: String? = null,
    val lateTimeOverridesByWeekday: Map<String, String?>? = null,
)

data class SectionSummary(
    val id: Int,
    val name: String,
    val gradeLevelId: Int,
    val gradeLevelName: String? = null,
    val lateTimeOverride: String? = null,
    val fridayLateTimeOverride: String? = null,
    val lateTimeOverridesByWeekday: Map<String, String?>? = null,
)

data class SchoolHoliday(
    val id: Int,
    val schoolId: Int,
    val date: String,
    val name: String,
    val type: String,
    val isRecurring: Boolean,
)

data class SchoolSettings(
    val id: Int,
    val name: String,
    val loginSlug: String?,
    val logoUrl: String?,
    val timezone: String?,
    val lateTime: String?,
    val cutoffTime: String?,
    val smsEnabled: Boolean,
    val smsProvider: String?,
    val semaphoreApiKey: String?,
    val semaphoreSenderName: String?,
    val absentSmsEnabled: Boolean,
    val minScanIntervalSeconds: Int,
    val dismissalTime: String?,
    val earlyOutWindowMinutes: Int,
    val showStudentsNeedingAttention: Boolean,
)

data class BulkQrGenerationResult(
    val updated: Int,
)

data class PurgeLogsResult(
    val schoolId: Int,
    val from: String,
    val to: String,
    val attendanceEventsDeleted: Int,
    val dailyAttendancesDeleted: Int,
    val smsLogsDeleted: Int,
)

data class AttendanceReportRow(
    val attendanceId: Int? = null,
    val studentId: Int? = null,
    val studentName: String,
    val studentNo: String,
    val gradeLevel: String,
    val section: String,
    val date: String,
    val checkInTime: String?,
    val checkOutTime: String?,
    val status: String,
    val isLate: Boolean = false,
)

data class SmsUsageReportRow(
    val date: String,
    val total: Int,
    val sent: Int,
    val failed: Int,
    val queued: Int,
    val submitted: Int,
    val retryWait: Int,
)

data class SmsBillingReportRow(
    val schoolId: Int,
    val schoolName: String,
    val month: String,
    val sentCount: Int,
    val monthlySmsCredits: Int,
    val excessCount: Int,
    val smsOverageRateCents: Int,
    val overageAmountCents: Int,
)

data class SmsTemplateItem(
    val id: Int,
    val schoolId: Int,
    val type: String,
    val enabled: Boolean,
    val templateText: String,
)

data class SmsLogEntry(
    val id: Int,
    val schoolId: Int,
    val studentId: Int?,
    val templateType: String?,
    val toPhone: String,
    val message: String,
    val status: String,
    val providerMessageId: String?,
    val providerResponse: String?,
    val sentAt: String?,
    val errorMessage: String?,
    val createdAt: String?,
    val studentName: String?,
)
