package com.myosystems.attendance.data.remote.scanner

import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.ScanResult
import com.myosystems.attendance.core.network.resolveApiUrl

fun KioskLocationDto.toDomain(): KioskLocation = KioskLocation(
    id = id,
    schoolId = schoolId,
    name = name,
    slug = slug,
)

fun ScanResultDto.toDomain(): ScanResult = ScanResult(
    success = success,
    message = message,
    studentName = studentName,
    photoUrl = resolveApiUrl(photoUrl),
    status = status,
    action = action,
    time = time,
)
