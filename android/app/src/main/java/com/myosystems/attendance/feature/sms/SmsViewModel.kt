package com.myosystems.attendance.feature.sms

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class SmsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val operationsRepository: OperationsRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SmsUiState())
    val uiState: StateFlow<SmsUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>()
    val messages: SharedFlow<String> = _messages.asSharedFlow()

    private val _exportEvents = MutableSharedFlow<ByteArray>()
    val exportEvents: SharedFlow<ByteArray> = _exportEvents.asSharedFlow()

    init {
        refresh()
    }

    fun refresh() = loadData(refreshing = false)

    fun pullToRefresh() = loadData(refreshing = true)

    fun selectTab(tab: SmsTab) {
        _uiState.value = _uiState.value.copy(selectedTab = tab)
    }

    fun updateTemplate(id: Int, enabled: Boolean, templateText: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.updateSmsTemplate(id, enabled, templateText) }) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        templates = _uiState.value.templates.map { if (it.id == id) result.data else it },
                    )
                    _messages.emit("Template saved")
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(isSaving = false)
                    _messages.emit(result.message)
                }
            }
        }
    }

    fun updateDateRange(from: String? = null, to: String? = null) {
        _uiState.value = _uiState.value.copy(
            fromDate = from ?: _uiState.value.fromDate,
            toDate = to ?: _uiState.value.toDate,
        )
    }

    fun updateTestFields(phone: String? = null, message: String? = null) {
        _uiState.value = _uiState.value.copy(
            testPhone = phone ?: _uiState.value.testPhone,
            testMessage = message ?: _uiState.value.testMessage,
        )
    }

    fun loadLogs() {
        viewModelScope.launch {
            when (
                val result = withContext(dispatchersProvider.io) {
                    operationsRepository.getSmsLogs(
                        from = _uiState.value.fromDate,
                        to = _uiState.value.toDate,
                    )
                }
            ) {
                is AppResult.Success -> _uiState.value = _uiState.value.copy(logs = result.data)
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun exportLogs() {
        viewModelScope.launch {
            when (
                val result = withContext(dispatchersProvider.io) {
                    operationsRepository.exportSmsLogs(_uiState.value.fromDate, _uiState.value.toDate)
                }
            ) {
                is AppResult.Success -> _exportEvents.emit(result.data)
                is AppResult.Failure -> _messages.emit(result.message)
            }
        }
    }

    fun sendTestSms() {
        val phone = _uiState.value.testPhone.trim()
        val message = _uiState.value.testMessage.trim()
        if (phone.isBlank()) {
            viewModelScope.launch { _messages.emit("Phone is required") }
            return
        }
        viewModelScope.launch {
            when (val result = withContext(dispatchersProvider.io) { operationsRepository.sendTestSms(phone, message) }) {
                is AppResult.Success -> {
                    _messages.emit("Test SMS sent")
                    loadLogs()
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
            val today = java.time.LocalDate.now().toString()
            val userDeferred = async(dispatchersProvider.io) { authRepository.getCurrentUser() }
            val templatesDeferred = async(dispatchersProvider.io) { operationsRepository.getSmsTemplates() }
            val logsDeferred = async(dispatchersProvider.io) {
                operationsRepository.getSmsLogs(
                    from = _uiState.value.fromDate.ifBlank { today },
                    to = _uiState.value.toDate.ifBlank { today },
                )
            }

            val userResult = userDeferred.await()
            val templatesResult = templatesDeferred.await()
            val logsResult = logsDeferred.await()

            val role = when (userResult) {
                is AppResult.Success -> userResult.data?.role ?: UserRole.UNKNOWN
                is AppResult.Failure -> UserRole.UNKNOWN
            }
            val permissions = permissionsFor(role)
            val failure = listOf(userResult, templatesResult, logsResult).filterIsInstance<AppResult.Failure>().firstOrNull()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isRefreshing = false,
                templates = (templatesResult as? AppResult.Success)?.data.orEmpty(),
                logs = (logsResult as? AppResult.Success)?.data.orEmpty(),
                fromDate = _uiState.value.fromDate.ifBlank { today },
                toDate = _uiState.value.toDate.ifBlank { today },
                canManageTemplates = permissions.canManageSettings,
                canPurgeLogs = role == UserRole.SUPER_ADMIN,
                errorMessage = failure?.message,
            )
        }
    }
}
