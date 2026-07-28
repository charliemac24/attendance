package com.myosystems.attendance.feature.admin

import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.SchoolHoliday
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.util.philippineIsoDate

enum class AdminTab(val label: String) {
    Grades("Grades"),
    Sections("Sections"),
    Kiosks("Kiosks"),
    Holidays("Holidays"),
}

data class AdminUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val selectedTab: AdminTab = AdminTab.Grades,
    val grades: List<GradeLevelSummary> = emptyList(),
    val sections: List<SectionSummary> = emptyList(),
    val kiosks: List<KioskLocation> = emptyList(),
    val holidays: List<SchoolHoliday> = emptyList(),
    val isSaving: Boolean = false,
    val isDeleting: Boolean = false,
)

sealed interface AdminDialogState {
    data object None : AdminDialogState

    data class GradeEditor(
        val id: Int? = null,
        val name: String = "",
        val lateTimeOverride: String = "",
        val lateTimeOverridesByWeekday: Map<String, String> = emptyMap(),
    ) : AdminDialogState

    data class SectionEditor(
        val id: Int? = null,
        val name: String = "",
        val gradeLevelId: String = "",
        val lateTimeOverride: String = "",
        val lateTimeOverridesByWeekday: Map<String, String> = emptyMap(),
    ) : AdminDialogState

    data class KioskEditor(
        val id: Int? = null,
        val name: String = "",
        val slug: String = "",
    ) : AdminDialogState

    data class HolidayEditor(
        val id: Int? = null,
        val date: String = philippineIsoDate(),
        val name: String = "",
        val type: String = "holiday",
        val isRecurring: Boolean = false,
    ) : AdminDialogState

    data class DeleteConfirmation(
        val id: Int,
        val label: String,
        val message: String,
        val target: DeleteTarget,
    ) : AdminDialogState
}

enum class DeleteTarget {
    Grade,
    Section,
    Kiosk,
    Holiday,
}
