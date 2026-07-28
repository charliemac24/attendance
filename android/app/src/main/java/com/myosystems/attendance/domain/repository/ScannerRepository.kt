package com.myosystems.attendance.domain.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.ScanResult

interface ScannerRepository {
    suspend fun getKiosks(): AppResult<List<KioskLocation>>
    suspend fun submitScan(qrToken: String, kioskLocationId: Int): AppResult<ScanResult>
}
