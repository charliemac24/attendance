package com.myosystems.attendance.data.remote.operations

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class DashboardResponseDto(
    @SerialName("date") val date: String,
    @SerialName("kpis") val kpis: DashboardKpisDto,
    @SerialName("smsCredits") val smsCredits: DashboardSmsCreditsDto = DashboardSmsCreditsDto(),
    @SerialName("recentEvents") val recentEvents: List<RecentAttendanceEventDto> = emptyList(),
    @SerialName("gradeBreakdown") val gradeBreakdown: List<GradeAttendanceBreakdownDto> = emptyList(),
    @SerialName("missedCheckoutsPreviousDay") val missedCheckoutsPreviousDay: List<AttendanceRecordDto> = emptyList(),
)

@Serializable
data class DashboardKpisDto(
    @SerialName("checkedOut") val checkedOut: Int = 0,
    @SerialName("lateArrivals") val lateArrivals: Int = 0,
    @SerialName("onCampus") val onCampus: Int = 0,
    @SerialName("absent") val absent: Int = 0,
    @SerialName("notCheckedIn") val notCheckedIn: Int = 0,
    @SerialName("total") val total: Int = 0,
)

@Serializable
data class DashboardSmsCreditsDto(
    @SerialName("month") val month: String = "",
    @SerialName("monthlyCredits") val monthlyCredits: Int = 0,
    @SerialName("usedCredits") val usedCredits: Int = 0,
    @SerialName("remainingCredits") val remainingCredits: Int = 0,
    @SerialName("overageCount") val overageCount: Int = 0,
)

@Serializable
data class RecentAttendanceEventDto(
    @SerialName("id") val id: Int,
    @SerialName("studentName") val studentName: String,
    @SerialName("eventType") val eventType: String,
    @SerialName("occurredAt") val occurredAt: String,
)

@Serializable
data class GradeAttendanceBreakdownDto(
    @SerialName("gradeLevel") val gradeLevel: String,
    @SerialName("totalStudents") val totalStudents: Int,
    @SerialName("checkedIn") val checkedIn: Int,
    @SerialName("checkedOut") val checkedOut: Int,
    @SerialName("attendanceRate") val attendanceRate: Double,
    @SerialName("lateArrivals") val lateArrivals: Int,
    @SerialName("absent") val absent: Int,
    @SerialName("onCampus") val onCampus: Int,
    @SerialName("notCheckedIn") val notCheckedIn: Int,
)

@Serializable
data class AttendanceIntelligenceResponseDto(
    @SerialName("window") val window: AttendanceIntelligenceWindowDto,
    @SerialName("summary") val summary: AttendanceRiskSummaryDto,
    @SerialName("atRiskStudents") val atRiskStudents: List<AtRiskStudentDto> = emptyList(),
)

@Serializable
data class AttendanceIntelligenceWindowDto(
    @SerialName("startDate") val startDate: String,
    @SerialName("endDate") val endDate: String,
)

@Serializable
data class AttendanceRiskSummaryDto(
    @SerialName("totalStudents") val totalStudents: Int = 0,
    @SerialName("atRiskCount") val atRiskCount: Int = 0,
)

@Serializable
data class AtRiskStudentDto(
    @SerialName("studentId") val studentId: Int,
    @SerialName("studentNo") val studentNo: String,
    @SerialName("studentName") val studentName: String,
    @SerialName("gradeLevel") val gradeLevel: String,
    @SerialName("section") val section: String,
    @SerialName("score") val score: Int,
    @SerialName("trend") val trend: String,
    @SerialName("riskFlags") val riskFlags: List<String> = emptyList(),
)

