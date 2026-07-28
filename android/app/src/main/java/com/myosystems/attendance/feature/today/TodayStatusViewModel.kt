package com.myosystems.attendance.feature.today

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.util.permissionsFor
import com.myosystems.attendance.core.util.philippineIsoDate
import com.myosystems.attendance.core.util.philippineIsoDateWithOffset
import com.myosystems.attendance.domain.repository.AuthRepository
import com.myosystems.attendance.domain.repository.OperationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
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
class TodayStatusViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val operationsRepository: OperationsRepository,
    private val authRepository: AuthRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val statusType = TodayStatusType.fromRoute(savedStateHandle["statusKey"])

    private val _uiState = MutableStateFlow(
        TodayStatusUiState(
            statusType = statusType,
            selectedDate = philippineIsoDate(),
        )
    )
    val uiState: StateFlow<TodayStatusUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private val _pendingAction = MutableStateFlow<PendingStatusAction?>(null)
    val pendingAction: StateFlow<PendingStatusAction?> = _pendingAction.asStateFlow()

    private var loadJob: Job? = null

    init {
        loadFiltersAndRecords()
    }

    fun selectToday() = selectDate(philippineIsoDate())

    fun selectYesterday() = selectDate(philippineIsoDateWithOffset(-1))

    fun selectDate(date: String) {
        _uiState.value = _uiState.value.copy(selectedDate = date, page = 1)
        loadRecords()
    }

    fun updateSearch(search: String) {
        _uiState.value = _uiState.value.copy(search = search, page = 1)
        loadRecords()
    }

    fun updateGrade(grade: String) {
        _uiState.value = _uiState.value.copy(selectedGrade = grade, page = 1)
        loadRecords()
    }

    fun updateSection(section: String) {
        _uiState.value = _uiState.value.copy(selectedSection = section, page = 1)
        loadRecords()
    }

    fun nextPage() {
        val current = _uiState.value
        val totalPages = totalPages()
        if (current.page >= totalPages) return
        _uiState.value = current.copy(page = current.page + 1)
        loadRecords()
    }

    fun previousPage() {
        val current = _uiState.value
        if (current.page <= 1) return
        _uiState.value = current.copy(page = current.page - 1)
        loadRecords()
    }

    fun refresh() = loadRecords(refreshing = true)

    fun requestAction(record: com.myosystems.attendance.core.model.AttendanceRecord, kind: AttendanceActionKind) {
        val config = when (kind) {
            AttendanceActionKind.CHECK_IN -> PendingStatusAction(
                studentId = record.studentId,
                studentName = record.studentName,
                actionKind = kind,
                actionLabel = "Check in",
                confirmText = "Record manual check-in for ${record.studentName}?",
            )
            AttendanceActionKind.CHECK_OUT -> PendingStatusAction(
                studentId = record.studentId,
                studentName = record.studentName,
                actionKind = kind,
                actionLabel = "Check out",
                confirmText = "Record manual check-out for ${record.studentName}?",
            )
            AttendanceActionKind.ABSENT -> PendingStatusAction(
                studentId = record.studentId,
                studentName = record.studentName,
                actionKind = kind,
                actionLabel = "Mark absent",
                confirmText = "Mark ${record.studentName} absent for ${_uiState.value.selectedDate}?",
            )
            AttendanceActionKind.EXCUSED -> PendingStatusAction(
                studentId = record.studentId,
                studentName = record.studentName,
                actionKind = kind,
                actionLabel = "Mark excused",
                confirmText = "Mark ${record.studentName} excused for ${_uiState.value.selectedDate}?",
            )
        }
        _pendingAction.value = config
    }

    fun dismissPendingAction() {
        _pendingAction.value = null
    }

    fun confirmPendingAction() {
        val action = _pendingAction.value ?: return
        dismissPendingAction()

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmittingAction = true)
            val result = withContext(dispatchersProvider.io) {
                when (action.actionKind) {
                    AttendanceActionKind.CHECK_IN -> operationsRepository.submitManualAttendance(
                        studentId = action.studentId,
                        action = "check_in",
                        timestamp = null,
                    )
                    AttendanceActionKind.CHECK_OUT -> operationsRepository.submitManualAttendance(
                        studentId = action.studentId,
                        action = "check_out",
                        timestamp = null,
                    )
                    AttendanceActionKind.ABSENT -> operationsRepository.updateAttendanceStatus(
                        studentId = action.studentId,
                        status = "absent",
                        date = _uiState.value.selectedDate,
                        note = null,
                    ).let { statusResult ->
                        when (statusResult) {
                            is AppResult.Success -> AppResult.Success("Student marked absent")
                            is AppResult.Failure -> statusResult
                        }
                    }
                    AttendanceActionKind.EXCUSED -> operationsRepository.updateAttendanceStatus(
                        studentId = action.studentId,
                        status = "excused",
                        date = _uiState.value.selectedDate,
                        note = null,
                    ).let { statusResult ->
                        when (statusResult) {
                            is AppResult.Success -> AppResult.Success("Student marked excused")
                            is AppResult.Failure -> statusResult
                        }
                    }
                }
            }

            _uiState.value = _uiState.value.copy(isSubmittingAction = false)
            when (result) {
                is AppResult.Success -> {
                    _messages.emit(result.data)
                    loadRecords(refreshing = true)
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    private fun loadFiltersAndRecords() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val role = withContext(dispatchersProvider.io) {
                when (val userResult = authRepository.getCurrentUser()) {
                    is AppResult.Success -> userResult.data?.role ?: UserRole.UNKNOWN
                    is AppResult.Failure -> UserRole.UNKNOWN
                }
            }
            val permissions = permissionsFor(role)

            val gradesDeferred = async(dispatchersProvider.io) { operationsRepository.getGradeLevels() }
            val sectionsDeferred = async(dispatchersProvider.io) { operationsRepository.getSections() }
            val recordsDeferred = async(dispatchersProvider.io) { currentRecordsCall() }

            val gradesResult = gradesDeferred.await()
            val sectionsResult = sectionsDeferred.await()
            val recordsResult = recordsDeferred.await()

            when (recordsResult) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        records = recordsResult.data.records,
                        total = recordsResult.data.total,
                        page = recordsResult.data.page,
                        pageSize = recordsResult.data.pageSize,
                        grades = (gradesResult as? AppResult.Success)?.data.orEmpty(),
                        sections = (sectionsResult as? AppResult.Success)?.data.orEmpty(),
                        userRole = role,
                        canManualCheckIn = permissions.canManualCheckIn,
                        canManualCheckOut = permissions.canManualCheckOut,
                        canMarkAbsent = permissions.canMarkAbsent,
                        canMarkExcused = permissions.canMarkExcused,
                        errorMessage = null,
                    )
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        grades = (gradesResult as? AppResult.Success)?.data.orEmpty(),
                        sections = (sectionsResult as? AppResult.Success)?.data.orEmpty(),
                        userRole = role,
                        canManualCheckIn = permissions.canManualCheckIn,
                        canManualCheckOut = permissions.canManualCheckOut,
                        canMarkAbsent = permissions.canMarkAbsent,
                        canMarkExcused = permissions.canMarkExcused,
                        errorMessage = recordsResult.message,
                    )
                }
            }
        }
    }

    private fun loadRecords(refreshing: Boolean = false) {
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = !refreshing && _uiState.value.records.isEmpty(),
                isRefreshing = refreshing,
                errorMessage = null,
            )
            when (val result = withContext(dispatchersProvider.io) { currentRecordsCall() }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        records = result.data.records,
                        total = result.data.total,
                        page = result.data.page,
                        pageSize = result.data.pageSize,
                    )
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = result.message,
                    )
                }
            }
        }
    }

    private suspend fun currentRecordsCall() = operationsRepository.getTodayStatus(
        status = _uiState.value.statusType.apiStatus,
        date = _uiState.value.selectedDate,
        search = _uiState.value.search.takeIf { it.isNotBlank() },
        grade = _uiState.value.selectedGrade.takeUnless { it == "all" },
        section = _uiState.value.selectedSection.takeUnless { it == "all" },
        page = _uiState.value.page,
    )

    fun totalPages(): Int {
        val state = _uiState.value
        return if (state.total == 0) 1 else ((state.total - 1) / state.pageSize) + 1
    }
}
