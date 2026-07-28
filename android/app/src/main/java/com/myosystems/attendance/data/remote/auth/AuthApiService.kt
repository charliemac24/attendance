package com.myosystems.attendance.data.remote.auth

import kotlinx.serialization.json.JsonElement
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.DELETE
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query
import retrofit2.http.Path

interface AuthApiService {
    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequestDto,
    ): Response<AuthUserDto>

    @POST("api/auth/logout")
    suspend fun logout(): Response<LogoutResponseDto>

    @GET("api/auth/me")
    suspend fun getCurrentUser(): Response<JsonElement>

    @GET("api/public/school-branding")
    suspend fun getSchoolBranding(
        @Query("school") schoolSlug: String? = null,
    ): Response<SchoolBrandingDto>

    @POST("api/auth/switch-school")
    suspend fun switchSchool(
        @Body request: SwitchSchoolRequestDto,
    ): Response<SwitchSchoolResponseDto>

    @GET("api/schools")
    suspend fun getSchools(): Response<List<PlatformSchoolDto>>

    @POST("api/schools")
    suspend fun createSchool(
        @Body request: PlatformSchoolUpsertRequestDto,
    ): Response<PlatformSchoolDto>

    @PATCH("api/schools/{id}")
    suspend fun updateSchool(
        @Path("id") id: Int,
        @Body request: PlatformSchoolUpsertRequestDto,
    ): Response<PlatformSchoolDto>

    @DELETE("api/schools/{id}")
    suspend fun deleteSchool(
        @Path("id") id: Int,
    ): Response<LogoutResponseDto>

    @GET("api/users")
    suspend fun getUsers(
        @Query("school_id") schoolId: Int? = null,
    ): Response<List<PlatformUserDto>>

    @POST("api/users")
    suspend fun createUser(
        @Body request: PlatformUserUpsertRequestDto,
    ): Response<PlatformUserDto>

    @PATCH("api/users/{id}")
    suspend fun updateUser(
        @Path("id") id: Int,
        @Body request: PlatformUserUpsertRequestDto,
    ): Response<PlatformUserDto>

    @DELETE("api/users/{id}")
    suspend fun deleteUser(
        @Path("id") id: Int,
    ): Response<LogoutResponseDto>
}
