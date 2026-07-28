package com.myosystems.attendance.core.auth

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow

@Singleton
class SessionExpiryHandler @Inject constructor() {
    private val _events = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val events: SharedFlow<Unit> = _events

    fun onUnauthorized() {
        _events.tryEmit(Unit)
    }
}
