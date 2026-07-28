package com.myosystems.attendance.feature.students

import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.StudentSummary

enum class StudentRosterFilter(val backendValue: String, val title: String) {
    ACTIVE("active", "Active"),
    INACTIVE("inactive", "Inactive"),
}

data class StudentsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSaving: Boolean = false,
    val rosterFilter: StudentRosterFilter = StudentRosterFilter.ACTIVE,
    val search: String = "",
    val selectedGradeId: String = "all",
    val selectedSectionId: String = "all",
    val students: List<StudentSummary> = emptyList(),
    val grades: List<GradeLevelSummary> = emptyList(),
    val sections: List<SectionSummary> = emptyList(),
    val errorMessage: String? = null,
    val canManageStudents: Boolean = false,
    val canShowStudentRowActions: Boolean = false,
    val canMarkAbsent: Boolean = false,
    val canMarkExcused: Boolean = false,
)

data class StudentEditorState(
    val id: Int? = null,
    val firstName: String = "",
    val lastName: String = "",
    val studentNo: String = "",
    val gradeLevelId: String = "",
    val sectionId: String = "",
    val guardianName: String = "",
    val guardianPhone: String = "",
    val photoUrl: String = "",
    val isActive: Boolean = true,
    val isEdit: Boolean = false,
)

data class StudentStatusDialogState(
    val studentId: Int,
    val studentName: String,
    val status: String,
    val date: String,
    val note: String = "",
)
