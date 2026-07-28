package com.myosystems.attendance.data.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.SchoolSettings
import com.myosystems.attendance.core.model.StudentPhotoUploadResult
import com.myosystems.attendance.core.model.StudentSummary
import com.myosystems.attendance.core.model.StudentUpsert
import com.myosystems.attendance.core.network.ApiErrorParser
import com.myosystems.attendance.data.remote.operations.GradeLevelUpsertRequestDto
import com.myosystems.attendance.data.remote.operations.HolidayUpsertRequestDto
import com.myosystems.attendance.data.remote.operations.KioskUpsertRequestDto
import com.myosystems.attendance.core.network.toAppResult
import com.myosystems.attendance.data.remote.operations.AttendanceStatusRequestDto
import com.myosystems.attendance.data.remote.operations.BulkAssignSectionRequestDto
import com.myosystems.attendance.data.remote.operations.PurgeLogsRequestDto
import com.myosystems.attendance.data.remote.operations.ManualAttendanceRequestDto
import com.myosystems.attendance.data.remote.operations.OperationsApiService
import com.myosystems.attendance.data.remote.operations.SchoolSettingsUpdateRequestDto
import com.myosystems.attendance.data.remote.operations.SectionUpsertRequestDto
import com.myosystems.attendance.data.remote.operations.SmsTemplateUpdateRequestDto
import com.myosystems.attendance.data.remote.operations.StudentUpsertRequestDto
import com.myosystems.attendance.data.remote.operations.TestSmsRequestDto
import com.myosystems.attendance.data.remote.operations.toDomain
import com.myosystems.attendance.data.remote.scanner.toDomain as toKioskDomain
import com.myosystems.attendance.domain.repository.OperationsRepository
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

