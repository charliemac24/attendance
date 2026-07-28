package com.myosystems.attendance.core.common

sealed interface AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>

    data class Failure(
        val message: String,
        val code: Int? = null,
        val cause: Throwable? = null,
    ) : AppResult<Nothing>
}
