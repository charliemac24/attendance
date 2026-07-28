package com.myosystems.attendance.core.network

import com.myosystems.attendance.core.common.AppResult
import retrofit2.Response

suspend fun <T> Response<T>.toAppResult(apiErrorParser: ApiErrorParser): AppResult<T> {
    return if (isSuccessful) {
        val body = body()
        if (body != null) {
            AppResult.Success(body)
        } else {
            AppResult.Failure("Empty response body", code())
        }
    } else {
        val error = apiErrorParser.parse(code(), message().ifBlank { "Request failed" }, errorBody())
        AppResult.Failure(error.message, error.code, error)
    }
}
