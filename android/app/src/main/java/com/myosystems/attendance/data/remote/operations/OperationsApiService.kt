package com.myosystems.attendance.data.remote.operations

import com.myosystems.attendance.data.remote.scanner.KioskLocationDto
import okhttp3.MultipartBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Part
import retrofit2.http.Query

interface OperationsApiService {
    @GET("api/dashboard")
    suspend fun getDashboard(
        @Query("date") date: String,
    ): Response<DashboardResponseDto>

    @DELETE("api/dashboard/recent-activity")
    suspend fun clearRecentActivity(): Response<ClearRecentActivityResponseDto>

    @GET("api/attendance-intelligence")
    suspend fun getAttendanceIntelligence(
        @Query("date") date: String,
    ): Response<AttendanceIntelligenceResponseDto>

    @GET("api/today/{status}")
    suspend fun getTodayStatus(
        @Path("status") status: String,
        @Query("date") date: String,
        @Query("search") search: String?,
        @Query("grade") grade: String?,
        @Query("section") section: String?,
        @Query("page") page: Int,
    ): Response<TodayAttendanceResponseDto>

    @GET("api/grade-levels")
    suspend fun getGradeLevels(): Response<List<GradeLevelDto>>

    @POST("api/grade-levels")
    suspend fun createGradeLevel(
        @Body request: GradeLevelUpsertRequestDto,
    ): Response<GradeLevelDto>

    @PATCH("api/grade-levels/{id}")
    suspend fun updateGradeLevel(
        @Path("id") id: Int,
        @Body request: GradeLevelUpsertRequestDto,
    ): Response<GradeLevelDto>

    @DELETE("api/grade-levels/{id}")
    suspend fun deleteGradeLevel(
        @Path("id") id: Int,
    ): Response<SimpleSuccessResponseDto>

    @GET("api/sections")
    suspend fun getSections(): Response<List<SectionDto>>

    @POST("api/sections")
    suspend fun createSection(
        @Body request: SectionUpsertRequestDto,
    ): Response<SectionDto>

    @PATCH("api/sections/{id}")
    suspend fun updateSection(
        @Path("id") id: Int,
        @Body request: SectionUpsertRequestDto,
    ): Response<SectionDto>

    @DELETE("api/sections/{id}")
    suspend fun deleteSection(
        @Path("id") id: Int,
    ): Response<SimpleSuccessResponseDto>

    @GET("api/kiosks")
    suspend fun getKiosks(): Response<List<KioskLocationDto>>

    @POST("api/kiosks")
    suspend fun createKiosk(
        @Body request: KioskUpsertRequestDto,
    ): Response<KioskLocationDto>

    @PATCH("api/kiosks/{id}")
    suspend fun updateKiosk(
        @Path("id") id: Int,
        @Body request: KioskUpsertRequestDto,
    ): Response<KioskLocationDto>

    @DELETE("api/kiosks/{id}")
    suspend fun deleteKiosk(
        @Path("id") id: Int,
    ): Response<SimpleSuccessResponseDto>

    @GET("api/holidays")
    suspend fun getHolidays(): Response<List<SchoolHolidayDto>>

    @POST("api/holidays")
    suspend fun createHoliday(
        @Body request: HolidayUpsertRequestDto,
    ): Response<SchoolHolidayDto>

    @PATCH("api/holidays/{id}")
    suspend fun updateHoliday(
        @Path("id") id: Int,
        @Body request: HolidayUpsertRequestDto,
    ): Response<SchoolHolidayDto>

    @DELETE("api/holidays/{id}")
    suspend fun deleteHoliday(
        @Path("id") id: Int,
    ): Response<SimpleSuccessResponseDto>

    @GET("api/settings/school")
    suspend fun getSchoolSettings(): Response<SchoolSettingsSummaryDto>

    @PATCH("api/settings/school")
    suspend fun updateSchoolSettings(
        @Body request: SchoolSettingsUpdateRequestDto,
    ): Response<SchoolSettingsSummaryDto>

    @Multipart
    @POST("api/settings/school/logo")
    suspend fun uploadSchoolLogo(
        @Part logo: MultipartBody.Part,
    ): Response<SchoolLogoUploadResponseDto>

    @POST("api/settings/school/generate-student-qr-tokens")
    suspend fun generateStudentQrTokens(): Response<BulkQrGenerationResponseDto>

