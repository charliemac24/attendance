package com.myosystems.attendance.data.remote.operations

import com.myosystems.attendance.core.model.AtRiskStudent
import com.myosystems.attendance.core.model.AttendanceIntelligence
import com.myosystems.attendance.core.model.AttendanceRecord
import com.myosystems.attendance.core.model.AttendanceReportRow
import com.myosystems.attendance.core.model.AttendanceRiskSummary
import com.myosystems.attendance.core.model.BulkQrGenerationResult
import com.myosystems.attendance.core.model.DashboardKpis
import com.myosystems.attendance.core.model.DashboardSmsCredits
import com.myosystems.attendance.core.model.DashboardSummary
import com.myosystems.attendance.core.model.GradeAttendanceBreakdown
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.PurgeLogsResult
import com.myosystems.attendance.core.model.RecentAttendanceEvent
import com.myosystems.attendance.core.model.SchoolHoliday
import com.myosystems.attendance.core.model.SchoolSettings
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.SmsBillingReportRow
import com.myosystems.attendance.core.model.SmsLogEntry
import com.myosystems.attendance.core.model.SmsTemplateItem
import com.myosystems.attendance.core.model.SmsUsageReportRow
import com.myosystems.attendance.core.model.StudentPhotoUploadResult
import com.myosystems.attendance.core.model.StudentSummary
import com.myosystems.attendance.core.model.TodayAttendancePage
import com.myosystems.attendance.core.network.resolveApiUrl

fun DashboardResponseDto.toDomain(): DashboardSummary = DashboardSummary(
    date = date,
    kpis = kpis.toDomain(),
    smsCredits = smsCredits.toDomain(),
    recentEvents = recentEvents.map { it.toDomain() },
    gradeBreakdown = gradeBreakdown.map { it.toDomain() },
    missedCheckoutsPreviousDay = missedCheckoutsPreviousDay.map { it.toDomain() },
)

fun DashboardKpisDto.toDomain(): DashboardKpis = DashboardKpis(
    checkedOut = checkedOut,
    lateArrivals = lateArrivals,
    onCampus = onCampus,
    absent = absent,
    notCheckedIn = notCheckedIn,
    total = total,
)

fun DashboardSmsCreditsDto.toDomain(): DashboardSmsCredits = DashboardSmsCredits(
    month = month,
    monthlyCredits = monthlyCredits,
    usedCredits = usedCredits,
    remainingCredits = remainingCredits,
    overageCount = overageCount,
)

fun RecentAttendanceEventDto.toDomain(): RecentAttendanceEvent = RecentAttendanceEvent(
    id = id,
    studentName = studentName,
    eventType = eventType,
    occurredAt = occurredAt,
)

fun GradeAttendanceBreakdownDto.toDomain(): GradeAttendanceBreakdown = GradeAttendanceBreakdown(
    gradeLevel = gradeLevel,
    totalStudents = totalStudents,
    checkedIn = checkedIn,
    checkedOut = checkedOut,
    attendanceRate = attendanceRate,
    lateArrivals = lateArrivals,
    absent = absent,
    onCampus = onCampus,
    notCheckedIn = notCheckedIn,
)

fun AttendanceIntelligenceResponseDto.toDomain(): AttendanceIntelligence = AttendanceIntelligence(
    startDate = window.startDate,
    endDate = window.endDate,
    summary = AttendanceRiskSummary(
        totalStudents = summary.totalStudents,
        atRiskCount = summary.atRiskCount,
    ),
    atRiskStudents = atRiskStudents.map { it.toDomain() },
)

fun AtRiskStudentDto.toDomain(): AtRiskStudent = AtRiskStudent(
    studentId = studentId,
    studentNo = studentNo,
    studentName = studentName,
    gradeLevel = gradeLevel,
    section = section,
    score = score,
    trend = trend,
    riskFlags = riskFlags,
)

fun AttendanceRecordDto.toDomain(): AttendanceRecord = AttendanceRecord(
    id = id,
    studentId = studentId,
    studentName = studentName.ifBlank { "Unknown student" },
    studentNo = studentNo.ifBlank { "-" },
    gradeLevel = gradeLevel?.ifBlank { null } ?: "Unassigned",
    section = section?.ifBlank { null } ?: "-",
    checkInTime = checkInTime,
    checkOutTime = checkOutTime,
    status = status,
    guardianPhone = guardianPhone,
    missedCheckoutYesterday = missedCheckoutYesterday,
)

fun TodayAttendanceResponseDto.toDomain(): TodayAttendancePage = TodayAttendancePage(
    records = records.map { it.toDomain() },
    total = total,
    page = page,
    pageSize = pageSize,
)

