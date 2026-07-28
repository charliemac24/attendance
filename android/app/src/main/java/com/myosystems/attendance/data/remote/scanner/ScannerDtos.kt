package com.myosystems.attendance.data.remote.scanner

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class KioskLocationDto(
    @SerialName("id") val id: Int,
    @SerialName("schoolId") val schoolId: Int,
    @SerialName("name") val name: String,
    @SerialName("slug") val slug: String,
)

@Serializable
data class KioskScanRequestDto(
    @SerialName("qrToken") val qrToken: String,
    @SerialName("kioskLocationId") val kioskLocationId: Int,
)

@Serializable
data class ScanResultDto(
    @SerialName("success") val success: Boolean,
    @SerialName("message") val message: String,
    @SerialName("studentName") val studentName: String? = null,
    @SerialName("photoUrl") val photoUrl: String? = null,
    @SerialName("status") val status: String? = null,
    @SerialName("action") val action: String? = null,
    @SerialName("time") val time: String? = null,
)
