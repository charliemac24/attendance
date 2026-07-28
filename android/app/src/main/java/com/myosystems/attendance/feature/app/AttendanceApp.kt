package com.myosystems.attendance.feature.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Domain
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.myosystems.attendance.core.navigation.AppDestination
import com.myosystems.attendance.core.navigation.AppNavHost

@Composable
fun AttendanceApp(
    appState: AppState,
    onRetryStartup: () -> Unit,
    onLoginSuccess: () -> Unit,
    onLogout: () -> Unit,
) {
    val navController = rememberNavController()
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val (isDashboardDrawerOpen, setDashboardDrawerOpen) = remember { mutableStateOf(false) }
    val targetRoute = when {
        appState.isInitializing -> AppDestination.Splash.route
        appState.isAuthenticated -> AppDestination.Home.route
        else -> AppDestination.Login.route
    }
    val showBottomBar = appState.isAuthenticated &&
        currentRoute != null &&
        currentRoute != AppDestination.Login.route &&
        !isDashboardDrawerOpen

    LaunchedEffect(targetRoute) {
        if (currentRoute != targetRoute) {
            navController.navigate(targetRoute) {
                popUpTo(navController.graph.startDestinationId) {
                    inclusive = true
                }
                launchSingleTop = true
            }
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            if (showBottomBar) {
                Surface(
                    color = Color.White,
                    modifier = Modifier.navigationBarsPadding(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp, bottom = 8.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                    ) {
                        AppBottomItem(
                            selected = currentRoute == AppDestination.Home.route,
                            icon = { Icon(Icons.Outlined.Home, contentDescription = "Home") },
                            label = "Home",
                            onClick = { navController.navigateToRoot(AppDestination.Home.route) },
                        )
                        AppBottomItem(
                            selected = currentRoute == AppDestination.Students.route,
                            icon = { Icon(Icons.Outlined.Group, contentDescription = "Students") },
                            label = "Students",
                            onClick = { navController.navigateToRoot(AppDestination.Students.route) },
                        )
                        AppBottomItem(
                            selected = currentRoute == AppDestination.HomeGrades.route,
                            icon = { Icon(Icons.Outlined.BarChart, contentDescription = "Today") },
                            label = "By Grade",
                            onClick = { navController.navigateToRoot(AppDestination.HomeGrades.route) },
                        )
                        AppBottomItem(
                            selected = currentRoute?.startsWith("today/") == true &&
                                currentRoute == AppDestination.TodayStatus.routeFor("pending-checkout"),
                            icon = { Icon(Icons.Outlined.Domain, contentDescription = "On Campus") },
                            label = "On Campus",
                            onClick = { navController.navigateToRoot(AppDestination.TodayStatus.routeFor("pending-checkout")) },
                        )
                    }
                }
            }
        },
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
        ) {
            AppNavHost(
                navController = navController,
                startDestination = AppDestination.Splash.route,
                appState = appState,
                startupError = appState.startupError,
                onRetryStartup = onRetryStartup,
                onLoginSuccess = onLoginSuccess,
                onLogout = onLogout,
                onOpenScanner = { navController.navigateTo(AppDestination.Scanner.route) },
                onOpenAdmin = { navController.navigateTo(AppDestination.Admin.route) },
                onOpenStudents = { navController.navigateTo(AppDestination.Students.route) },
                onOpenSettings = { navController.navigateTo(AppDestination.Settings.route) },
                onOpenSms = { navController.navigateTo(AppDestination.Sms.route) },
                onOpenReports = { navController.navigateTo(AppDestination.Reports.route) },
                onOpenPlatformAdmin = { navController.navigateTo(AppDestination.PlatformAdmin.route) },
                onOpenAccounts = { navController.navigateTo(AppDestination.PlatformAdmin.route) },
                onOpenStatus = { statusKey -> navController.navigateTo(AppDestination.TodayStatus.routeFor(statusKey)) },
                onBackFromScanner = { navController.popBackStack() },
                onBackFromAdmin = { navController.popBackStack() },
                onBackFromStudents = { navController.popBackStack() },
                onBackFromSettings = { navController.popBackStack() },
                onBackFromSms = { navController.popBackStack() },
                onBackFromReports = { navController.popBackStack() },
                onBackFromPlatformAdmin = { navController.popBackStack() },
                onRefreshSession = onRetryStartup,
                onBackFromTodayStatus = { navController.popBackStack() },
                onDashboardDrawerVisibilityChanged = setDashboardDrawerOpen,
            )
        }
    }
}

private fun NavHostController.navigateTo(route: String) {
    navigate(route) {
        launchSingleTop = true
    }
}

private fun NavHostController.navigateToRoot(route: String) {
    navigate(route) {
        popUpTo(graph.startDestinationId) {
            saveState = true
        }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
private fun AppBottomItem(
    selected: Boolean,
    icon: @Composable () -> Unit,
    label: String,
    onClick: () -> Unit,
) {
    val baseColor = Color(0xFF141414)
    val itemColor = if (selected) baseColor else baseColor.copy(alpha = 0.68f)
    Column(
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(top = 6.dp, bottom = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        androidx.compose.runtime.CompositionLocalProvider(
            androidx.compose.material3.LocalContentColor provides itemColor,
        ) {
            icon()
            Text(label, color = itemColor)
        }
    }
}
