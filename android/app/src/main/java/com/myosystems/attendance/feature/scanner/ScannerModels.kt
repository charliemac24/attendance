package com.myosystems.attendance.feature.scanner

import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.ScanResult

sealed interface ScannerUiState {
    data object Initializing : ScannerUiState
    data object Ready : ScannerUiState
    data class Submitting(val rawValue: String) : ScannerUiState
    data class Success(val result: ScanResult) : ScannerUiState
    data class Rejected(val result: ScanResult) : ScannerUiState
    data class Error(val message: String) : ScannerUiState
}

data class ScannerScreenState(
    val isLoading: Boolean = true,
    val uiState: ScannerUiState = ScannerUiState.Initializing,
    val overlay: ScanOverlayState? = null,
    val kiosks: List<KioskLocation> = emptyList(),
    val selectedKioskId: Int? = null,
    val recentScans: List<RecentScanItem> = emptyList(),
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
)

data class ScanOverlayState(
    val success: Boolean,
    val result: ScanResult,
)

data class RecentScanItem(
    val id: Long,
    val success: Boolean,
    val title: String,
    val subtitle: String,
    val time: String?,
    val photoUrl: String?,
)

data class ScannerFeedbackEvent(
    val playSuccessTone: Boolean,
    val playFailureTone: Boolean,
    val vibrate: Boolean,
)
