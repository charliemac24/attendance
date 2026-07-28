package com.myosystems.attendance.core.navigation

sealed class AppDestination(val route: String) {
    data object Splash : AppDestination("splash")
    data object Login : AppDestination("login")
    data object Home : AppDestination("home")
    data object HomeGrades : AppDestination("home-grades")
    data object Scanner : AppDestination("scanner")
    data object Students : AppDestination("students")
    data object Settings : AppDestination("settings")
    data object Sms : AppDestination("sms")
    data object Admin : AppDestination("admin")
    data object Reports : AppDestination("reports")
    data object PlatformAdmin : AppDestination("platform-admin")
    data object TodayStatus : AppDestination("today/{statusKey}") {
        fun routeFor(statusKey: String): String = "today/$statusKey"
    }
}
