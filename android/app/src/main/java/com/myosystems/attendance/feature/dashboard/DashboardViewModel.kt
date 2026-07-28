package com.myosystems.attendance.feature.dashboard

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
class DashboardViewModel @Inject constructor(
    private val operationsRepository: OperationsRepository,
    private val authRepository: AuthRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val initialDate = philippineIsoDate()

    private val _uiState = MutableStateFlow(
        DashboardUiState(
            selectedDate = initialDate,
        )
    )
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    init {
        loadDashboard()
    }

    fun selectToday() = selectDate(philippineIsoDate())

    fun selectYesterday() = selectDate(philippineIsoDateWithOffset(-1))

    fun selectDate(date: String) {
        _uiState.value = _uiState.value.copy(selectedDate = date)
        loadDashboard()
    }

    fun refresh() {
        loadDashboard(refreshing = true)
    }

    fun clearRecentActivity() {
        if (_uiState.value.isClearingRecentActivity) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isClearingRecentActivity = true)
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.clearRecentActivity() }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(isClearingRecentActivity = false)
                    _messages.emit("Recent activity cleared")
                    loadDashboard(refreshing = true)
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isClearingRecentActivity = false)
                    _messages.emit(result.message)
                }
            }
        }
    }

    private fun loadDashboard(refreshing: Boolean = false) {
        viewModelScope.launch {
            val currentDate = _uiState.value.selectedDate
            _uiState.value = _uiState.value.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )

            val role = withContext(dispatchersProvider.io) {
                when (val userResult = authRepository.getCurrentUser()) {
                    is AppResult.Success -> userResult.data?.role ?: UserRole.UNKNOWN
                    is AppResult.Failure -> UserRole.UNKNOWN
                }
            }

            val permissions = permissionsFor(role)

            val dashboardDeferred = viewModelScope.async(dispatchersProvider.io) {
                operationsRepository.getDashboard(currentDate)
            }
            val settingsDeferred = viewModelScope.async(dispatchersProvider.io) {
                operationsRepository.getSchoolSettings()
            }
            val intelligenceDeferred = viewModelScope.async(dispatchersProvider.io) {
                operationsRepository.getAttendanceIntelligence(currentDate)
            }

            val dashboardResult = dashboardDeferred.await()
            val settingsResult = settingsDeferred.await()
            val intelligenceResult = intelligenceDeferred.await()

            when (dashboardResult) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        dashboard = dashboardResult.data,
                        intelligence = (intelligenceResult as? AppResult.Success)?.data,
                        showStudentsNeedingAttention = (settingsResult as? AppResult.Success)?.data?.showStudentsNeedingAttention ?: true,
                        canClearRecentActivity = permissions.canClearRecentActivity,
                        errorMessage = null,
                    )
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isRefreshing = false,
                        errorMessage = dashboardResult.message,
                        canClearRecentActivity = permissions.canClearRecentActivity,
                    )
                }
            }
        }
    }
}
