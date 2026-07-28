package com.myosystems.attendance.feature.scanner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.common.DispatchersProvider
import com.myosystems.attendance.core.model.ScanResult
import com.myosystems.attendance.core.storage.PreferencesStore
import com.myosystems.attendance.core.util.isValidQrToken
import com.myosystems.attendance.domain.repository.ScannerRepository
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
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val scannerRepository: ScannerRepository,
    private val preferencesStore: PreferencesStore,
    private val dispatchersProvider: DispatchersProvider,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ScannerScreenState())
    val uiState: StateFlow<ScannerScreenState> = _uiState.asStateFlow()

    private val _feedbackEvents = MutableSharedFlow<ScannerFeedbackEvent>()
    val feedbackEvents: SharedFlow<ScannerFeedbackEvent> = _feedbackEvents.asSharedFlow()

    private val duplicateGuard = ScannerDuplicateGuard()
    private var overlayResetJob: Job? = null

    init {
        observePreferences()
        refreshKiosks()
    }

    private fun observePreferences() {
        viewModelScope.launch {
            preferencesStore.preferences.collectLatest { prefs ->
                val currentSelected = _uiState.value.selectedKioskId
                _uiState.value = _uiState.value.copy(
                    selectedKioskId = currentSelected ?: prefs.lastSelectedKioskId,
                    soundEnabled = prefs.soundEnabled,
                    vibrationEnabled = prefs.vibrationEnabled,
                )
            }
        }
    }

    fun refreshKiosks() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                uiState = ScannerUiState.Initializing,
            )
            when (val result = withContext(dispatchersProvider.io) { scannerRepository.getKiosks() }) {
                is AppResult.Success -> {
                    val selectedId = _uiState.value.selectedKioskId
                        ?.takeIf { id -> result.data.any { it.id == id } }
                        ?: result.data.firstOrNull()?.id
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        kiosks = result.data,
                        selectedKioskId = selectedId,
                        uiState = ScannerUiState.Ready,
                    )
                    if (selectedId != null) {
                        preferencesStore.updateLastSelectedKiosk(selectedId)
                    }
                }
                is AppResult.Failure -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        uiState = ScannerUiState.Error(result.message),
                    )
                }
            }
        }
    }

    fun selectKiosk(kioskId: Int) {
        _uiState.value = _uiState.value.copy(selectedKioskId = kioskId)
        viewModelScope.launch {
            preferencesStore.updateLastSelectedKiosk(kioskId)
        }
    }

    fun toggleSound() {
        viewModelScope.launch {
            preferencesStore.updateSoundEnabled(!_uiState.value.soundEnabled)
        }
    }

    fun toggleVibration() {
        viewModelScope.launch {
            preferencesStore.updateVibrationEnabled(!_uiState.value.vibrationEnabled)
        }
    }

    fun onQrDetected(rawValue: String) {
        val selectedKioskId = _uiState.value.selectedKioskId ?: return
        val normalizedValue = rawValue.trim()

        if (_uiState.value.uiState is ScannerUiState.Submitting) return
        if (!duplicateGuard.shouldAccept(normalizedValue, System.currentTimeMillis())) return

        if (!isValidQrToken(normalizedValue)) {
            rejectInvalidQrToken(normalizedValue)
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                uiState = ScannerUiState.Submitting(normalizedValue),
            )

            when (
                val result = withContext(dispatchersProvider.io) {
                    scannerRepository.submitScan(normalizedValue, selectedKioskId)
                }
            ) {
                is AppResult.Success -> handleServerResult(result.data)
                is AppResult.Failure -> handleConnectionFailure(result.message)
            }
        }
    }

    private fun rejectInvalidQrToken(rawValue: String) {
        val result = ScanResult(
            success = false,
            message = "Invalid QR code. Expected a 32-character student token.",
            action = "Rejected locally",
        )

        _uiState.value = _uiState.value.copy(
            uiState = ScannerUiState.Rejected(result),
            overlay = ScanOverlayState(success = false, result = result),
            recentScans = buildList {
                add(
                    RecentScanItem(
                        id = System.currentTimeMillis(),
                        success = false,
                        title = "Invalid QR code",
                        subtitle = rawValue.ifBlank { "Unsupported QR payload" },
                        time = null,
                        photoUrl = null,
                    )
                )
                addAll(_uiState.value.recentScans.take(9))
            },
        )

        viewModelScope.launch {
            _feedbackEvents.emit(
                ScannerFeedbackEvent(
                    playSuccessTone = false,
                    playFailureTone = _uiState.value.soundEnabled,
                    vibrate = _uiState.value.vibrationEnabled,
                )
            )
        }
        scheduleOverlayReset()
    }

    private suspend fun handleServerResult(result: ScanResult) {
        val nextState = if (result.success) {
            ScannerUiState.Success(result)
        } else {
            ScannerUiState.Rejected(result)
        }
        _uiState.value = _uiState.value.copy(
            uiState = nextState,
            overlay = ScanOverlayState(success = result.success, result = result),
            recentScans = buildList {
                add(result.toRecentScanItem())
                addAll(_uiState.value.recentScans.take(9))
            },
        )
        _feedbackEvents.emit(
            ScannerFeedbackEvent(
                playSuccessTone = result.success && _uiState.value.soundEnabled,
                playFailureTone = !result.success && _uiState.value.soundEnabled,
                vibrate = _uiState.value.vibrationEnabled,
            )
        )
        scheduleOverlayReset()
    }

    private suspend fun handleConnectionFailure(message: String) {
        _uiState.value = _uiState.value.copy(
            uiState = ScannerUiState.Error(message),
            overlay = ScanOverlayState(
                success = false,
                result = ScanResult(success = false, message = message),
            ),
            recentScans = buildList {
                add(
                    RecentScanItem(
                        id = System.currentTimeMillis(),
                        success = false,
                        title = "Connection failed",
                        subtitle = message,
                        time = null,
                        photoUrl = null,
                    )
                )
                addAll(_uiState.value.recentScans.take(9))
            },
        )
        _feedbackEvents.emit(
            ScannerFeedbackEvent(
                playSuccessTone = false,
                playFailureTone = _uiState.value.soundEnabled,
                vibrate = _uiState.value.vibrationEnabled,
            )
        )
        scheduleOverlayReset()
    }

    private fun scheduleOverlayReset() {
        overlayResetJob?.cancel()
        overlayResetJob = viewModelScope.launch {
            delay(5_000)
            _uiState.value = _uiState.value.copy(overlay = null)
        }
        viewModelScope.launch {
            delay(250)
            if (_uiState.value.uiState !is ScannerUiState.Submitting) {
                _uiState.value = _uiState.value.copy(uiState = ScannerUiState.Ready)
            }
        }
    }

    fun dismissOverlay() {
        _uiState.value = _uiState.value.copy(overlay = null)
    }

    private fun ScanResult.toRecentScanItem(): RecentScanItem = RecentScanItem(
        id = System.currentTimeMillis(),
        success = success,
        title = studentName ?: if (success) "Scan accepted" else "Scan rejected",
        subtitle = action ?: message,
        time = time,
        photoUrl = photoUrl,
    )
}
