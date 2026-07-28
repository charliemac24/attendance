package com.myosystems.attendance.data.remote.auth

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequestDto(
    @SerialName("username") val username: String,
    @SerialName("password") val password: String,
    @SerialName("schoolSlug") val schoolSlug: String? = null,
)

@Serializable
data class AuthUserDto(
    @SerialName("id") val id: Int,
    @SerialName("username") val username: String,
    @SerialName("email") val email: String? = null,
    @SerialName("fullName") val fullName: String,
    @SerialName("role") val role: String,
    @SerialName("schoolId") val schoolId: Int? = null,
    @SerialName("selectedSchoolId") val selectedSchoolId: Int? = null,
    @SerialName("school") val school: SchoolDto? = null,
)

@Serializable
data class SchoolDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("loginSlug") val loginSlug: String? = null,
    @SerialName("logoUrl") val logoUrl: String? = null,
    @SerialName("timezone") val timezone: String? = null,
)

@Serializable
data class PlatformSchoolDto(
    @SerialName("id") val id: Int,
    @SerialName("name") val name: String,
    @SerialName("timezone") val timezone: String? = null,
    @SerialName("lateTime") val lateTime: String? = null,
    @SerialName("cutoffTime") val cutoffTime: String? = null,
    @SerialName("smsEnabled") val smsEnabled: Boolean = false,
    @SerialName("smsProvider") val smsProvider: String? = null,
    @SerialName("semaphoreApiKey") val semaphoreApiKey: String? = null,
    @SerialName("semaphoreSenderName") val semaphoreSenderName: String? = null,
    @SerialName("monthlySmsCredits") val monthlySmsCredits: Int = 0,
    @SerialName("smsOverageRateCents") val smsOverageRateCents: Int = 0,
    @SerialName("loginSlug") val loginSlug: String? = null,
)

@Serializable
data class PlatformUserDto(
    @SerialName("id") val id: Int,
    @SerialName("username") val username: String,
    @SerialName("email") val email: String? = null,
    @SerialName("fullName") val fullName: String,
    @SerialName("role") val role: String,
    @SerialName("schoolId") val schoolId: Int? = null,
    @SerialName("teacherSectionIds") val teacherSectionIds: List<Int> = emptyList(),
)

@Serializable
data class SwitchSchoolRequestDto(
    @SerialName("schoolId") val schoolId: Int,
)

@Serializable
data class SwitchSchoolResponseDto(
    @SerialName("ok") val ok: Boolean,
    @SerialName("school") val school: SchoolDto? = null,
)

@Serializable
data class PlatformSchoolUpsertRequestDto(
    @SerialName("name") val name: String,
    @SerialName("loginSlug") val loginSlug: String? = null,
    @SerialName("timezone") val timezone: String = "Asia/Manila",
    @SerialName("lateTime") val lateTime: String,
    @SerialName("cutoffTime") val cutoffTime: String,
    @SerialName("smsEnabled") val smsEnabled: Boolean,
    @SerialName("smsProvider") val smsProvider: String,
    @SerialName("semaphoreApiKey") val semaphoreApiKey: String? = null,
    @SerialName("semaphoreSenderName") val semaphoreSenderName: String? = null,
    @SerialName("monthlySmsCredits") val monthlySmsCredits: Int,
    @SerialName("smsOverageRateCents") val smsOverageRateCents: Int,
    @SerialName("adminUsername") val adminUsername: String? = null,
    @SerialName("adminPassword") val adminPassword: String? = null,
    @SerialName("adminFullName") val adminFullName: String? = null,
    @SerialName("adminEmail") val adminEmail: String? = null,
)

@Serializable
data class PlatformUserUpsertRequestDto(
    @SerialName("username") val username: String? = null,
    @SerialName("password") val password: String? = null,
    @SerialName("fullName") val fullName: String,
    @SerialName("email") val email: String? = null,
    @SerialName("role") val role: String,
    @SerialName("schoolId") val schoolId: Int? = null,
    @SerialName("teacherSectionIds") val teacherSectionIds: List<Int> = emptyList(),
)

@Serializable
data class SchoolBrandingDto(
    @SerialName("school") val school: SchoolDto? = null,
    @SerialName("displayName") val displayName: String,
    @SerialName("logoUrl") val logoUrl: String? = null,
)

@Serializable
data class LogoutResponseDto(
    @SerialName("ok") val ok: Boolean,
)