@Serializable
data class AttendanceRecordDto(
    @SerialName("id") val id: Int? = null,
    @SerialName("studentId") val studentId: Int,
    @SerialName("studentName") val studentName: String = "",
    @SerialName("studentNo") val studentNo: String = "",
    @SerialName("gradeLevel") val gradeLevel: String? = null,
    @SerialName("section") val section: String? = null,
    @SerialName("checkInTime") val checkInTime: String? = null,
    @SerialName("checkOutTime") val checkOutTime: String? = null,
    @SerialName("status") val status: String = "",
    @SerialName("guardianPhone") val guardianPhone: String? = null,
    @SerialName("missedCheckoutYesterday") val missedCheckoutYesterday: Boolean = false,
)

@Serializable
data class TodayAttendanceResponseDto(
    @SerialName("records") val records: List<AttendanceRecordDto> = emptyList(),
    @SerialName("total") val total: Int = 0,
    @SerialName("page") val page: Int = 1,
    @SerialName("pageSize") val pageSize: Int = 20,
)

@Serializable
data class GradeLevelDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("lateTimeOverride") val lateTimeOverride: String? = null,
    @SerialName("fridayLateTimeOverride") val fridayLateTimeOverride: String? = null,
    @SerialName("lateTimeOverridesByWeekday") val lateTimeOverridesByWeekday: Map<String, String?>? = null,
)

@Serializable
data class SectionDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("gradeLevelId") val gradeLevelId: Int,
    @SerialName("gradeLevelName") val gradeLevelName: String? = null,
    @SerialName("lateTimeOverride") val lateTimeOverride: String? = null,
    @SerialName("fridayLateTimeOverride") val fridayLateTimeOverride: String? = null,
    @SerialName("lateTimeOverridesByWeekday") val lateTimeOverridesByWeekday: Map<String, String?>? = null,
)

@Serializable
data class SchoolHolidayDto(
    @SerialName("id") val id: Int,
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("date") val date: String,
    @SerialName("name") val name: String,
    @SerialName("type") val type: String,
    @SerialName("isRecurring") val isRecurring: Boolean,
)

@Serializable
data class SchoolSettingsSummaryDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("loginSlug") val loginSlug: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null,
    @SerialName("timezone") val timezone: String? = null,
    @SerialName("lateTime") val lateTime: String? = null,
    @SerialName("cutoffTime") val cutoffTime: String? = null,
    @SerialName("smsEnabled") val smsEnabled: Boolean = false,
    @SerialName("smsProvider") val smsProvider: String? = null,
    @SerialName("semaphoreApiKey") val semaphoreApiKey: String? = null,
    @SerialName("semaphoreSenderName") val semaphoreSenderName: String? = null,
    @SerialName("absentSmsEnabled") val absentSmsEnabled: Boolean = false,
    @SerialName("minScanIntervalSeconds") val minScanIntervalSeconds: Int = 120,
    @SerialName("dismissalTime") val dismissalTime: String? = null,
    @SerialName("earlyOutWindowMinutes") val earlyOutWindowMinutes: Int = 30,
    @SerialName("showStudentsNeedingAttention") val showStudentsNeedingAttention: Boolean = true,
)

@Serializable
data class SchoolLogoUploadResponseDto(
    @SerialName("logoUrl") val logoUrl: String,
)

@Serializable
data class BulkQrGenerationResponseDto(
    @SerialName("updated") val updated: Int = 0,
)

@Serializable
data class PurgeLogsResponseDto(
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("from") val from: String,
    @SerialName("to") val to: String,
    @SerialName("attendanceEventsDeleted") val attendanceEventsDeleted: Int = 0,
    @SerialName("dailyAttendancesDeleted") val dailyAttendancesDeleted: Int = 0,
    @SerialName("smsLogsDeleted") val smsLogsDeleted: Int = 0,
)

