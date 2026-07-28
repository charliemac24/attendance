package com.myosystems.attendance.feature.reports

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.AttendanceReportRow
import com.myosystems.attendance.core.model.SmsBillingReportRow
import com.myosystems.attendance.core.model.SmsUsageReportRow
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.util.permissionsFor
import com.myosystems.attendance.core.util.philippineIsoDate
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
class ReportsViewModel @Inject constructor(
    private val operationsRepository: OperationsRepository,
    private val authRepository: AuthRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val initialDate = philippineIsoDate()
    private val initialMonth = initialDate.take(7)

    private val _uiState = MutableStateFlow(
        ReportsUiState(
            startDate = initialDate,
            endDate = initialDate,
            month = initialMonth,
        )
    )
    val uiState: StateFlow<ReportsUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private val _exportEvents = MutableSharedFlow<ReportExportPayload>()
    val exportEvents: SharedFlow<ReportExportPayload> = _exportEvents.asSharedFlow()

    init {
        refresh()
    }

    fun refresh() {
        loadData(refreshing = false)
    }

    fun pullToRefresh() {
        loadData(refreshing = true)
    }

    fun selectTab(tab: ReportTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
        loadData()
    }

    fun updateStartDate(value: String) {
        _uiState.value = _uiState.value.copy(startDate = value)
    }

    fun updateEndDate(value: String) {
        _uiState.value = _uiState.value.copy(endDate = value)
    }

    fun updateMonth(value: String) {
        _uiState.value = _uiState.value.copy(month = value)
    }

    fun updateGrade(value: String) {
        _uiState.value = _uiState.value.copy(selectedGrade = value)
    }

    fun updateSection(value: String) {
        _uiState.value = _uiState.value.copy(selectedSection = value)
    }

    fun updateStudentName(value: String) {
        _uiState.value = _uiState.value.copy(studentName = value)
    }

    fun updateStudentNo(value: String) {
        _uiState.value = _uiState.value.copy(studentNo = value)
    }

    fun applyFilters() {
        loadData()
    }

    fun markExcused(row: AttendanceReportRow) {
        val studentId = row.studentId ?: return
        viewModelScope.launch {
            when (
                val result = withContext(dispatchersProvider.io) {
                    operationsRepository.updateAttendanceStatus(
                        studentId = studentId,
                        status = "excused",
                        date = row.date,
                        note = null,
                    )
                }
            ) {
                is AppResult.Success -> {
                    _messages.emit("${row.studentName} marked excused")
                    loadData(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun exportCurrentReport() {
        val current = _uiState.value
        if (!current.canExportCsv || current.isExporting) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isExporting = true)
            val result = withContext(dispatchersProvider.io) {
                operationsRepository.exportReport(
                    reportType = current.selectedTab.routeKey,
                    startDate = current.startDate.takeUnless { current.selectedTab == ReportTab.SMS_BILLING },
                    endDate = current.endDate.takeUnless { current.selectedTab == ReportTab.SMS_BILLING },
                    grade = current.selectedGrade.takeIf { current.selectedTab in attendanceTabs && it != "all" },
                    section = current.selectedSection.takeIf { current.selectedTab in attendanceTabs && it != "all" },
                    studentName = current.studentName.takeIf { current.selectedTab in attendanceTabs && it.isNotBlank() },
                    studentNo = current.studentNo.takeIf { current.selectedTab in attendanceTabs && it.isNotBlank() },
                    month = current.month.takeIf { current.selectedTab == ReportTab.SMS_BILLING },
                )
            }

            when (result) {
                is AppResult.Success -> {
                    _exportEvents.emit(
                        ReportExportPayload(
                            fileName = buildExportFileName(current),
                            bytes = result.data,
                        )
                    )
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }

            _uiState.value = _uiState.value.copy(isExporting = false)
        }
    }

    private fun loadData(refreshing: Boolean = false) {
        viewModelScope.launch {
            val current = _uiState.value
            _uiState.value = current.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )

            val userRole = withContext(dispatchersProvider.io) {
                when (val result = authRepository.getCurrentUser()) {
                    is AppResult.Success -> result.data?.role ?: UserRole.UNKNOWN
                    is AppResult.Failure -> UserRole.UNKNOWN
                }
            }
            val canViewBilling = userRole == UserRole.SUPER_ADMIN
            val permissions = permissionsFor(userRole)
            val canExportCsv = userRole == UserRole.SUPER_ADMIN || userRole == UserRole.SCHOOL_ADMIN

            val gradesDeferred = viewModelScope.async(dispatchersProvider.io) { operationsRepository.getGradeLevels() }
            val sectionsDeferred = viewModelScope.async(dispatchersProvider.io) { operationsRepository.getSections() }
            val attendanceDeferred = if (current.selectedTab in attendanceTabs) {
                viewModelScope.async(dispatchersProvider.io) {
                    operationsRepository.getAttendanceReport(
                        reportType = current.selectedTab.routeKey,
                        startDate = current.startDate,
                        endDate = current.endDate,
                        grade = current.selectedGrade.takeIf { it != "all" },
                        section = current.selectedSection.takeIf { it != "all" },
                        studentName = current.studentName.takeIf { it.isNotBlank() },
                        studentNo = current.studentNo.takeIf { it.isNotBlank() },
                    )
                }
            } else {
                null
            }
            val smsUsageDeferred = if (current.selectedTab == ReportTab.SMS_USAGE) {
                viewModelScope.async(dispatchersProvider.io) {
                    operationsRepository.getSmsUsageReport(
                        startDate = current.startDate,
                        endDate = current.endDate,
                    )
                }
            } else {
                null
            }
            val billingDeferred = if (current.selectedTab == ReportTab.SMS_BILLING) {
                viewModelScope.async(dispatchersProvider.io) {
                    if (canViewBilling) {
                        operationsRepository.getSmsBillingReport(current.month)
                    } else {
                        AppResult.Failure("Only super admin can view billing.")
                    }
                }
            } else {
                null
            }

            val gradesResult = gradesDeferred.await()
            val sectionsResult = sectionsDeferred.await()
            val attendanceResult = attendanceDeferred?.await()
            val smsUsageResult = smsUsageDeferred?.await()
            val billingResult = billingDeferred?.await()

            val grades = (gradesResult as? AppResult.Success)?.data.orEmpty()
            val sections = (sectionsResult as? AppResult.Success)?.data.orEmpty()
            val reportFailure = listOf(attendanceResult, smsUsageResult, billingResult)
                .filterIsInstance<AppResult.Failure>()
                .firstOrNull()

            val attendanceRows = (attendanceResult as? AppResult.Success<List<AttendanceReportRow>>)?.data.orEmpty()
            val smsUsageRows = (smsUsageResult as? AppResult.Success<List<SmsUsageReportRow>>)?.data.orEmpty()
            val smsBillingRows = (billingResult as? AppResult.Success<List<SmsBillingReportRow>>)?.data.orEmpty()

            if (reportFailure != null) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    grades = grades,
                    sections = sections,
                    attendanceRows = attendanceRows,
                    smsUsageRows = smsUsageRows,
                    smsBillingRows = smsBillingRows,
                    canViewBilling = canViewBilling && permissions.canAccessReports,
                    canMarkExcused = permissions.canMarkExcused,
                    canExportCsv = canExportCsv,
                    errorMessage = reportFailure.message,
                )
                _messages.emit(reportFailure.message)
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    grades = grades,
                    sections = sections,
                    attendanceRows = attendanceRows,
                    smsUsageRows = smsUsageRows,
                    smsBillingRows = smsBillingRows,
                    canViewBilling = canViewBilling && permissions.canAccessReports,
                    canMarkExcused = permissions.canMarkExcused,
                    canExportCsv = canExportCsv,
                    errorMessage = null,
                )
            }
        }
    }

    private fun buildExportFileName(state: ReportsUiState): String {
        return when (state.selectedTab) {
            ReportTab.SMS_BILLING -> "sms-billing-${state.month}.csv"
            ReportTab.SMS_USAGE -> "sms-usage-${state.startDate}-to-${state.endDate}.csv"
            else -> "${state.selectedTab.routeKey}-${state.startDate}-to-${state.endDate}.csv"
        }
    }

    private companion object {
        val attendanceTabs = setOf(ReportTab.DAILY, ReportTab.ABSENTEES, ReportTab.LATE_HISTORY)
    }
}
