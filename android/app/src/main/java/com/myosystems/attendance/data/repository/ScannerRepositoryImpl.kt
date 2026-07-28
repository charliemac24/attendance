package com.myosystems.attendance.data.repository

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.ScanResult
import com.myosystems.attendance.core.network.ApiErrorParser
import com.myosystems.attendance.core.network.toAppResult
import com.myosystems.attendance.data.remote.scanner.KioskScanRequestDto
import com.myosystems.attendance.data.remote.scanner.ScannerApiService
import com.myosystems.attendance.data.remote.scanner.toDomain
import com.myosystems.attendance.domain.repository.ScannerRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScannerRepositoryImpl @Inject constructor(
    private val scannerApiService: ScannerApiService,
    private val apiErrorParser: ApiErrorParser,
) : ScannerRepository {
    override suspend fun getKiosks(): AppResult<List<KioskLocation>> {
        return when (val result = scannerApiService.getKiosks().toAppResult(apiErrorParser)) {
            is AppResult.Success -> AppResult.Success(result.data.map { it.toDomain() })
            is AppResult.Failure -> result
        }
    }

    override suspend fun submitScan(qrToken: String, kioskLocationId: Int): AppResult<ScanResult> {
        return when (
            val result = scannerApiService.submitScan(
                KioskScanRequestDto(qrToken = qrToken, kioskLocationId = kioskLocationId)
            ).toAppResult(apiErrorParser)
        ) {
            is AppResult.Success -> AppResult.Success(result.data.toDomain())
            is AppResult.Failure -> result
        }
    }
}
