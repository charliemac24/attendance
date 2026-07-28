package com.myosystems.attendance.core.network

import kotlinx.serialization.json.Json
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Test

class ApiErrorParserTest {
    private val parser = ApiErrorParser(
        json = Json { ignoreUnknownKeys = true }
    )

    @Test
    fun `parses message field from json`() {
        val exception = parser.parse(
            code = 401,
            fallback = "Unauthorized",
            body = """{"message":"Invalid credentials"}""".toResponseBody(),
        )

        assertEquals(401, exception.code)
        assertEquals("Invalid credentials", exception.message)
    }

    @Test
    fun `falls back to raw text when body is not json`() {
        val exception = parser.parse(
            code = 500,
            fallback = "Server error",
            body = "Server exploded".toResponseBody(),
        )

        assertEquals("Server exploded", exception.message)
    }
}
