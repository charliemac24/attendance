package com.myosystems.attendance.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.myosystems.attendance.feature.app.AppState
import com.myosystems.attendance.feature.admin.AdminRoute
import com.myosystems.attendance.feature.auth.LoginRoute
import com.myosystems.attendance.feature.dashboard.HomeScreen
import com.myosystems.attendance.feature.platform.PlatformAdminRoute
import com.myosystems.attendance.feature.reports.ReportsRoute
import com.myosystems.attendance.feature.scanner.ScannerRoute
import com.myosystems.attendance.feature.settings.SettingsRoute
import com.myosystems.attendance.feature.sms.SmsRoute
import com.myosystems.attendance.feature.startup.StartupScreen
import com.myosystems.attendance.feature.students.StudentsRoute
import com.myosystems.attendance.feature.today.TodayStatusRoute

@Composable
fun AppNavHost(
    navController: NavHostController,
    startDestination: String,
    appState: AppState,
    startupError: String?,
    onRetryStartup: () -> Unit,
    onLoginSuccess: () -> Unit,
    onLogout: () -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAdmin: () -> Unit,
    onOpenStudents: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenSms: () -> Unit,
    onOpenReports: () -> Unit,
    onOpenPlatformAdmin: () -> Unit,
    onOpenAccounts: () -> Unit,
    onOpenStatus: (String) -> Unit,
    onBackFromScanner: () -> Unit,
    onBackFromAdmin: () -> Unit,
    onBackFromStudents: () -> Unit,
    onBackFromSettings: () -> Unit,
    onBackFromSms: () -> Unit,
    onBackFromReports: () -> Unit,
    onBackFromPlatformAdmin: () -> Unit,
    onRefreshSession: () -> Unit,
    onBackFromTodayStatus: () -> Unit,
    onDashboardDrawerVisibilityChanged: (Boolean) -> Unit,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {
        composable(AppDestination.Splash.route) {
            StartupScreen(
                errorMessage = startupError,
                onRetry = onRetryStartup,
            )
        }
        composable(AppDestination.Login.route) {
            LoginRoute(onLoginSuccess = onLoginSuccess)
        }
        composable(AppDestination.Home.route) {
            HomeScreen(
                appState = appState,
                scrollToGradeBreakdown = false,
                onDrawerVisibilityChanged = onDashboardDrawerVisibilityChanged,
                onLogout = onLogout,
                onOpenScanner = onOpenScanner,
                onOpenAdmin = onOpenAdmin,
                onOpenStudents = onOpenStudents,
                onOpenSettings = onOpenSettings,
                onOpenSms = onOpenSms,
                onOpenReports = onOpenReports,
                onOpenPlatformAdmin = onOpenPlatformAdmin,
                onOpenAccounts = onOpenAccounts,
                onOpenStatus = { onOpenStatus(it.routeKey) },
            )
        }
        composable(AppDestination.HomeGrades.route) {
            HomeScreen(
                appState = appState,
                scrollToGradeBreakdown = true,
                onDrawerVisibilityChanged = onDashboardDrawerVisibilityChanged,
                onLogout = onLogout,
                onOpenScanner = onOpenScanner,
                onOpenAdmin = onOpenAdmin,
                onOpenStudents = onOpenStudents,
                onOpenSettings = onOpenSettings,
                onOpenSms = onOpenSms,
                onOpenReports = onOpenReports,
                onOpenPlatformAdmin = onOpenPlatformAdmin,
                onOpenAccounts = onOpenAccounts,
                onOpenStatus = { onOpenStatus(it.routeKey) },
            )
        }
        composable(AppDestination.Scanner.route) {
            onDashboardDrawerVisibilityChanged(false)
            ScannerRoute(onBack = onBackFromScanner)
        }
        composable(AppDestination.Students.route) {
            onDashboardDrawerVisibilityChanged(false)
            StudentsRoute(
                onBack = onBackFromStudents,
                onOpenScanner = onOpenScanner,
            )
        }
        composable(AppDestination.Settings.route) {
            onDashboardDrawerVisibilityChanged(false)
            SettingsRoute(
                onBack = onBackFromSettings,
                onOpenScanner = onOpenScanner,
            )
        }
        composable(AppDestination.Sms.route) {
            onDashboardDrawerVisibilityChanged(false)
            SmsRoute(
                onBack = onBackFromSms,
                onOpenScanner = onOpenScanner,
            )
        }
        composable(AppDestination.Admin.route) {
            onDashboardDrawerVisibilityChanged(false)
            AdminRoute(
                onBack = onBackFromAdmin,
                onOpenScanner = onOpenScanner,
            )
        }
        composable(AppDestination.Reports.route) {
            onDashboardDrawerVisibilityChanged(false)
            ReportsRoute(
                onBack = onBackFromReports,
                onOpenScanner = onOpenScanner,
            )
        }
        composable(AppDestination.PlatformAdmin.route) {
            onDashboardDrawerVisibilityChanged(false)
            PlatformAdminRoute(
                onBack = onBackFromPlatformAdmin,
                onOpenScanner = onOpenScanner,
                onRefreshSession = onRefreshSession,
            )
        }
        composable(
            route = AppDestination.TodayStatus.route,
            arguments = listOf(navArgument("statusKey") { type = NavType.StringType }),
        ) {
            onDashboardDrawerVisibilityChanged(false)
            TodayStatusRoute(
                onBack = onBackFromTodayStatus,
                onOpenScanner = onOpenScanner,
            )
        }
    }
}
