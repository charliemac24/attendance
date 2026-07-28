package com.myosystems.attendance.feature.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.SchoolSettings
import com.myosystems.attendance.core.network.ApiEnvironmentMode
import com.myosystems.attendance.core.storage.PreferencesStore
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.util.permissionsFor
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
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val operationsRepository: OperationsRepository,
    private val preferencesStore: PreferencesStore,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    init {
        viewModelScope.launch {
            preferencesStore.preferences.collect { prefs ->
                _uiState.value = _uiState.value.copy(
                    apiEnvironment = prefs.apiEnvironment,
                    apiBaseUrl = prefs.apiEnvironment.baseUrl,
                )
            }
        }
        refresh()
    }

    fun refresh() {
        loadData(refreshing = false)
    }

    fun pullToRefresh() {
        loadData(refreshing = true)
    }

    fun updateSettings(transform: (SchoolSettings) -> SchoolSettings) {
        val current = _uiState.value.settings ?: return
        _uiState.value = _uiState.value.copy(settings = transform(current))
    }

    fun updatePurgeRange(from: String? = null, to: String? = null) {
        _uiState.value = _uiState.value.copy(
            purgeFrom = from ?: _uiState.value.purgeFrom,
            purgeTo = to ?: _uiState.value.purgeTo,
        )
    }

    fun updatePurgeOptions(deleteAttendance: Boolean? = null, deleteSms: Boolean? = null) {
        _uiState.value = _uiState.value.copy(
            purgeDeleteAttendance = deleteAttendance ?: _uiState.value.purgeDeleteAttendance,
            purgeDeleteSms = deleteSms ?: _uiState.value.purgeDeleteSms,
        )
    }

    fun updateApiEnvironment(mode: ApiEnvironmentMode) {
        if (_uiState.value.apiEnvironment == mode) return
        viewModelScope.launch {
            withContext(dispatchersProvider.io) {
                preferencesStore.updateApiEnvironment(mode)
                authRepository.clearSession()
            }
            _messages.emit("Environment switched to ${mode.displayName}. Sign in again on the selected server.")
        }
    }

    fun saveSettings() {
        val settings = _uiState.value.settings ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.updateSchoolSettings(settings) }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(isSaving = false, settings = result.data)
                    _messages.emit("Settings saved")
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    _messages.emit(result.message)
                }
            }
        }
    }

    fun uploadLogo(photoBytes: ByteArray, fileName: String, mimeType: String) {
        val current = _uiState.value.settings ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.uploadSchoolLogo(photoBytes, fileName, mimeType) }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        settings = current.copy(logoUrl = result.data),
                    )
                    _messages.emit("Logo uploaded")
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    _messages.emit(result.message)
                }
            }
        }
    }

    fun generateStudentQrTokens() {
        viewModelScope.launch {
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.generateStudentQrTokens() }) {
                is AppResult.Success -> _messages.emit("QR tokens updated for ${result.data.updated} students")
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun purgeLogs() {
        val state = _uiState.value
        if (state.purgeFrom.isBlank() || state.purgeTo.isBlank()) return
        viewModelScope.launch {
            when (
                val result = withContext(dispatchersProvider.io) {
                    operationsRepository.purgeLogs(
                        from = state.purgeFrom,
                        to = state.purgeTo,
                        deleteAttendance = state.purgeDeleteAttendance,
                        deleteSms = state.purgeDeleteSms,
                    )
                }
            ) {
                is AppResult.Success -> {
                    _messages.emit(
                        "Logs purged: attendance events ${result.data.attendanceEventsDeleted}, daily records ${result.data.dailyAttendancesDeleted}, sms logs ${result.data.smsLogsDeleted}"
                    )
                }
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    private fun loadData(refreshing: Boolean) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                errorMessage = null,
            )
            val userDeferred = async(dispatchersProvider.io) { authRepository.getCurrentUser() }
            val settingsDeferred = async(dispatchersProvider.io) { operationsRepository.getSchoolSettings() }

            val userResult = userDeferred.await()
            val settingsResult = settingsDeferred.await()
            val role = when (userResult) {
                is AppResult.Success -> userResult.data?.role ?: UserRole.UNKNOWN
                is AppResult.Failure -> UserRole.UNKNOWN
            }
            val permissions = permissionsFor(role)
            val failure = listOf(userResult, settingsResult).filterIsInstance<AppResult.Failure>().firstOrNull()
            val settings = (settingsResult as? AppResult.Success)?.data
            val today = java.time.LocalDate.now().toString()

            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isRefreshing = false,
                settings = settings,
                canEdit = permissions.canManageSettings,
                canPurgeLogs = role == UserRole.SUPER_ADMIN,
                canManageAppEnvironment = role == UserRole.SUPER_ADMIN,
                canManageLoginSlug = role == UserRole.SUPER_ADMIN,
                errorMessage = failure?.message,
                purgeFrom = _uiState.value.purgeFrom.ifBlank { today },
                purgeTo = _uiState.value.purgeTo.ifBlank { today },
            )
        }
    }
}
