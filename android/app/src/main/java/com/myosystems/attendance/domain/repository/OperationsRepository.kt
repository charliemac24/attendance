package com.myosystems.attendance.domain.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.AttendanceIntelligence
import com.myosystems.attendance.core.model.DashboardSummary
import com.myosystems.attendance.core.model.BulkQrGenerationResult
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.AttendanceReportRow
import com.myosystems.attendance.core.model.PurgeLogsResult
import com.myosystems.attendance.core.model.SchoolHoliday
import com.myosystems.attendance.core.model.SchoolSettings
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.SmsBillingReportRow
import com.myosystems.attendance.core.model.SmsLogEntry
import com.myosystems.attendance.core.model.SmsTemplateItem
import com.myosystems.attendance.core.model.SmsUsageReportRow
import com.myosystems.attendance.core.model.StudentPhotoUploadResult
import com.myosystems.attendance.core.model.StudentSummary
import com.myosystems.attendance.core.model.StudentUpsert
import com.myosystems.attendance.core.model.TodayAttendancePage

interface OperationsRepository {
    suspend fun getDashboard(date: String): AppResult<DashboardSummary>
    suspend fun clearRecentActivity(): AppResult<Int>
    suspend fun getAttendanceIntelligence(date: String): AppResult<AttendanceIntelligence>
    suspend fun getTodayStatus(
        status: String,
        date: String,
        search: String?,
        grade: String?,
        section: String?,
        page: Int,
    ): AppResult<TodayAttendancePage>

    suspend fun getGradeLevels(): AppResult<List<GradeLevelSummary>>
    suspend fun createGradeLevel(name: String, lateTimeOverride: String?, lateTimeOverridesByWeekday: Map<String, String>): AppResult<GradeLevelSummary>
    suspend fun updateGradeLevel(id: Int, name: String, lateTimeOverride: String?, lateTimeOverridesByWeekday: Map<String, String>): AppResult<GradeLevelSummary>
    suspend fun deleteGradeLevel(id: Int): AppResult<Unit>
    suspend fun getSections(): AppResult<List<SectionSummary>>
    suspend fun createSection(name: String, gradeLevelId: Int, lateTimeOverride: String?, lateTimeOverridesByWeekday: Map<String, String>): AppResult<SectionSummary>
    suspend fun updateSection(id: Int, name: String, gradeLevelId: Int, lateTimeOverride: String?, lateTimeOverridesByWeekday: Map<String, String>): AppResult<SectionSummary>
    suspend fun deleteSection(id: Int): AppResult<Unit>
    suspend fun getKiosks(): AppResult<List<KioskLocation>>
    suspend fun createKiosk(name: String, slug: String): AppResult<KioskLocation>
    suspend fun updateKiosk(id: Int, name: String, slug: String): AppResult<KioskLocation>
    suspend fun deleteKiosk(id: Int): AppResult<Unit>
    suspend fun getHolidays(): AppResult<List<SchoolHoliday>>
    suspend fun createHoliday(date: String, name: String, type: String, isRecurring: Boolean): AppResult<SchoolHoliday>
    suspend fun updateHoliday(id: Int, date: String, name: String, type: String, isRecurring: Boolean): AppResult<SchoolHoliday>
    suspend fun deleteHoliday(id: Int): AppResult<Unit>
    suspend fun getSchoolSettings(): AppResult<SchoolSettings>
    suspend fun updateSchoolSettings(settings: SchoolSettings): AppResult<SchoolSettings>
    suspend fun uploadSchoolLogo(photoBytes: ByteArray, fileName: String, mimeType: String): AppResult<String>
    suspend fun generateStudentQrTokens(): AppResult<BulkQrGenerationResult>
    suspend fun purgeLogs(from: String, to: String, deleteAttendance: Boolean, deleteSms: Boolean): AppResult<PurgeLogsResult>
    suspend fun getSmsTemplates(): AppResult<List<SmsTemplateItem>>
    suspend fun updateSmsTemplate(id: Int, enabled: Boolean, templateText: String): AppResult<SmsTemplateItem>
    suspend fun getSmsLogs(from: String, to: String): AppResult<List<SmsLogEntry>>
    suspend fun exportSmsLogs(from: String, to: String): AppResult<ByteArray>
    suspend fun sendTestSms(phone: String, message: String): AppResult<Unit>
    suspend fun getStudents(search: String?, status: String): AppResult<List<StudentSummary>>
    suspend fun createStudent(student: StudentUpsert): AppResult<StudentSummary>
    suspend fun updateStudent(id: Int, student: StudentUpsert): AppResult<StudentSummary>
    suspend fun deleteStudent(id: Int): AppResult<Unit>
    suspend fun regenerateStudentQrToken(id: Int): AppResult<StudentSummary>
    suspend fun bulkAssignStudentsToSection(studentIds: List<Int>, sectionId: Int?): AppResult<Unit>
    suspend fun uploadStudentPhoto(photoBytes: ByteArray, fileName: String, mimeType: String): AppResult<StudentPhotoUploadResult>
    suspend fun getAttendanceReport(
        reportType: String,
        startDate: String,
        endDate: String,
        grade: String?,
        section: String?,
        studentName: String?,
        studentNo: String?,
    ): AppResult<List<AttendanceReportRow>>
    suspend fun getSmsUsageReport(
        startDate: String,
        endDate: String,
    ): AppResult<List<SmsUsageReportRow>>
    suspend fun getSmsBillingReport(month: String): AppResult<List<SmsBillingReportRow>>
    suspend fun exportReport(
        reportType: String,
        startDate: String?,
        endDate: String?,
        grade: String?,
        section: String?,
        studentName: String?,
        studentNo: String?,
        month: String?,
    ): AppResult<ByteArray>
    suspend fun submitManualAttendance(
        studentId: Int,
        action: String,
        timestamp: String?,
    ): AppResult<String>

    suspend fun updateAttendanceStatus(
        studentId: Int,
        status: String,
        date: String?,
        note: String?,
    ): AppResult<Unit>
}
