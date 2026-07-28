package com.myosystems.attendance.feature.scanner

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScannerDuplicateGuardTest {
    @Test
    fun `suppresses duplicate token inside cooldown window`() {
        val guard = ScannerDuplicateGuard(cooldownMs = 1_500L)

        assertTrue(guard.shouldAccept("token", 1_000L))
        assertFalse(guard.shouldAccept("token", 1_900L))
        assertTrue(guard.shouldAccept("token", 2_700L))
    }
}
