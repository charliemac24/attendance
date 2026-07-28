package com.myosystems.attendance.feature.scanner

class ScannerDuplicateGuard(
    private val cooldownMs: Long = 1_500L,
) {
    private var lastToken: String? = null
    private var lastAcceptedAtMs: Long = 0L

    fun shouldAccept(token: String, nowMs: Long): Boolean {
        val normalized = token.trim()
        if (normalized.isEmpty()) return false
        if (lastToken == normalized && nowMs - lastAcceptedAtMs < cooldownMs) {
            return false
        }
        lastToken = normalized
        lastAcceptedAtMs = nowMs
        return true
    }

    fun reset() {
        lastToken = null
        lastAcceptedAtMs = 0L
    }
}
