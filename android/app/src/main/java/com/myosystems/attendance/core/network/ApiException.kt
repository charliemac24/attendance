package com.myosystems.attendance.core.network

class ApiException(
    val code: Int,
    override val message: String,
) : RuntimeException(message)
