package com.myosystems.attendance.core.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private val HeaderBlue = Color(0xFF0E5CCF)

@Composable
fun AppSectionTopBar(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    onOpenScanner: (() -> Unit)? = null,
    leading: (@Composable () -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Surface(color = HeaderBlue) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (leading != null) {
                        leading()
                    } else if (onBack != null) {
                        HeaderIconAction(
                            onClick = onBack,
                            contentDescription = "Back",
                        ) {
                            Icon(
                                Icons.AutoMirrored.Outlined.ArrowBack,
                                contentDescription = null,
                                tint = Color.White,
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(40.dp))
                    }
                    Column {
                        Text(title, color = Color.White, fontWeight = FontWeight.SemiBold)
                        if (subtitle != null) {
                            Text(
                                subtitle,
                                style = MaterialTheme.typography.labelMedium,
                                color = Color.White.copy(alpha = 0.86f),
                            )
                        }
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    content = {
                        if (onOpenScanner != null) {
                            HeaderIconAction(
                                onClick = onOpenScanner,
                                contentDescription = "Open scanner",
                            ) {
                                Icon(
                                    Icons.Outlined.QrCodeScanner,
                                    contentDescription = null,
                                    tint = Color.White,
                                )
                            }
                        }
                        CompositionLocalProvider(LocalContentColor provides Color.White) {
                            actions()
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun HeaderIconAction(
    onClick: () -> Unit,
    contentDescription: String,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .padding(2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            onClick = onClick,
            shape = RoundedCornerShape(12.dp),
            color = Color.Transparent,
        ) {
            Box(
                modifier = Modifier.size(36.dp),
                contentAlignment = Alignment.Center,
            ) {
                content()
            }
        }
    }
}
