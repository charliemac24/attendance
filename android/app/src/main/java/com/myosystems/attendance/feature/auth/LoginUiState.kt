package com.myosystems.attendance.feature.auth

import com.myosystems.attendance.core.model.SchoolBranding

data class LoginUiState(
    val schoolSlug: String = "",
    val username: String = "",
    val password: String = "",
    val isPasswordVisible: Boolean = false,
    val isSubmitting: Boolean = false,
    val isLoadingBranding: Boolean = false,
    val branding: SchoolBranding? = null,
    val errorMessage: String? = null,
)
