package com.myosystems.attendance.domain.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.AuthUser
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.SchoolBranding

interface AuthRepository {
    suspend fun getCurrentUser(): AppResult<AuthUser?>
    suspend fun login(username: String, password: String, schoolSlug: String? = null): AppResult<AuthUser>
    suspend fun logout(): AppResult<Unit>
    suspend fun getSchoolBranding(schoolSlug: String?): AppResult<SchoolBranding>
    suspend fun switchSchool(schoolId: Int): AppResult<Unit>
    suspend fun getSchools(): AppResult<List<PlatformSchool>>
    suspend fun createSchool(
        name: String,
        loginSlug: String?,
        timezone: String,
        lateTime: String,
        cutoffTime: String,
        smsEnabled: Boolean,
        smsProvider: String,
        semaphoreApiKey: String?,
        semaphoreSenderName: String?,
        monthlySmsCredits: Int,
        smsOverageRateCents: Int,
        adminUsername: String?,
        adminPassword: String?,
        adminFullName: String?,
        adminEmail: String?,
    ): AppResult<PlatformSchool>
    suspend fun updateSchool(
        id: Int,
        name: String,
        loginSlug: String?,
        timezone: String,
        lateTime: String,
        cutoffTime: String,
        smsEnabled: Boolean,
        smsProvider: String,
        semaphoreApiKey: String?,
        semaphoreSenderName: String?,
        monthlySmsCredits: Int,
        smsOverageRateCents: Int,
    ): AppResult<PlatformSchool>
    suspend fun deleteSchool(id: Int): AppResult<Unit>
    suspend fun getUsers(schoolId: Int? = null): AppResult<List<PlatformUser>>
    suspend fun createUser(
        username: String,
        password: String,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<PlatformUser>
    suspend fun updateUser(
        id: Int,
        password: String?,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<PlatformUser>
    suspend fun deleteUser(id: Int): AppResult<Unit>
    suspend fun clearSession()
}
