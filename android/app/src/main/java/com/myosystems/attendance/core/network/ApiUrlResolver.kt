package com.myosystems.attendance.core.network

fun resolveApiUrl(value: String?): String? {
    if (value.isNullOrBlank()) return null
    if (value.startsWith("http://") || value.startsWith("https://")) return value

    val baseUrl = RuntimeApiConfig.getBaseUrl().trimEnd('/')
    val path = if (value.startsWith("/")) value else "/$value"
    return "$baseUrl$path"
}
