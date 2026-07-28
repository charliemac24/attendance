package com.myosystems.attendance.feature.today

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccessTime
import androidx.compose.material.icons.outlined.PersonOff
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.ui.graphics.vector.ImageVector
import com.myosystems.attendance.core.model.AttendanceRecord
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.util.philippineIsoDate

enum class TodayStatusType(
    val routeKey: String,
    val apiStatus: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
) {
    PRESENT(
        routeKey = "present",
        apiStatus = "present",
        title = "Checked Out Students",
        description = "Students who completed check-out for the day",
        icon = Icons.Outlined.TaskAlt,
    ),
    LATE(
        routeKey = "late",
        apiStatus = "late",
        title = "Late Arrivals",
        description = "Students who arrived late, whether still on campus or already checked out",
        icon = Icons.Outlined.AccessTime,
    ),
    PENDING_CHECKOUT(
        routeKey = "pending-checkout",
        apiStatus = "pending_checkout",
        title = "On Campus",
        description = "Students who checked in but have not checked out yet",
        icon = Icons.AutoMirrored.Outlined.Logout,
    ),
    ABSENT(
        routeKey = "absent",
        apiStatus = "absent",
        title = "Absent Students",
        description = "Students marked absent",
        icon = Icons.Outlined.PersonOff,
    ),
    NOT_CHECKED_IN(
        routeKey = "not-checked-in-yet",
        apiStatus = "not_checked_in",
        title = "Not Checked In Yet",
        description = "Students with no attendance record",
        icon = Icons.AutoMirrored.Outlined.HelpOutline,
    );

    companion object {
        fun fromRoute(routeKey: String?): TodayStatusType =
            entries.firstOrNull { it.routeKey == routeKey } ?: PRESENT
    }
}

data class TodayStatusUiState(
    val statusType: TodayStatusType,
    val selectedDate: String = philippineIsoDate(),
    val search: String = "",
    val selectedGrade: String = "all",
    val selectedSection: String = "all",
    val page: Int = 1,
    val pageSize: Int = 20,
    val total: Int = 0,
    val records: List<AttendanceRecord> = emptyList(),
    val grades: List<GradeLevelSummary> = emptyList(),
    val sections: List<SectionSummary> = emptyList(),
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSubmittingAction: Boolean = false,
    val errorMessage: String? = null,
    val userRole: UserRole = UserRole.UNKNOWN,
    val canManualCheckIn: Boolean = false,
    val canManualCheckOut: Boolean = false,
    val canMarkAbsent: Boolean = false,
    val canMarkExcused: Boolean = false,
)

enum class AttendanceActionKind {
    CHECK_IN,
    CHECK_OUT,
    ABSENT,
    EXCUSED,
}

data class PendingStatusAction(
    val studentId: Int,
    val studentName: String,
    val actionKind: AttendanceActionKind,
    val actionLabel: String,
    val confirmText: String,
)