    @POST("api/settings/purge-logs")
    suspend fun purgeLogs(
        @Body request: PurgeLogsRequestDto,
    ): Response<PurgeLogsResponseDto>

    @GET("api/sms-templates")
    suspend fun getSmsTemplates(): Response<List<SmsTemplateDto>>

    @PATCH("api/sms-templates/{id}")
    suspend fun updateSmsTemplate(
        @Path("id") id: Int,
        @Body request: SmsTemplateUpdateRequestDto,
    ): Response<SmsTemplateDto>

    @GET("api/sms-logs")
    suspend fun getSmsLogs(
        @Query("from") from: String,
        @Query("to") to: String,
    ): Response<List<SmsLogEntryDto>>

    @GET("api/sms-logs/export")
    suspend fun exportSmsLogs(
        @Query("from") from: String,
        @Query("to") to: String,
    ): Response<ResponseBody>

    @POST("api/sms/test")
    suspend fun sendTestSms(
        @Body request: TestSmsRequestDto,
    ): Response<TestSmsResponseDto>

    @GET("api/students")
    suspend fun getStudents(
        @Query("search") search: String?,
        @Query("status") status: String,
    ): Response<List<StudentSummaryDto>>

    @POST("api/students")
    suspend fun createStudent(
        @Body request: StudentUpsertRequestDto,
    ): Response<StudentSummaryDto>

    @PATCH("api/students/{id}")
    suspend fun updateStudent(
        @Path("id") id: Int,
        @Body request: StudentUpsertRequestDto,
    ): Response<StudentSummaryDto>

    @DELETE("api/students/{id}")
    suspend fun deleteStudent(
        @Path("id") id: Int,
    ): Response<SimpleSuccessResponseDto>

    @POST("api/students/{id}/regenerate-qr-token")
    suspend fun regenerateStudentQrToken(
        @Path("id") id: Int,
    ): Response<StudentSummaryDto>

    @POST("api/students/bulk-assign-section")
    suspend fun bulkAssignStudentsToSection(
        @Body request: BulkAssignSectionRequestDto,
    ): Response<SimpleSuccessResponseDto>

    @Multipart
    @POST("api/students/photo")
    suspend fun uploadStudentPhoto(
        @Part photo: MultipartBody.Part,
    ): Response<StudentPhotoUploadResponseDto>

    @GET("api/reports/daily")
    suspend fun getDailyReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
        @Query("grade") grade: String?,
        @Query("section") section: String?,
        @Query("studentName") studentName: String?,
        @Query("studentNo") studentNo: String?,
    ): Response<List<AttendanceReportRowDto>>

    @GET("api/reports/absentees")
    suspend fun getAbsenteesReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
        @Query("grade") grade: String?,
        @Query("section") section: String?,
        @Query("studentName") studentName: String?,
        @Query("studentNo") studentNo: String?,
    ): Response<List<AttendanceReportRowDto>>

    @GET("api/reports/late-history")
    suspend fun getLateHistoryReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
        @Query("grade") grade: String?,
        @Query("section") section: String?,
        @Query("studentName") studentName: String?,
        @Query("studentNo") studentNo: String?,
    ): Response<List<AttendanceReportRowDto>>

    @GET("api/reports/sms-usage")
    suspend fun getSmsUsageReport(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String,
    ): Response<List<SmsUsageReportRowDto>>

    @GET("api/reports/sms-billing")
    suspend fun getSmsBillingReport(
        @Query("month") month: String,
    ): Response<List<SmsBillingReportRowDto>>

    @GET("api/reports/{type}/export")
    suspend fun exportReport(
        @Path("type") type: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("grade") grade: String? = null,
        @Query("section") section: String? = null,
        @Query("studentName") studentName: String? = null,
        @Query("studentNo") studentNo: String? = null,
        @Query("month") month: String? = null,
    ): Response<ResponseBody>

    @POST("api/attendance/manual")
    suspend fun submitManualAttendance(
        @Body request: ManualAttendanceRequestDto,
    ): Response<ManualAttendanceResponseDto>

    @POST("api/attendance/status")
    suspend fun updateAttendanceStatus(
        @Body request: AttendanceStatusRequestDto,
    ): Response<SimpleSuccessResponseDto>
}
