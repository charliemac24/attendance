package com.myosystems.attendance.core.util

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QrTokenValidatorTest {
    @Test
    fun `accepts valid 32 character hex token`() {
        assertTrue(isValidQrToken("33d5ee4455aa77bb99cc11dd22ee33ff"))
    }

    @Test
    fun `rejects incomplete token`() {
        assertFalse(isValidQrToken("33d5ee4455aa77bb"))
    }
}
