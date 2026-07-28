package com.myosystems.attendance.core.model

data class KioskLocation(
    val id: Int,
    val schoolId: Int,
    val name: String,
    val slug: String,
)

data class ScanResult(
    val success: Boolean,
    val message: String,
    val studentName: String? = null,
    val photoUrl: String? = null,
    val status: String? = null,
    val action: String? = null,
    val time: String? = null,
)
