package com.myosystems.attendance.data.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.auth.SessionCookieJar
import com.myosystems.attendance.core.network.ApiErrorParser
import com.myosystems.attendance.core.network.toAppResult
import com.myosystems.attendance.data.remote.auth.AuthApiService
import com.myosystems.attendance.data.remote.auth.AuthUserDto
import com.myosystems.attendance.data.remote.auth.LoginRequestDto
import com.myosystems.attendance.data.remote.auth.PlatformSchoolUpsertRequestDto
import com.myosystems.attendance.data.remote.auth.PlatformUserUpsertRequestDto
import com.myosystems.attendance.data.remote.auth.SwitchSchoolRequestDto
import com.myosystems.attendance.data.remote.auth.toDomain
import com.myosystems.attendance.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApiService: AuthApiService,
    private val apiErrorParser: ApiErrorParser,
    private val sessionCookieJar: SessionCookieJar,
    private val json: Json,
) : AuthRepository {
    override suspend fun getCurrentUser(): AppResult<com.myosystems.attendance.core.model.AuthUser?> {
        return when (val result = authApiService.getCurrentUser().toAppResult(apiErrorParser)) {
            is AppResult.Success -> {
                if (result.data is JsonNull) {
                    AppResult.Success(null)
                } else {
                    AppResult.Success(
                        json.decodeFromJsonElement(AuthUserDto.serializer(), result.data).toDomain()
                    )
                }
            }
            is AppResult.Failure -> result
        }
    }

    override suspend fun login(username: String, password: String, schoolSlug: String?): AppResult<com.myosystems.attendance.core.model.AuthUser> {
        return when (val result = authApiService.login(LoginRequestDto(username, password, schoolSlug)).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun logout(): AppResult<Unit> {
        val response = authApiService.logout().toAppResult(apiErrorParser)
        sessionCookieJar.clear()
        return when (response) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> response
        }
    }

    override suspend fun getSchoolBranding(schoolSlug: String?): AppResult<com.myosystems.attendance.core.model.SchoolBranding> {
        return when (val result = authApiService.getSchoolBranding(schoolSlug?.takeIf { it.isNotBlank() }).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun switchSchool(schoolId: Int): AppResult<Unit> {
        return when (val result = authApiService.switchSchool(SwitchSchoolRequestDto(schoolId)).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getSchools(): AppResult<List<com.myosystems.attendance.core.model.PlatformSchool>> {
        return when (val result = authApiService.getSchools().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createSchool(
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
    ): AppResult<com.myosystems.attendance.core.model.PlatformSchool> {
        return when (
            val result = authApiService.createSchool(
                PlatformSchoolUpsertRequestDto(
                    name = name,
                    loginSlug = loginSlug,
                    timezone = timezone,
                    lateTime = lateTime,
                    cutoffTime = cutoffTime,
                    smsEnabled = smsEnabled,
                    smsProvider = smsProvider,
                    semaphoreApiKey = semaphoreApiKey,
                    semaphoreSenderName = semaphoreSenderName,
                    monthlySmsCredits = monthlySmsCredits,
                    smsOverageRateCents = smsOverageRateCents,
                    adminUsername = adminUsername,
                    adminPassword = adminPassword,
                    adminFullName = adminFullName,
                    adminEmail = adminEmail,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateSchool(
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
    ): AppResult<com.myosystems.attendance.core.model.PlatformSchool> {
        return when (
            val result = authApiService.updateSchool(
                id = id,
                request = PlatformSchoolUpsertRequestDto(
                    name = name,
                    loginSlug = loginSlug,
                    timezone = timezone,
                    lateTime = lateTime,
                    cutoffTime = cutoffTime,
                    smsEnabled = smsEnabled,
                    smsProvider = smsProvider,
                    semaphoreApiKey = semaphoreApiKey,
                    semaphoreSenderName = semaphoreSenderName,
                    monthlySmsCredits = monthlySmsCredits,
                    smsOverageRateCents = smsOverageRateCents,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteSchool(id: Int): AppResult<Unit> {
        return when (val result = authApiService.deleteSchool(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun getUsers(schoolId: Int?): AppResult<List<com.myosystems.attendance.core.model.PlatformUser>> {
        return when (val result = authApiService.getUsers(schoolId).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun createUser(
        username: String,
        password: String,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<com.myosystems.attendance.core.model.PlatformUser> {
        return when (
            val result = authApiService.createUser(
                PlatformUserUpsertRequestDto(
                    username = username,
                    password = password,
                    fullName = fullName,
                    email = email,
                    role = role,
                    schoolId = schoolId,
                    teacherSectionIds = teacherSectionIds,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun updateUser(
        id: Int,
        password: String?,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<com.myosystems.attendance.core.model.PlatformUser> {
        return when (
            val result = authApiService.updateUser(
                id = id,
                request = PlatformUserUpsertRequestDto(
                    password = password,
                    fullName = fullName,
                    email = email,
                    role = role,
                    schoolId = schoolId,
                    teacherSectionIds = teacherSectionIds,
                )
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }

    override suspend fun deleteUser(id: Int): AppResult<Unit> {
        return when (val result = authApiService.deleteUser(id).toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(Unit)
            is AppResult.Failure -> result
        }
    }

    override suspend fun clearSession() {
        sessionCookieJar.clear()
    }
}
