package com.myosystems.attendance.data.remote.auth

import com.myosystems.attendance.core.model.AuthUser
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.SchoolBranding
import com.myosystems.attendance.core.model.SchoolSummary
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.network.resolveApiUrl

fun AuthUserDto.toDomain(): AuthUser = AuthUser(
    id = id,
    username = username,
    email = email,
    fullName = fullName,
    role = UserRole.fromBackend(role),
    schoolId = schoolId,
    selectedSchoolId = selectedSchoolId,
    school = school?.let {
        SchoolSummary(
            id = it.id,
            name = it.name,
            loginSlug = it.loginSlug,
            logoUrl = resolveApiUrl(it.logoUrl),
            timezone = it.timezone,
        )
    },
)

fun SchoolBrandingDto.toDomain(): SchoolBranding = SchoolBranding(
    school = school?.let {
        SchoolSummary(
            id = it.id,
            name = it.name,
            loginSlug = it.loginSlug,
            logoUrl = resolveApiUrl(it.logoUrl),
            timezone = it.timezone,
        )
    },
    displayName = displayName,
    logoUrl = resolveApiUrl(logoUrl),
)

fun PlatformSchoolDto.toDomain(): PlatformSchool = PlatformSchool(
    id = id,
    name = name,
    timezone = timezone,
    lateTime = lateTime,
    cutoffTime = cutoffTime,
    smsEnabled = smsEnabled,
    smsProvider = smsProvider,
    semaphoreApiKey = semaphoreApiKey,
    semaphoreSenderName = semaphoreSenderName,
    monthlySmsCredits = monthlySmsCredits,
    smsOverageRateCents = smsOverageRateCents,
    loginSlug = loginSlug,
)

fun PlatformUserDto.toDomain(): PlatformUser = PlatformUser(
    id = id,
    username = username,
    email = email,
    fullName = fullName,
    role = UserRole.fromBackend(role),
    schoolId = schoolId,
    teacherSectionIds = teacherSectionIds,
)
