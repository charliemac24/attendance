package com.myosystems.attendance.core.util

private val qrTokenRegex = Regex("^[0-9a-f]{32}$", RegexOption.IGNORE_CASE)

fun isValidQrToken(value: String): Boolean = qrTokenRegex.matches(value.trim())
