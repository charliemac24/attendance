package com.myosystems.attendance.core.util

import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

const val PHILIPPINE_TIME_ZONE = "Asia/Manila"

private val isoFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
private val displayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH)

fun philippineIsoDate(clock: Clock = Clock.system(ZoneId.of(PHILIPPINE_TIME_ZONE))): String =
    LocalDate.now(clock).format(isoFormatter)

fun philippineIsoDateWithOffset(offsetDays: Long, clock: Clock = Clock.system(ZoneId.of(PHILIPPINE_TIME_ZONE))): String =
    LocalDate.now(clock).plusDays(offsetDays).format(isoFormatter)

fun formatIsoDateForDisplay(value: String): String {
    return runCatching {
        LocalDate.parse(value, isoFormatter).format(displayDateFormatter)
    }.getOrDefault(value)
}

fun formatDatabaseTime(value: String?): String {
    if (value.isNullOrBlank()) return "-"

    val normalized = value.replace("T", " ").removeSuffix("Z")
    val match = Regex("(\\d{1,2}):(\\d{2})(?::\\d{2})?$").find(normalized) ?: return normalized
    val hour24 = match.groupValues[1].toIntOrNull() ?: return normalized
    val minute = match.groupValues[2]
    val period = if (hour24 >= 12) "PM" else "AM"
    val hour12 = (hour24 % 12).let { if (it == 0) 12 else it }
    return String.format(Locale.ENGLISH, "%02d:%s %s", hour12, minute, period)
}