fun GradeLevelDto.toDomain(): GradeLevelSummary = GradeLevelSummary(
    id = id,
    name = name,
    lateTimeOverride = lateTimeOverride,
    fridayLateTimeOverride = fridayLateTimeOverride,
    lateTimeOverridesByWeekday = lateTimeOverridesByWeekday,
)

fun SectionDto.toDomain(): SectionSummary = SectionSummary(
    id = id,
    name = name,
    gradeLevelId = gradeLevelId,
    gradeLevelName = gradeLevelName,
    lateTimeOverride = lateTimeOverride,
    fridayLateTimeOverride = fridayLateTimeOverride,
    lateTimeOverridesByWeekday = lateTimeOverridesByWeekday,
)

fun SchoolHolidayDto.toDomain(): SchoolHoliday = SchoolHoliday(
    id = id,
    schoolId = schoolId,
    date = date,
    name = name,
    type = type,
    isRecurring = isRecurring,
)

fun SchoolSettingsSummaryDto.toDomain(): SchoolSettings = SchoolSettings(
    id = id,
    name = name,
    loginSlug = loginSlug,
    logoUrl = resolveApiUrl(logoUrl),
    timezone = timezone,
    lateTime = lateTime,
    cutoffTime = cutoffTime,
    smsEnabled = smsEnabled,
    smsProvider = smsProvider,
    semaphoreApiKey = semaphoreApiKey,
    semaphoreSenderName = semaphoreSenderName,
    absentSmsEnabled = absentSmsEnabled,
    minScanIntervalSeconds = minScanIntervalSeconds,
    dismissalTime = dismissalTime,
    earlyOutWindowMinutes = earlyOutWindowMinutes,
    showStudentsNeedingAttention = showStudentsNeedingAttention,
)

fun BulkQrGenerationResponseDto.toDomain(): BulkQrGenerationResult = BulkQrGenerationResult(
    updated = updated,
)

fun PurgeLogsResponseDto.toDomain(): PurgeLogsResult = PurgeLogsResult(
    schoolId = schoolId,
    from = from,
    to = to,
    attendanceEventsDeleted = attendanceEventsDeleted,
    dailyAttendancesDeleted = dailyAttendancesDeleted,
    smsLogsDeleted = smsLogsDeleted,
)

fun StudentSummaryDto.toDomain(): StudentSummary = StudentSummary(
    id = id,
    schoolId = schoolId,
    studentNo = studentNo,
    firstName = firstName,
    lastName = lastName,
    gradeLevelId = gradeLevelId,
    sectionId = sectionId,
    guardianName = guardianName,
    guardianPhone = guardianPhone,
    photoUrl = resolveApiUrl(photoUrl),
    qrToken = qrToken,
    isActive = isActive,
    gradeLevelName = gradeLevelName,
    sectionName = sectionName,
    currentDayStatus = currentDayStatus,
)

fun StudentPhotoUploadResponseDto.toDomain(): StudentPhotoUploadResult = StudentPhotoUploadResult(
    photoUrl = resolveApiUrl(photoUrl).orEmpty(),
)

fun AttendanceReportRowDto.toDomain(): AttendanceReportRow = AttendanceReportRow(
    attendanceId = attendanceId,
    studentId = studentId,
    studentName = studentName.ifBlank { "Unknown student" },
    studentNo = studentNo.ifBlank { "-" },
    gradeLevel = gradeLevel?.ifBlank { null } ?: "Unassigned",
    section = section?.ifBlank { null } ?: "-",
    date = date,
    checkInTime = checkInTime,
    checkOutTime = checkOutTime,
    status = status,
    isLate = isLate,
)

fun SmsUsageReportRowDto.toDomain(): SmsUsageReportRow = SmsUsageReportRow(
    date = date,
    total = total,
    sent = sent,
    failed = failed,
    queued = queued,
    submitted = submitted,
    retryWait = retryWait,
)

fun SmsBillingReportRowDto.toDomain(): SmsBillingReportRow = SmsBillingReportRow(
    schoolId = schoolId,
    schoolName = schoolName,
    month = month,
    sentCount = sentCount,
    monthlySmsCredits = monthlySmsCredits,
    excessCount = excessCount,
    smsOverageRateCents = smsOverageRateCents,
    overageAmountCents = overageAmountCents,
)

fun SmsTemplateDto.toDomain(): SmsTemplateItem = SmsTemplateItem(
    id = id,
    schoolId = schoolId,
    type = type,
    enabled = enabled,
    templateText = templateText,
)

fun SmsLogEntryDto.toDomain(): SmsLogEntry = SmsLogEntry(
    id = id,
    schoolId = schoolId,
    studentId = studentId,
    templateType = templateType,
    toPhone = toPhone,
    message = message,
    status = status,
    providerMessageId = providerMessageId,
    providerResponse = providerResponse?.toString(),
    sentAt = sentAt,
    errorMessage = errorMessage,
    createdAt = createdAt,
    studentName = studentName,
)
