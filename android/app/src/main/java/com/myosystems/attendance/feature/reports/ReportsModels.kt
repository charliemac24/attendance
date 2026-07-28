package com.myosystems.attendance.feature.reports

import com.myosystems.attendance.core.model.AttendanceReportRow
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.SmsBillingReportRow
import com.myosystems.attendance.core.model.SmsUsageReportRow

enum class ReportTab(
    val routeKey: String,
    val label: String,
) {
    DAILY("daily", "Daily"),
    ABSENTEES("absentees", "Absentees"),
    LATE_HISTORY("late-history", "Late"),
    SMS_USAGE("sms-usage", "SMS Usage"),
    SMS_BILLING("sms-billing", "Billing");

    companion object {
        fun fromRouteKey(value: String): ReportTab = entries.firstOrNull { it.routeKey == value } ?: DAILY
    }
}

data class ReportsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
    val selectedTab: ReportTab = ReportTab.DAILY,
    val startDate: String,
    val endDate: String,
    val month: String,
    val selectedGrade: String = "all",
    val selectedSection: String = "all",
    val studentName: String = "",
    val studentNo: String = "",
    val grades: List<GradeLevelSummary> = emptyList(),
    val sections: List<SectionSummary> = emptyList(),
    val attendanceRows: List<AttendanceReportRow> = emptyList(),
    val smsUsageRows: List<SmsUsageReportRow> = emptyList(),
    val smsBillingRows: List<SmsBillingReportRow> = emptyList(),
    val canViewBilling: Boolean = false,
    val canMarkExcused: Boolean = false,
    val canExportCsv: Boolean = false,
    val isExporting: Boolean = false,
)

data class ReportExportPayload(
    val fileName: String,
    val bytes: ByteArray,
)
