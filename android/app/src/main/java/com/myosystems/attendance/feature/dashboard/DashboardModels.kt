package com.myosystems.attendance.feature.dashboard

import com.myosystems.attendance.core.model.AttendanceIntelligence
import com.myosystems.attendance.core.model.DashboardSummary

data class DashboardUiState(
    val selectedDate: String,
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val dashboard: DashboardSummary? = null,
    val intelligence: AttendanceIntelligence? = null,
    val showStudentsNeedingAttention: Boolean = true,
    val canClearRecentActivity: Boolean = false,
    val isClearingRecentActivity: Boolean = false,
)
