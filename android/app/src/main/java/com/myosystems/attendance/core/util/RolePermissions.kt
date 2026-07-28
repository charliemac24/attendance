package com.myosystems.attendance.core.util

import com.myosystems.attendance.core.model.UserRole

data class RolePermissions(
    val canAccessDashboard: Boolean,
    val canAccessScanner: Boolean,
    val canManageSchools: Boolean,
    val canManageUsers: Boolean,
    val canManageStudents: Boolean,
    val canManageSettings: Boolean,
    val canAccessReports: Boolean,
    val canManualCheckIn: Boolean,
    val canManualCheckOut: Boolean,
    val canMarkAbsent: Boolean,
    val canMarkExcused: Boolean,
    val canClearRecentActivity: Boolean,
)

fun permissionsFor(role: UserRole): RolePermissions = when (role) {
    UserRole.SUPER_ADMIN -> RolePermissions(true, true, true, true, true, true, true, true, true, true, true, true)
    UserRole.SCHOOL_ADMIN -> RolePermissions(true, true, false, true, true, true, true, true, true, true, true, true)
    UserRole.GATE_STAFF -> RolePermissions(true, true, false, false, false, false, true, true, true, true, true, false)
    UserRole.TEACHER -> RolePermissions(true, false, false, false, false, false, true, true, false, true, true, false)
    UserRole.UNKNOWN -> RolePermissions(false, false, false, false, false, false, false, false, false, false, false, false)
}
