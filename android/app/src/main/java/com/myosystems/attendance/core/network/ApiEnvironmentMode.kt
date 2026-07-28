package com.myosystems.attendance.core.network

import com.myosystems.attendance.BuildConfig

enum class ApiEnvironmentMode(
    val storageValue: String,
    val displayName: String,
    val baseUrl: String,
) {
    TESTING(
        storageValue = "testing",
        displayName = "Testing",
        baseUrl = "http://10.0.2.2:5100/",
    ),
    PRODUCTION(
        storageValue = "production",
        displayName = "Production",
        baseUrl = "https://attendance.myosystems.com/",
    );

    companion object {
        fun fromStorageValue(value: String?): ApiEnvironmentMode? =
            entries.firstOrNull { it.storageValue == value }

        fun default(): ApiEnvironmentMode {
            val baseUrl = BuildConfig.API_BASE_URL.lowercase()
            return when {
                "attendance.myosystems.com" in baseUrl -> PRODUCTION
                else -> TESTING
            }
        }
    }
}

object RuntimeApiConfig {
    @Volatile
    private var runtimeBaseUrl: String = ApiEnvironmentMode.default().baseUrl

    fun getBaseUrl(): String = runtimeBaseUrl

    fun setEnvironment(mode: ApiEnvironmentMode) {
        runtimeBaseUrl = mode.baseUrl
    }
}
