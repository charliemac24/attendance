package com.myosystems.attendance.data.remote.scanner

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ScannerApiService {
    @GET("api/kiosks")
    suspend fun getKiosks(): Response<List<KioskLocationDto>>

    @POST("api/kiosk/scan")
    suspend fun submitScan(
        @Body request: KioskScanRequestDto,
    ): Response<ScanResultDto>
}
