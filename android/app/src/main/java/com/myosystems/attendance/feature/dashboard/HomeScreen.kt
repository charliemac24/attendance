package com.myosystems.attendance.feature.dashboard

import androidx.compose.runtime.Composable
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.feature.app.AppState
import com.myosystems.attendance.core.util.permissionsFor
import com.myosystems.attendance.feature.today.TodayStatusType

@Composable
fun HomeScreen(
    appState: AppState,
    scrollToGradeBreakdown: Boolean,
    onDrawerVisibilityChanged: (Boolean) -> Unit,
    onLogout: () -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAdmin: () -> Unit,
    onOpenStudents: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenSms: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenPlatformAdmin: () -> Unit,
    onOpenAccounts: () -> Unit,
    onOpenStatus: (TodayStatusType) -> Unit,
) {
    val user = appState.user ?: return
    val permissions = permissionsFor(user.role)
    val canOpenStudents = user.role == UserRole.SUPER_ADMIN ||
        user.role == UserRole.SCHOOL_ADMIN ||
        user.role == UserRole.TEACHER ||
        user.role == UserRole.GATE_STAFF
    val canOpenOnCampus = user.role == UserRole.SUPER_ADMIN ||
        user.role == UserRole.TEACHER ||
        user.role == UserRole.GATE_STAFF
    val canOpenAbsences = user.role == UserRole.SUPER_ADMIN ||
        user.role == UserRole.TEACHER
    val showDashboardKpis = true
    val showMissedCheckoutSection = user.role == UserRole.SUPER_ADMIN ||
        user.role == UserRole.SCHOOL_ADMIN
    val showAttentionSection = user.role != UserRole.GATE_STAFF
    val showGradeBreakdownSection = true
    val showRecentActivitySection = true
    val canOpenAccounts = user.role == UserRole.SCHOOL_ADMIN

    DashboardRoute(
        userName = user.fullName,
        userRole = user.role,
        schoolName = user.school?.name ?: "No school selected",
        scrollToGradeBreakdown = scrollToGradeBreakdown,
        onDrawerVisibilityChanged = onDrawerVisibilityChanged,
        onLogout = onLogout,
        canOpenScanner = permissions.canAccessScanner,
        onOpenScanner = onOpenScanner,
        canOpenAdmin = permissions.canManageStudents || permissions.canManageSettings,
        onOpenAdmin = onOpenAdmin,
        canOpenStudents = canOpenStudents,
        onOpenStudents = onOpenStudents,
        canOpenSettings = permissions.canManageSettings,
        onOpenSettings = onOpenSettings,
        canOpenSms = permissions.canManageSettings,
        onOpenSms = onOpenSms,
        canOpenReports = permissions.canAccessReports,
        onOpenReports = onOpenReports,
        canOpenPlatformAdmin = user.role == UserRole.SUPER_ADMIN,
        onOpenPlatformAdmin = onOpenPlatformAdmin,
        canOpenAccounts = canOpenAccounts,
        onOpenAccounts = onOpenAccounts,
        canOpenOnCampus = canOpenOnCampus,
        canOpenAbsences = canOpenAbsences,
        showDashboardKpis = showDashboardKpis,
        showMissedCheckoutSection = showMissedCheckoutSection,
        showAttentionSection = showAttentionSection,
        showGradeBreakdownSection = showGradeBreakdownSection,
        showRecentActivitySection = showRecentActivitySection,
        onOpenStatus = onOpenStatus,
    )
}
