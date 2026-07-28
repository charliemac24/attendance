package com.myosystems.attendance

import android.graphics.Color.parseColor
import android.os.Bundle
import android.os.StrictMode
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.BuildConfig
import com.myosystems.attendance.core.designsystem.theme.MyoAttendanceTheme
import com.myosystems.attendance.feature.app.AttendanceApp
import com.myosystems.attendance.feature.app.AppStateViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build(),
            )
        }
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(parseColor("#0E5CCF")),
            navigationBarStyle = SystemBarStyle.light(parseColor("#FFFFFF"), parseColor("#FFFFFF")),
        )

        setContent {
            val viewModel: AppStateViewModel = androidx.hilt.navigation.compose.hiltViewModel()
            val appState = viewModel.uiState.collectAsStateWithLifecycle()

            splashScreen.setKeepOnScreenCondition {
                appState.value.isInitializing
            }

            MyoAttendanceTheme {
                AttendanceApp(
                    appState = appState.value,
                    onRetryStartup = viewModel::refreshSession,
                    onLoginSuccess = viewModel::onLoginSucceeded,
                    onLogout = viewModel::logout,
                )
            }
        }
    }
}