@Serializable
data class StudentSummaryDto(
    @SerialName("id") val id: Int,
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("studentNo") val studentNo: String,
    @SerialName("firstName") val firstName: String,
    @SerialName("lastName") val lastName: String,
    @SerialName("gradeLevelId") val gradeLevelId: Int? = null,
    @SerialName("sectionId") val sectionId: Int? = null,
    @SerialName("guardianName") val guardianName: String? = null,
    @SerialName("guardianPhone") val guardianPhone: String? = null,
    @SerialName("photoUrl") val photoUrl: String? = null,
    @SerialName("qrToken") val qrToken: String,
    @SerialName("isActive") val isActive: Boolean = true,
    @SerialName("gradeLevelName") val gradeLevelName: String? = null,
    @SerialName("sectionName") val sectionName: String? = null,
    @SerialName("currentDayStatus") val currentDayStatus: String? = null,
)

@Serializable
data class StudentPhotoUploadResponseDto(
    @SerialName("photoUrl") val photoUrl: String,
)

@Serializable
data class AttendanceReportRowDto(
    @SerialName("attendanceId") val attendanceId: Int? = null,
    @SerialName("studentId") val studentId: Int? = null,
    @SerialName("studentName") val studentName: String = "",
    @SerialName("studentNo") val studentNo: String = "",
    @SerialName("gradeLevel") val gradeLevel: String? = null,
    @SerialName("section") val section: String? = null,
    @SerialName("date") val date: String,
    @SerialName("checkInTime") val checkInTime: String? = null,
    @SerialName("checkOutTime") val checkOutTime: String? = null,
    @SerialName("status") val status: String = "",
    @SerialName("isLate") val isLate: Boolean = false,
)

@Serializable
data class SmsUsageReportRowDto(
    @SerialName("date") val date: String,
    @SerialName("total") val total: Int = 0,
    @SerialName("sent") val sent: Int = 0,
    @SerialName("failed") val failed: Int = 0,
    @SerialName("queued") val queued: Int = 0,
    @SerialName("submitted") val submitted: Int = 0,
    @SerialName("retryWait") val retryWait: Int = 0,
)

@Serializable
data class SmsBillingReportRowDto(
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("schoolName") val schoolName: String,
    @SerialName("month") val month: String,
    @SerialName("sentCount") val sentCount: Int = 0,
    @SerialName("monthlySmsCredits") val monthlySmsCredits: Int = 0,
    @SerialName("excessCount") val excessCount: Int = 0,
    @SerialName("smsOverageRateCents") val smsOverageRateCents: Int = 0,
    @SerialName("overageAmountCents") val overageAmountCents: Int = 0,
)

@Serializable
data class SmsTemplateDto(
    @SerialName("id") val id: Int,
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("type") val type: String,
    @SerialName("enabled") val enabled: Boolean = true,
    @SerialName("templateText") val templateText: String,
)

@Serializable
data class SmsLogEntryDto(
    @SerialName("id") val id: Int,
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("studentId") val studentId: Int? = null,
    @SerialName("templateType") val templateType: String? = null,
    @SerialName("toPhone") val toPhone: String,
    @SerialName("message") val message: String,
    @SerialName("status") val status: String,
    @SerialName("providerMessageId") val providerMessageId: String? = null,
    @SerialName("providerResponse") val providerResponse: kotlinx.serialization.json.JsonElement? = null,
    @SerialName("sentAt") val sentAt: String? = null,
    @SerialName("errorMessage") val errorMessage: String? = null,
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("studentName") val studentName: String? = null,
)

@Serializable
data class TestSmsResponseDto(
    @SerialName("ok") val ok: Boolean = false,
    @SerialName("providerResponse") val providerResponse: kotlinx.serialization.json.JsonElement? = null,
)

@Serializable
data class ClearRecentActivityResponseDto(
    @SerialName("deleted") val deleted: Int = 0,
)

@Serializable
data class ManualAttendanceRequestDto(
    @SerialName("studentId") val studentId: Int,
    @SerialName("action") val action: String,
    @SerialName("timestamp") val timestamp: String? = null,
)

@Serializable
data class ManualAttendanceResponseDto(
    @SerialName("success") val success: Boolean = false,
    @SerialName("message") val message: String? = null,
    @SerialName("status") val status: String? = null,
)

