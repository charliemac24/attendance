package com.myosystems.attendance.feature.settings

import com.myosystems.attendance.core.network.ApiEnvironmentMode
import com.myosystems.attendance.core.model.SchoolSettings

data class SettingsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSaving: Boolean = false,
    val settings: SchoolSettings? = null,
    val canEdit: Boolean = false,
    val canPurgeLogs: Boolean = false,
    val canManageAppEnvironment: Boolean = false,
    val canManageLoginSlug: Boolean = false,
    val errorMessage: String? = null,
    val purgeFrom: String = "",
    val purgeTo: String = "",
    val purgeDeleteAttendance: Boolean = true,
    val purgeDeleteSms: Boolean = true,
    val apiEnvironment: ApiEnvironmentMode = ApiEnvironmentMode.default(),
    val apiBaseUrl: String = ApiEnvironmentMode.default().baseUrl,
)
