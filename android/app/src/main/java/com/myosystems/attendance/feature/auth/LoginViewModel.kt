package com.myosystems.attendance.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<LoginEvent>()
    val events: SharedFlow<LoginEvent> = _events.asSharedFlow()

    private var brandingJob: Job? = null

    init {
        refreshBranding()
    }

    fun updateSchoolSlug(value: String) {
        _uiState.value = _uiState.value.copy(schoolSlug = value, errorMessage = null)
        refreshBranding(delayMillis = 250)
    }

    fun updateUsername(value: String) {
        _uiState.value = _uiState.value.copy(username = value, errorMessage = null)
    }

    fun updatePassword(value: String) {
        _uiState.value = _uiState.value.copy(password = value, errorMessage = null)
    }

    fun togglePasswordVisibility() {
        _uiState.value = _uiState.value.copy(isPasswordVisible = !_uiState.value.isPasswordVisible)
    }

    fun login() {
        val state = _uiState.value
        if (state.username.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Username is required.")
            return
        }
        if (state.password.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Password is required.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, errorMessage = null)
            when (
                val result = withContext(dispatchersProvider.io) {
                    authRepository.login(
                        username = _uiState.value.username.trim(),
                        password = _uiState.value.password,
                        schoolSlug = _uiState.value.schoolSlug.trim().ifBlank { null },
                    )
                }
            ) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(isSubmitting = false)
                    _events.emit(LoginEvent.Success)
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        errorMessage = result.message,
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun refreshBranding(delayMillis: Long = 0) {
        brandingJob?.cancel()
        brandingJob = viewModelScope.launch {
            if (delayMillis > 0) {
                delay(delayMillis)
            }
            _uiState.value = _uiState.value.copy(isLoadingBranding = true)
            when (
                val result = withContext(dispatchersProvider.io) {
                    authRepository.getSchoolBranding(_uiState.value.schoolSlug.trim())
                }
            ) {
                is AppResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingBranding = false,
                        branding = result.data,
                    )
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoadingBranding = false,
                        branding = null,
                    )
                }
            }
        }
    }
}

sealed interface LoginEvent {
    data object Success : LoginEvent
}
