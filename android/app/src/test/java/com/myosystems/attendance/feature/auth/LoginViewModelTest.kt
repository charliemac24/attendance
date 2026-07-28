package com.myosystems.attendance.feature.auth

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.AuthUser
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.SchoolBranding
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.domain.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    private val dispatchersProvider = object : DispatchersProvider {
        override val io = dispatcher
        override val default = dispatcher
        override val main = dispatcher
    }

    @Test
    fun `login requires username`() = runTest(dispatcher) {
        Dispatchers.setMain(dispatcher)
        val viewModel = LoginViewModel(FakeAuthRepository(), dispatchersProvider)

        viewModel.login()
        advanceUntilIdle()

        assertEquals("Username is required.", viewModel.uiState.value.errorMessage)
        Dispatchers.resetMain()
    }

    @Test
    fun `successful login clears submitting state`() = runTest(dispatcher) {
        Dispatchers.setMain(dispatcher)
        val repo = FakeAuthRepository(
            loginResult = AppResult.Success(
                AuthUser(
                    id = 1,
                    username = "gate",
                    email = null,
                    fullName = "Gate Staff",
                    role = UserRole.GATE_STAFF,
                    schoolId = 2,
                    selectedSchoolId = 2,
                    school = null,
                )
            )
        )
        val viewModel = LoginViewModel(repo, dispatchersProvider)
        viewModel.updateUsername("gate")
        viewModel.updatePassword("secret")

        viewModel.login()
        advanceUntilIdle()

        assertTrue(!viewModel.uiState.value.isSubmitting)
        assertEquals(null, viewModel.uiState.value.errorMessage)
        Dispatchers.resetMain()
    }
}

private class FakeAuthRepository(
    private val loginResult: AppResult<AuthUser> = AppResult.Failure("Invalid credentials"),
) : AuthRepository {
    override suspend fun getCurrentUser(): AppResult<AuthUser?> = AppResult.Success(null)

    override suspend fun login(username: String, password: String): AppResult<AuthUser> = loginResult

    override suspend fun logout(): AppResult<Unit> = AppResult.Success(Unit)

    override suspend fun getSchoolBranding(schoolSlug: String?): AppResult<SchoolBranding> = AppResult.Success(
        SchoolBranding(
            school = null,
            displayName = "MYO School Attendance",
            logoUrl = null,
        )
    )

    override suspend fun switchSchool(schoolId: Int): AppResult<Unit> = AppResult.Success(Unit)

    override suspend fun getSchools(): AppResult<List<PlatformSchool>> = AppResult.Success(emptyList())

    override suspend fun createSchool(
        name: String,
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
    ): AppResult<PlatformSchool> = AppResult.Failure("Not used in test")

    override suspend fun updateSchool(
        id: Int,
        name: String,
        timezone: String,
        lateTime: String,
        cutoffTime: String,
        smsEnabled: Boolean,
        smsProvider: String,
        semaphoreApiKey: String?,
        semaphoreSenderName: String?,
        monthlySmsCredits: Int,
        smsOverageRateCents: Int,
    ): AppResult<PlatformSchool> = AppResult.Failure("Not used in test")

    override suspend fun deleteSchool(id: Int): AppResult<Unit> = AppResult.Success(Unit)

    override suspend fun getUsers(schoolId: Int?): AppResult<List<PlatformUser>> = AppResult.Success(emptyList())

    override suspend fun createUser(
        username: String,
        password: String,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<PlatformUser> = AppResult.Failure("Not used in test")

    override suspend fun updateUser(
        id: Int,
        password: String?,
        fullName: String,
        email: String?,
        role: String,
        schoolId: Int?,
        teacherSectionIds: List<Int>,
    ): AppResult<PlatformUser> = AppResult.Failure("Not used in test")

    override suspend fun deleteUser(id: Int): AppResult<Unit> = AppResult.Success(Unit)

    override suspend fun clearSession() = Unit
}
