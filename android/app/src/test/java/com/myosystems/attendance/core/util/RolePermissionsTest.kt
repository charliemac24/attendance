package com.myosystems.attendance.core.util

import com.myosystems.attendance.core.model.UserRole
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RolePermissionsTest {
    @Test
    fun `super admin has school management access`() {
        val permissions = permissionsFor(UserRole.SUPER_ADMIN)
        assertTrue(permissions.canManageSchools)
        assertTrue(permissions.canManageUsers)
    }

    @Test
    fun `teacher does not have scanner access`() {
        val permissions = permissionsFor(UserRole.TEACHER)
        assertFalse(permissions.canAccessScanner)
        assertTrue(permissions.canAccessReports)
    }
}