@Serializable
data class AttendanceStatusRequestDto(
    @SerialName("studentId") val studentId: Int,
    @SerialName("status") val status: String,
    @SerialName("date") val date: String? = null,
    @SerialName("note") val note: String? = null,
)

@Serializable
data class SimpleSuccessResponseDto(
    @SerialName("success") val success: Boolean = false,
    @SerialName("ok") val ok: Boolean = false,
)

@Serializable
data class GradeLevelUpsertRequestDto(
    @SerialName("name") val name: String,
    @SerialName("lateTimeOverride") val lateTimeOverride: String? = null,
    @SerialName("lateTimeOverridesByWeekday") val lateTimeOverridesByWeekday: Map<String, String>? = null,
)

@Serializable
data class SectionUpsertRequestDto(
    @SerialName("name") val name: String,
    @SerialName("gradeLevelId") val gradeLevelId: Int,
    @SerialName("lateTimeOverride") val lateTimeOverride: String? = null,
    @SerialName("lateTimeOverridesByWeekday") val lateTimeOverridesByWeekday: Map<String, String>? = null,
)

@Serializable
data class KioskUpsertRequestDto(
    @SerialName("name") val name: String,
    @SerialName("slug") val slug: String,
)

@Serializable
data class HolidayUpsertRequestDto(
    @SerialName("date") val date: String,
    @SerialName("name") val name: String,
    @SerialName("type") val type: String,
    @SerialName("isRecurring") val isRecurring: Boolean,
)

@Serializable
data class StudentUpsertRequestDto(
    @SerialName("firstName") val firstName: String,
    @SerialName("lastName") val lastName: String,
    @SerialName("studentNo") val studentNo: String,
    @SerialName("gradeLevelId") val gradeLevelId: Int? = null,
    @SerialName("sectionId") val sectionId: Int? = null,
    @SerialName("guardianName") val guardianName: String? = null,
    @SerialName("guardianPhone") val guardianPhone: String? = null,
    @SerialName("photoUrl") val photoUrl: String? = null,
    @SerialName("isActive") val isActive: Boolean = true,
)

@Serializable
data class BulkAssignSectionRequestDto(
    @SerialName("studentIds") val studentIds: List<Int>,
    @SerialName("sectionId") val sectionId: Int? = null,
)

@Serializable
data class SchoolSettingsUpdateRequestDto(
    @SerialName("name") val name: String,
    @SerialName("loginSlug") val loginSlug: String,
    @SerialName("timezone") val timezone: String,
    @SerialName("lateTime") val lateTime: String,
    @SerialName("cutoffTime") val cutoffTime: String,
    @SerialName("smsEnabled") val smsEnabled: Boolean,
    @SerialName("smsProvider") val smsProvider: String,
    @SerialName("semaphoreApiKey") val semaphoreApiKey: String?,
    @SerialName("semaphoreSenderName") val semaphoreSenderName: String?,
    @SerialName("absentSmsEnabled") val absentSmsEnabled: Boolean,
    @SerialName("minScanIntervalSeconds") val minScanIntervalSeconds: Int,
    @SerialName("dismissalTime") val dismissalTime: String,
    @SerialName("earlyOutWindowMinutes") val earlyOutWindowMinutes: Int,
    @SerialName("showStudentsNeedingAttention") val showStudentsNeedingAttention: Boolean,
)

@Serializable
data class PurgeLogsRequestDto(
    @SerialName("from") val from: String,
    @SerialName("to") val to: String,
    @SerialName("deleteAttendance") val deleteAttendance: Boolean,
    @SerialName("deleteSms") val deleteSms: Boolean,
)

@Serializable
data class SmsTemplateUpdateRequestDto(
    @SerialName("enabled") val enabled: Boolean,
    @SerialName("templateText") val templateText: String,
)

@Serializable
data class TestSmsRequestDto(
    @SerialName("phone") val phone: String,
    @SerialName("message") val message: String,
)
