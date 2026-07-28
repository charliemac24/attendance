package com.myosystems.attendance.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = MyoBlue,
    secondary = MyoBlueDark,
    tertiary = MyoMint,
)

private val DarkColors = darkColorScheme(
    primary = MyoMint,
    secondary = MyoBlue,
    tertiary = MyoBlueDark,
    surface = SurfaceDark,
)

@Composable
fun MyoAttendanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