@Singleton
class OperationsRepositoryImpl @Inject constructor(
    private val operationsApiService: OperationsApiService,
    private val apiErrorParser: ApiErrorParser,
) : OperationsRepository {
    override suspend fun getDashboard(date: String): AppResult<com.myosystems.attendance.core.model.DashboardSummary> {
        return when (val result = operationsApiService.getDashboard(date).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun clearRecentActivity(): AppResult<Int> {
        return when (val result = operationsApiService.clearRecentActivity().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.deleted)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getAttendanceIntelligence(date: String): AppResult<com.myosystems.attendance.core.model.AttendanceIntelligence> {
        return when (val result = operationsApiService.getAttendanceIntelligence(date).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun getTodayStatus(
        status: String,
        date: String,
        search: String?,
        grade: String?,
        section: String?,
        page: Int,
    ): AppResult<com.myosystems.attendance.core.model.TodayAttendancePage> {
        return when (
            val result = operationsApiService.getTodayStatus(
                status = status,
                date = date,
                search = search,
                grade = grade,
                section = section,
                page = page,
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun getGradeLevels(): AppResult<List<com.myosystems.attendance.core.model.GradeLevelSummary>> {
        return when (val result = operationsApiService.getGradeLevels().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createGradeLevel(
        name: String,
        lateTimeOverride: String?,
        lateTimeOverridesByWeekday: Map<String, String>,
    ): AppResult<com.myosystems.attendance.core.model.GradeLevelSummary> {
        return when (
            val result = operationsApiService.createGradeLevel(
                GradeLevelUpsertRequestDto(
                    name = name,
                    lateTimeOverride = lateTimeOverride,
                    lateTimeOverridesByWeekday = lateTimeOverridesByWeekday,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateGradeLevel(
        id: Int,
        name: String,
        lateTimeOverride: String?,
        lateTimeOverridesByWeekday: Map<String, String>,
    ): AppResult<com.myosystems.attendance.core.model.GradeLevelSummary> {
        return when (
            val result = operationsApiService.updateGradeLevel(
                id = id,
                request = GradeLevelUpsertRequestDto(
                    name = name,
                    lateTimeOverride = lateTimeOverride,
                    lateTimeOverridesByWeekday = lateTimeOverridesByWeekday,
                ),
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteGradeLevel(id: Int): AppResult<Unit> {
        return when (val result = operationsApiService.deleteGradeLevel(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSections(): AppResult<List<com.myosystems.attendance.core.model.SectionSummary>> {
        return when (val result = operationsApiService.getSections().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createSection(
        name: String,
        gradeLevelId: Int,
        lateTimeOverride: String?,
        lateTimeOverridesByWeekday: Map<String, String>,
    ): AppResult<com.myosystems.attendance.core.model.SectionSummary> {
        return when (
            val result = operationsApiService.createSection(
                SectionUpsertRequestDto(name, gradeLevelId, lateTimeOverride, lateTimeOverridesByWeekday)
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateSection(
        id: Int,
        name: String,
        gradeLevelId: Int,
        lateTimeOverride: String?,
        lateTimeOverridesByWeekday: Map<String, String>,
    ): AppResult<com.myosystems.attendance.core.model.SectionSummary> {
        return when (
            val result = operationsApiService.updateSection(
                id = id,
                request = SectionUpsertRequestDto(name, gradeLevelId, lateTimeOverride, lateTimeOverridesByWeekday),
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteSection(id: Int): AppResult<Unit> {
        return when (val result = operationsApiService.deleteSection(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getKiosks(): AppResult<List<KioskLocation>> {
        return when (val result = operationsApiService.getKiosks().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toKioskDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createKiosk(name: String, slug: String): AppResult<KioskLocation> {
        return when (
            val result = operationsApiService.createKiosk(
                KioskUpsertRequestDto(name = name, slug = slug)
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toKioskDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateKiosk(id: Int, name: String, slug: String): AppResult<KioskLocation> {
        return when (
            val result = operationsApiService.updateKiosk(
                id = id,
                request = KioskUpsertRequestDto(name = name, slug = slug),
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toKioskDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteKiosk(id: Int): AppResult<Unit> {
        return when (val result = operationsApiService.deleteKiosk(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getHolidays(): AppResult<List<com.myosystems.attendance.core.model.SchoolHoliday>> {
        return when (val result = operationsApiService.getHolidays().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createHoliday(
        date: String,
        name: String,
        type: String,
        isRecurring: Boolean,
    ): AppResult<com.myosystems.attendance.core.model.SchoolHoliday> {
        return when (
            val result = operationsApiService.createHoliday(
                HolidayUpsertRequestDto(
                    date = date,
                    name = name,
                    type = type,
                    isRecurring = isRecurring,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateHoliday(
        id: Int,
        date: String,
        name: String,
        type: String,
        isRecurring: Boolean,
    ): AppResult<com.myosystems.attendance.core.model.SchoolHoliday> {
        return when (
            val result = operationsApiService.updateHoliday(
                id = id,
                request = HolidayUpsertRequestDto(
                    date = date,
                    name = name,
                    type = type,
                    isRecurring = isRecurring,
                ),
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteHoliday(id: Int): AppResult<Unit> {
        return when (val result = operationsApiService.deleteHoliday(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSchoolSettings(): AppResult<SchoolSettings> {
        return when (val result = operationsApiService.getSchoolSettings().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateSchoolSettings(settings: SchoolSettings): AppResult<SchoolSettings> {
        return when (
            val result = operationsApiService.updateSchoolSettings(
                SchoolSettingsUpdateRequestDto(
                    name = settings.name,
                    loginSlug = settings.loginSlug.orEmpty(),
                    timezone = settings.timezone ?: "Asia/Manila",
                    lateTime = settings.lateTime?.take(5) ?: "08:00",
                    cutoffTime = settings.cutoffTime?.take(5) ?: "09:00",
                    smsEnabled = settings.smsEnabled,
                    smsProvider = settings.smsProvider?.ifBlank { "semaphore" } ?: "semaphore",
                    semaphoreApiKey = settings.semaphoreApiKey?.trim().takeUnless { it.isNullOrEmpty() },
                    semaphoreSenderName = settings.semaphoreSenderName?.trim().takeUnless { it.isNullOrEmpty() },
                    absentSmsEnabled = settings.absentSmsEnabled,
                    minScanIntervalSeconds = settings.minScanIntervalSeconds,
                    dismissalTime = settings.dismissalTime?.take(5) ?: "15:00",
                    earlyOutWindowMinutes = settings.earlyOutWindowMinutes,
                    showStudentsNeedingAttention = settings.showStudentsNeedingAttention,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun uploadSchoolLogo(photoBytes: ByteArray, fileName: String, mimeType: String): AppResult<String> {
        val requestBody = photoBytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("logo", fileName, requestBody)
        return when (val result = operationsApiService.uploadSchoolLogo(part).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.logoUrl)
            is AppResult.Failure -> result
        }
    }

    override suspend fun generateStudentQrTokens(): AppResult<com.myosystems.attendance.core.model.BulkQrGenerationResult> {
        return when (val result = operationsApiService.generateStudentQrTokens().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun purgeLogs(
        from: String,
        to: String,
        deleteAttendance: Boolean,
        deleteSms: Boolean,
    ): AppResult<com.myosystems.attendance.core.model.PurgeLogsResult> {
        return when (
            val result = operationsApiService.purgeLogs(
                PurgeLogsRequestDto(
                    from = from,
                    to = to,
                    deleteAttendance = deleteAttendance,
                    deleteSms = deleteSms,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSmsTemplates(): AppResult<List<com.myosystems.attendance.core.model.SmsTemplateItem>> {
        return when (val result = operationsApiService.getSmsTemplates().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateSmsTemplate(
        id: Int,
        enabled: Boolean,
        templateText: String,
    ): AppResult<com.myosystems.attendance.core.model.SmsTemplateItem> {
        return when (
            val result = operationsApiService.updateSmsTemplate(
                id = id,
                request = SmsTemplateUpdateRequestDto(enabled = enabled, templateText = templateText),
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSmsLogs(from: String, to: String): AppResult<List<com.myosystems.attendance.core.model.SmsLogEntry>> {
        return when (val result = operationsApiService.getSmsLogs(from = from, to = to).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun exportSmsLogs(from: String, to: String): AppResult<ByteArray> {
        return try {
            val response = operationsApiService.exportSmsLogs(from = from, to = to)
            if (!response.isSuccessful) {
                AppResult.Failure("Failed to export SMS logs")
            } else {
                val bytes = response.body()?.bytes() ?: ByteArray(0)
                AppResult.Success(bytes)
            }
        } catch (t: Throwable) {
            AppResult.Failure(t.message ?: "Failed to export SMS logs", cause = t)
        }
    }

    override suspend fun sendTestSms(phone: String, message: String): AppResult<Unit> {
        return when (
            val result = operationsApiService.sendTestSms(
                TestSmsRequestDto(phone = phone, message = message)
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getStudents(search: String?, status: String): AppResult<List<StudentSummary>> {
        return when (val result = operationsApiService.getStudents(search = search, status = status).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createStudent(student: StudentUpsert): AppResult<StudentSummary> {
        return when (
            val result = operationsApiService.createStudent(student.toRequest()).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateStudent(id: Int, student: StudentUpsert): AppResult<StudentSummary> {
        return when (
            val result = operationsApiService.updateStudent(id = id, request = student.toRequest()).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteStudent(id: Int): AppResult<Unit> {
        return when (val result = operationsApiService.deleteStudent(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun regenerateStudentQrToken(id: Int): AppResult<StudentSummary> {
        return when (val result = operationsApiService.regenerateStudentQrToken(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun bulkAssignStudentsToSection(studentIds: List<Int>, sectionId: Int?): AppResult<Unit> {
        return when (
            val result = operationsApiService.bulkAssignStudentsToSection(
                BulkAssignSectionRequestDto(studentIds = studentIds, sectionId = sectionId)
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun uploadStudentPhoto(
        photoBytes: ByteArray,
        fileName: String,
        mimeType: String,
    ): AppResult<StudentPhotoUploadResult> {
        val requestBody = photoBytes.toRequestBody(mimeType.toMediaTypeOrNull())
        val part = MultipartBody.Part.createFormData("photo", fileName, requestBody)
        return when (val result = operationsApiService.uploadStudentPhoto(part).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun getAttendanceReport(
        reportType: String,
        startDate: String,
        endDate: String,
        grade: String?,
        section: String?,
        studentName: String?,
        studentNo: String?,
    ): AppResult<List<com.myosystems.attendance.core.model.AttendanceReportRow>> {
        val response = when (reportType) {
            "absentees" -> operationsApiService.getAbsenteesReport(
                startDate = startDate,
                endDate = endDate,
                grade = grade,
                section = section,
                studentName = studentName,
                studentNo = studentNo,
            )
            "late-history" -> operationsApiService.getLateHistoryReport(
                startDate = startDate,
                endDate = endDate,
                grade = grade,
                section = section,
                studentName = studentName,
                studentNo = studentNo,
            )
            else -> operationsApiService.getDailyReport(
                startDate = startDate,
                endDate = endDate,
                grade = grade,
                section = section,
                studentName = studentName,
                studentNo = studentNo,
            )
        }

        return when (val result = response.toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSmsUsageReport(
        startDate: String,
        endDate: String,
    ): AppResult<List<com.myosystems.attendance.core.model.SmsUsageReportRow>> {
        return when (
            val result = operationsApiService.getSmsUsageReport(
                startDate = startDate,
                endDate = endDate,
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSmsBillingReport(month: String): AppResult<List<com.myosystems.attendance.core.model.SmsBillingReportRow>> {
        return when (val result = operationsApiService.getSmsBillingReport(month).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun exportReport(
        reportType: String,
        startDate: String?,
        endDate: String?,
        grade: String?,
        section: String?,
        studentName: String?,
        studentNo: String?,
        month: String?,
    ): AppResult<ByteArray> {
        return try {
            val response = operationsApiService.exportReport(
                type = reportType,
                startDate = startDate,
                endDate = endDate,
                grade = grade,
                section = section,
                studentName = studentName,
                studentNo = studentNo,
                month = month,
            )
            if (!response.isSuccessful) {
                AppResult.Failure("Failed to export report")
            } else {
                val bytes = response.body()?.bytes() ?: ByteArray(0)
                AppResult.Success(bytes)
            }
        } catch (t: Throwable) {
            AppResult.Failure(t.message ?: "Failed to export report", cause = t)
        }
    }

    override suspend fun submitManualAttendance(
        studentId: Int,
        action: String,
        timestamp: String?,
    ): AppResult<String> {
        return when (
            val result = operationsApiService.submitManualAttendance(
                ManualAttendanceRequestDto(
                    studentId = studentId,
                    action = action,
                    timestamp = timestamp,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.message ?: "Action completed")
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateAttendanceStatus(
        studentId: Int,
        status: String,
        date: String?,
        note: String?,
    ): AppResult<Unit> {
        return when (
            val result = operationsApiService.updateAttendanceStatus(
                AttendanceStatusRequestDto(
                    studentId = studentId,
                    status = status,
                    date = date,
                    note = note,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    private fun StudentUpsert.toRequest(): StudentUpsertRequestDto = StudentUpsertRequestDto(
        firstName = firstName,
        lastName = lastName,
        studentNo = studentNo,
        gradeLevelId = gradeLevelId,
        sectionId = sectionId,
        guardianName = guardianName,
        guardianPhone = guardianPhone,
        photoUrl = photoUrl,
        isActive = isActive,
    )
}
