package com.myosystems.attendance.feature.platform

import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.SectionSummary

enum class PlatformTab(val label: String) {
    Scope("Scope"),
    Schools("Schools"),
    Users("Users"),
}

data class PlatformAdminUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSaving: Boolean = false,
    val isDeleting: Boolean = false,
    val errorMessage: String? = null,
    val selectedTab: PlatformTab = PlatformTab.Scope,
    val currentUserRole: UserRole = UserRole.UNKNOWN,
    val selectedSchoolId: Int? = null,
    val schools: List<PlatformSchool> = emptyList(),
    val users: List<PlatformUser> = emptyList(),
    val sections: List<SectionSummary> = emptyList(),
    val availableTabs: List<PlatformTab> = PlatformTab.entries,
    val canManageSchools: Boolean = false,
    val canSwitchSchool: Boolean = false,
    val canAssignSchool: Boolean = false,
    val availableUserRoles: List<String> = emptyList(),
)

sealed interface PlatformDialogState {
    data object None : PlatformDialogState

    data class SchoolEditor(
        val schoolId: Int? = null,
        val name: String = "",
        val loginSlug: String = "",
        val timezone: String = "Asia/Manila",
        val lateTime: String = "08:00",
        val cutoffTime: String = "09:00",
        val smsEnabled: Boolean = false,
        val smsProvider: String = "semaphore",
        val monthlySmsCredits: String = "0",
        val smsOverageRateCents: String = "150",
        val adminUsername: String = "",
        val adminPassword: String = "",
        val adminFullName: String = "",
        val adminEmail: String = "",
    ) : PlatformDialogState

    data class UserEditor(
        val userId: Int? = null,
        val username: String = "",
        val password: String = "",
        val fullName: String = "",
        val email: String = "",
        val role: String = "teacher",
        val schoolId: String = "",
        val teacherSectionIds: List<Int> = emptyList(),
        val isEdit: Boolean = false,
    ) : PlatformDialogState

    data class DeleteConfirmation(
        val title: String,
        val message: String,
        val kind: String,
        val targetId: Int,
    ) : PlatformDialogState
}
