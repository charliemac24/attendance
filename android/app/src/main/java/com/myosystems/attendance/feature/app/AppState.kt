package com.myosystems.attendance.feature.app

import com.myosystems.attendance.core.model.AuthUser

data class AppState(
    val isInitializing: Boolean = true,
    val user: AuthUser? = null,
    val startupError: String? = null,
) {
    val isAuthenticated: Boolean = user != null
}
