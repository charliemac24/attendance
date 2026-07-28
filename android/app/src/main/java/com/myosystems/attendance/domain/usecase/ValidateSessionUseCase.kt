package com.myosystems.attendance.domain.usecase

import com.myosystems.attendance.core.common.AppResult
import com.myosystems.attendance.core.model.AuthUser
import com.myosystems.attendance.domain.repository.AuthRepository
import javax.inject.Inject

class ValidateSessionUseCase @Inject constructor(
    private val authRepository: AuthRepository,
) {
    suspend operator fun invoke(): AppResult<AuthUser?> = authRepository.getCurrentUser()
}
