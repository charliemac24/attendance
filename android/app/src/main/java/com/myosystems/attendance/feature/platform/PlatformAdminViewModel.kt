package com.myosystems.attendance.feature.platform

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.AuthUser
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.domain.repository.AuthRepository
import com.myosystems.attendance.domain.repository.OperationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class PlatformAdminViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val operationsRepository: OperationsRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(PlatformAdminUiState())
    val uiState: StateFlow<PlatformAdminUiState> = _uiState.asStateFlow()

    private val _dialogState = MutableStateFlow<PlatformDialogState>(PlatformDialogState.None)
    val dialogState: StateFlow<PlatformDialogState> = _dialogState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    init {
        refresh()
    }

    fun refresh() = loadData(refreshing = false)

    fun pullToRefresh() = loadData(refreshing = true)

    fun selectTab(tab: PlatformTab) {
        if (!_uiState.value.availableTabs.contains(tab)) return
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    fun switchSchool(schoolId: Int, onRefreshSession: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            when (withContext(dispatchersProvider.io) { authRepository.switchSchool(schoolId) }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(isSaving = false, selectedSchoolId = schoolId)
                    _messages.emit("School scope updated")
                    onRefreshSession()
                    loadData(refreshing = true)
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    _messages.emit("Unable to switch school")
                }
            }
        }
    }

    fun openNewSchoolDialog() {
        _dialogState.value = PlatformDialogState.SchoolEditor()
    }

    fun openEditSchoolDialog(id: Int) {
        val school = _uiState.value.schools.firstOrNull { it.id == id } ?: return
        _dialogState.value = PlatformDialogState.SchoolEditor(
            schoolId = school.id,
            name = school.name,
            loginSlug = school.loginSlug.orEmpty(),
            timezone = school.timezone ?: "Asia/Manila",
            lateTime = school.lateTime?.take(5) ?: "08:00",
            cutoffTime = school.cutoffTime?.take(5) ?: "09:00",
            smsEnabled = school.smsEnabled,
            smsProvider = school.smsProvider ?: "semaphore",
            monthlySmsCredits = school.monthlySmsCredits.toString(),
            smsOverageRateCents = school.smsOverageRateCents.toString(),
        )
    }

    fun updateSchoolDraft(transform: (PlatformDialogState.SchoolEditor) -> PlatformDialogState.SchoolEditor) {
        val current = _dialogState.value as? PlatformDialogState.SchoolEditor ?: return
        _dialogState.value = transform(current)
    }

    fun saveSchool() {
        val draft = _dialogState.value as? PlatformDialogState.SchoolEditor ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.schoolId == null) {
                    authRepository.createSchool(
                        name = draft.name.trim(),
                        loginSlug = draft.loginSlug.trim().ifBlank { null },
                        timezone = draft.timezone.trim(),
                        lateTime = draft.lateTime.trim(),
                        cutoffTime = draft.cutoffTime.trim(),
                        smsEnabled = draft.smsEnabled,
                        smsProvider = draft.smsProvider.trim(),
                        semaphoreApiKey = null,
                        semaphoreSenderName = null,
                        monthlySmsCredits = draft.monthlySmsCredits.toIntOrNull() ?: 0,
                        smsOverageRateCents = draft.smsOverageRateCents.toIntOrNull() ?: 150,
                        adminUsername = draft.adminUsername.trim().ifBlank { null },
                        adminPassword = draft.adminPassword.ifBlank { null },
                        adminFullName = draft.adminFullName.trim().ifBlank { null },
                        adminEmail = draft.adminEmail.trim().ifBlank { null },
                    )
                } else {
                    authRepository.updateSchool(
                        id = draft.schoolId,
                        name = draft.name.trim(),
                        loginSlug = draft.loginSlug.trim().ifBlank { null },
                        timezone = draft.timezone.trim(),
                        lateTime = draft.lateTime.trim(),
                        cutoffTime = draft.cutoffTime.trim(),
                        smsEnabled = draft.smsEnabled,
                        smsProvider = draft.smsProvider.trim(),
                        semaphoreApiKey = null,
                        semaphoreSenderName = null,
                        monthlySmsCredits = draft.monthlySmsCredits.toIntOrNull() ?: 0,
                        smsOverageRateCents = draft.smsOverageRateCents.toIntOrNull() ?: 150,
                    )
                }
            }
            handleMutationResult(result, if (draft.schoolId == null) "School created" else "School updated")
        }
    }

    fun confirmDeleteSchool(id: Int) {
        val school = _uiState.value.schools.firstOrNull { it.id == id } ?: return
        _dialogState.value = PlatformDialogState.DeleteConfirmation(
            title = "Delete school",
            message = "Delete ${school.name}?",
            kind = "school",
            targetId = id,
        )
    }

    fun openNewUserDialog() {
        _dialogState.value = PlatformDialogState.UserEditor(
            schoolId = _uiState.value.selectedSchoolId?.toString().orEmpty(),
        )
    }

    fun openEditUserDialog(id: Int) {
        val user = _uiState.value.users.firstOrNull { it.id == id } ?: return
        _dialogState.value = PlatformDialogState.UserEditor(
            userId = user.id,
            username = user.username,
            fullName = user.fullName,
            email = user.email.orEmpty(),
            role = user.role.backendValue,
            schoolId = user.schoolId?.toString().orEmpty(),
            teacherSectionIds = user.teacherSectionIds,
            isEdit = true,
        )
    }

    fun updateUserDraft(transform: (PlatformDialogState.UserEditor) -> PlatformDialogState.UserEditor) {
        val current = _dialogState.value as? PlatformDialogState.UserEditor ?: return
        _dialogState.value = transform(current)
    }

    fun saveUser() {
        val draft = _dialogState.value as? PlatformDialogState.UserEditor ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val result = withContext(dispatchersProvider.io) {
                if (draft.userId == null) {
                    authRepository.createUser(
                        username = draft.username.trim(),
                        password = draft.password,
                        fullName = draft.fullName.trim(),
                        email = draft.email.trim().ifBlank { null },
                        role = draft.role,
                        schoolId = draft.schoolId.toIntOrNull(),
                        teacherSectionIds = draft.teacherSectionIds,
                    )
                } else {
                    authRepository.updateUser(
                        id = draft.userId,
                        password = draft.password.ifBlank { null },
                        fullName = draft.fullName.trim(),
                        email = draft.email.trim().ifBlank { null },
                        role = draft.role,
                        schoolId = draft.schoolId.toIntOrNull(),
                        teacherSectionIds = draft.teacherSectionIds,
                    )
                }
            }
            handleMutationResult(result, if (draft.userId == null) "User created" else "User updated")
        }
    }

    fun confirmDeleteUser(id: Int) {
        val user = _uiState.value.users.firstOrNull { it.id == id } ?: return
        _dialogState.value = PlatformDialogState.DeleteConfirmation(
            title = "Delete user",
            message = "Delete ${user.fullName}?",
            kind = "user",
            targetId = id,
        )
    }

    fun confirmDelete() {
        val dialog = _dialogState.value as? PlatformDialogState.DeleteConfirmation ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDeleting = true)
            val result = withContext(dispatchersProvider.io) {
                when (dialog.kind) {
                    "school" -> authRepository.deleteSchool(dialog.targetId)
                    else -> authRepository.deleteUser(dialog.targetId)
                }
            }
            when (result) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(isDeleting = false)
                    _dialogState.value = PlatformDialogState.None
                    _messages.emit(if (dialog.kind == "school") "School deleted" else "User deleted")
                    loadData(refreshing = true)
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isDeleting = false)
                    _messages.emit(result.message)
                }
            }
        }
    }

    fun dismissDialog() {
        _dialogState.value = PlatformDialogState.None
    }

    private fun loadData(refreshing: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )

            val userResult = withContext(dispatchersProvider.io) { authRepository.getCurrentUser() }
            val currentUser = (userResult as? AppResult.Success<AuthUser?>)?.data
            val currentUserRole = currentUser?.role ?: UserRole.UNKNOWN
            val selectedSchoolId = when (currentUserRole) {
                UserRole.SUPER_ADMIN -> currentUser?.selectedSchoolId
                else -> currentUser?.schoolId
            }
            val canManageSchools = currentUserRole == UserRole.SUPER_ADMIN
            val canSwitchSchool = currentUserRole == UserRole.SUPER_ADMIN
            val canAssignSchool = currentUserRole == UserRole.SUPER_ADMIN
            val availableTabs = if (currentUserRole == UserRole.SUPER_ADMIN) {
                PlatformTab.entries
            } else {
                listOf(PlatformTab.Users)
            }
            val availableUserRoles = if (currentUserRole == UserRole.SUPER_ADMIN) {
                listOf("super_admin", "school_admin", "gate_staff", "teacher")
            } else {
                listOf("school_admin", "gate_staff", "teacher")
            }

            val schoolsDeferred = if (currentUserRole == UserRole.SUPER_ADMIN) {
                viewModelScope.async(dispatchersProvider.io) { authRepository.getSchools() }
            } else {
                null
            }
            val usersDeferred = viewModelScope.async(dispatchersProvider.io) { authRepository.getUsers(selectedSchoolId) }
            val sectionsDeferred = viewModelScope.async(dispatchersProvider.io) { operationsRepository.getSections() }

            val schoolsResult = schoolsDeferred?.await()
            val usersResult = usersDeferred.await()
            val sectionsResult = sectionsDeferred.await()
            val failure = listOf(userResult, schoolsResult, usersResult, sectionsResult)
                .filterIsInstance<AppResult.Failure>()
                .firstOrNull()
            val schools = when {
                schoolsResult is AppResult.Success<List<PlatformSchool>> -> schoolsResult.data
                currentUser?.school != null -> listOf(
                    PlatformSchool(
                        id = currentUser.school.id,
                        name = currentUser.school.name,
                        timezone = currentUser.school.timezone,
                        lateTime = null,
                        cutoffTime = null,
                        smsEnabled = false,
                        smsProvider = null,
                        semaphoreApiKey = null,
                        semaphoreSenderName = null,
                        monthlySmsCredits = 0,
                        smsOverageRateCents = 0,
                        loginSlug = currentUser.school.loginSlug,
                    )
                )
                else -> emptyList()
            }

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isRefreshing = false,
                currentUserRole = currentUserRole,
                selectedTab = _uiState.value.selectedTab.takeIf { availableTabs.contains(it) } ?: availableTabs.first(),
                selectedSchoolId = selectedSchoolId,
                schools = schools,
                users = (usersResult as? AppResult.Success<List<PlatformUser>>)?.data.orEmpty(),
                sections = (sectionsResult as? AppResult.Success)?.data.orEmpty(),
                availableTabs = availableTabs,
                canManageSchools = canManageSchools,
                canSwitchSchool = canSwitchSchool,
                canAssignSchool = canAssignSchool,
                availableUserRoles = availableUserRoles,
                errorMessage = failure?.message,
            )
        }
    }

    private suspend fun <T> handleMutationResult(result: AppResult<T>, successMessage: String) {
        when (result) {
            is AppResult.Success -> {
                _uiState.value = _uiState.value.copy(isSaving = false)
                _dialogState.value = PlatformDialogState.None
                _messages.emit(successMessage)
                loadData(refreshing = true)
            }
            is AppResult.Failure -> {
                _uiState.value = _uiState.value.copy(isSaving = false)
                _messages.emit(result.message)
            }
        }
    }
}
