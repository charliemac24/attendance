package com.myosystems.attendance.core.network

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.ResponseBody

@Singleton
class ApiErrorParser @Inject constructor(
    private val json: Json,
) {
    fun parse(code: Int, fallback: String, body: ResponseBody?): ApiException {
        val raw = body?.string().orEmpty().trim()
        if (raw.isEmpty()) {
            return ApiException(code, fallback)
        }

        val message = runCatching {
            json.decodeFromString(ApiErrorPayload.serializer(), raw).message
        }.getOrNull()?.takeIf { it.isNotBlank() }
            ?: runCatching { json.decodeFromString(ApiErrorPayload.serializer(), raw).error }.getOrNull()?.takeIf { it.isNotBlank() }
            ?: raw

        return ApiException(code, message)
    }
}

@Serializable
private data class ApiErrorPayload(
    @SerialName("message") val message: String? = null,
    @SerialName("error") val error: String? = null,
)
