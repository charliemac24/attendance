package com.myosystems.attendance.core.model

data class AuthUser(
    val id: Int,
    val username: String,
    val email: String?,
    val fullName: String,
    val role: UserRole,
    val schoolId: Int?,
    val selectedSchoolId: Int?,
    val school: SchoolSummary?,
)

data class SchoolSummary(
    val id: Int,
    val name: String,
    val loginSlug: String?,
    val logoUrl: String?,
    val timezone: String? = null,
)

data class PlatformSchool(
    val id: Int,
    val name: String,
    val timezone: String?,
    val lateTime: String?,
    val cutoffTime: String?,
    val smsEnabled: Boolean,
    val smsProvider: String?,
    val semaphoreApiKey: String?,
    val semaphoreSenderName: String?,
    val monthlySmsCredits: Int,
    val smsOverageRateCents: Int,
    val loginSlug: String?,
)

data class PlatformUser(
    val id: Int,
    val username: String,
    val email: String?,
    val fullName: String,
    val role: UserRole,
    val schoolId: Int?,
    val teacherSectionIds: List<Int> = emptyList(),
)

data class SchoolBranding(
    val school: SchoolSummary?,
    val displayName: String,
    val logoUrl: String?,
)
