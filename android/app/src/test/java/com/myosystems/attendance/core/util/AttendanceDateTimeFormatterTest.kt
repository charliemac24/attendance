package com.myosystems.attendance.core.util

import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class AttendanceDateTimeFormatterTest {
    @Test
    fun `returns Philippine ISO date for supplied clock`() {
        val clock = Clock.fixed(Instant.parse("2026-07-10T16:30:00Z"), ZoneId.of(PHILIPPINE_TIME_ZONE))
        assertEquals("2026-07-11", philippineIsoDate(clock))
    }

    @Test
    fun `offset helper shifts Philippine date`() {
        val clock = Clock.fixed(Instant.parse("2026-07-10T16:30:00Z"), ZoneId.of(PHILIPPINE_TIME_ZONE))
        assertEquals("2026-07-10", philippineIsoDateWithOffset(-1, clock))
    }

    @Test
    fun `formats database wall clock time without timezone conversion`() {
        assertEquals("03:45 AM", formatDatabaseTime("2026-03-26 03:45:05"))
    }
}
