package com.myosystems.attendance.feature.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.auth.SessionExpiryHandler
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.storage.PreferencesStore
import com.myosystems.attendance.domain.repository.AuthRepository
import com.myosystems.attendance.domain.usecase.ValidateSessionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class AppStateViewModel @Inject constructor(
    private val validateSessionUseCase: ValidateSessionUseCase,
    private val authRepository: AuthRepository,
    private val preferencesStore: PreferencesStore,
    private val dispatchersProvider: DispatchersProvider,
    sessionExpiryHandler: SessionExpiryHandler,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AppState())
    val uiState: StateFlow<AppState> = _uiState.asStateFlow()

    init {
        refreshSession()
        viewModelScope.launch {
            sessionExpiryHandler.events.collectLatest {
                _uiState.value = _uiState.value.copy(user = null, startupError = null)
            }
        }
    }

    fun onLoginSucceeded() {
        refreshSession()
    }

    fun logout() {
        viewModelScope.launch {
            withContext(dispatchersProvider.io) {
                authRepository.logout()
            }
            _uiState.value = _uiState.value.copy(user = null, startupError = null, isInitializing = false)
        }
    }

    fun refreshSession() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isInitializing = true, startupError = null)
            val result = withContext(dispatchersProvider.io) {
                preferencesStore.initializeApiEnvironment()
                validateSessionUseCase()
            }
            _uiState.value = when (result) {
                is AppResult.Success -> AppState(
                    isInitializing = false,
                    user = result.data,
                    startupError = null,
                )
                is AppResult.Failure -> AppState(
                    isInitializing = false,
                    user = null,
                    startupError = result.message,
                )
            }
        }
    }
}
