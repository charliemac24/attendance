package com.myosystems.attendance.feature.sms

import com.myosystems.attendance.core.model.SmsLogEntry
import com.myosystems.attendance.core.model.SmsTemplateItem

enum class SmsTab(val label: String) {
    TEMPLATES("Templates"),
    LOGS("Logs"),
}

data class SmsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val isSaving: Boolean = false,
    val selectedTab: SmsTab = SmsTab.TEMPLATES,
    val templates: List<SmsTemplateItem> = emptyList(),
    val logs: List<SmsLogEntry> = emptyList(),
    val fromDate: String = "",
    val toDate: String = "",
    val testPhone: String = "",
    val testMessage: String = "",
    val canManageTemplates: Boolean = false,
    val canPurgeLogs: Boolean = false,
    val errorMessage: String? = null,
)
