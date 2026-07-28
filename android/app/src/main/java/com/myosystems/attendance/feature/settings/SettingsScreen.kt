package com.myosystems.attendance.feature.settings

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppDateField
import com.myosystems.attendance.core.ui.AppDatePickerDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.model.SchoolSettings
import com.myosystems.attendance.core.network.ApiEnvironmentMode

@Composable
fun SettingsRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(Unit) {
        viewModel.messages.collect { snackbarHostState.showSnackbar(it) }
    }
    SettingsScreen(
        uiState = uiState,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRefresh = viewModel::pullToRefresh,
        onRetry = viewModel::refresh,
        onSettingsChange = viewModel::updateSettings,
        onSave = viewModel::saveSettings,
        onUploadLogo = viewModel::uploadLogo,
        onGenerateQr = viewModel::generateStudentQrTokens,
        onPurgeRangeChange = viewModel::updatePurgeRange,
        onPurgeOptionChange = viewModel::updatePurgeOptions,
        onApiEnvironmentChange = viewModel::updateApiEnvironment,
        onPurgeLogs = viewModel::purgeLogs,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SettingsScreen(
    uiState: SettingsUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onSettingsChange: ((SchoolSettings) -> SchoolSettings) -> Unit,
    onSave: () -> Unit,
    onUploadLogo: (ByteArray, String, String) -> Unit,
    onGenerateQr: () -> Unit,
    onPurgeRangeChange: (String?, String?) -> Unit,
    onPurgeOptionChange: (Boolean?, Boolean?) -> Unit,
    onApiEnvironmentChange: (ApiEnvironmentMode) -> Unit,
    onPurgeLogs: () -> Unit,
) {
    val settings = uiState.settings
    var showQrConfirm by remember { mutableStateOf(false) }
    var showPurgeConfirm by remember { mutableStateOf(false) }
    var showPurgeFromPicker by remember { mutableStateOf(false) }
    var showPurgeToPicker by remember { mutableStateOf(false) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val logoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        readFileSelection(context, uri)?.let { onUploadLogo(it.bytes, it.name, it.mimeType) }
    }

    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "School Settings",
                onBack = onBack,
                onOpenScanner = onOpenScanner,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier.fillMaxSize().padding(paddingValues),
        ) {
            when {
                uiState.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                settings == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(uiState.errorMessage ?: "Unable to load settings")
                        Button(onClick = onRetry) { Text("Retry") }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        if (uiState.canManageAppEnvironment) {
                            item {
                                Card {
                                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text("App environment", style = MaterialTheme.typography.titleMedium)
                                        Text(
                                            text = "Switch which backend this mobile app connects to. Testing uses the Android emulator loopback for your local server.",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            ApiEnvironmentMode.entries.forEach { mode ->
                                                FilterChip(
                                                    selected = uiState.apiEnvironment == mode,
                                                    onClick = { onApiEnvironmentChange(mode) },
                                                    label = { Text(mode.displayName) },
                                                )
                                            }
                                        }
                                        Text(
                                            text = uiState.apiBaseUrl,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                        item {
                            Card {
                                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("School profile", style = MaterialTheme.typography.titleMedium)
                                    if (settings.logoUrl != null) {
                                        AsyncImage(model = settings.logoUrl, contentDescription = settings.name, modifier = Modifier.fillMaxWidth())
                                    }
                                    OutlinedButton(onClick = { logoLauncher.launch(arrayOf("image/*")) }, enabled = uiState.canEdit && !uiState.isSaving) {
                                        Text("Upload logo")
                                    }
                                    SettingsField("School name", settings.name) { onSettingsChange { current -> current.copy(name = it) } }
                                    if (uiState.canManageLoginSlug) {
                                        SettingsField("Login slug", settings.loginSlug.orEmpty()) { onSettingsChange { current -> current.copy(loginSlug = it) } }
                                    }
                                    SettingsField("Timezone", settings.timezone ?: "Asia/Manila", enabled = false) {}
                                }
                            }
                        }
                        item {
                            Card {
                                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Attendance rules", style = MaterialTheme.typography.titleMedium)
                                    SettingsField("Late time", settings.lateTime?.take(5) ?: "08:00") { onSettingsChange { current -> current.copy(lateTime = it) } }
                                    SettingsField("Auto absent cutoff", settings.cutoffTime?.take(5) ?: "09:00") { onSettingsChange { current -> current.copy(cutoffTime = it) } }
                                    SettingsField("Minimum scan interval (seconds)", settings.minScanIntervalSeconds.toString()) {
                                        onSettingsChange { current -> current.copy(minScanIntervalSeconds = it.toIntOrNull() ?: current.minScanIntervalSeconds) }
                                    }
                                    SettingsField("Dismissal time", settings.dismissalTime?.take(5) ?: "15:00") { onSettingsChange { current -> current.copy(dismissalTime = it) } }
                                    SettingsField("Early out window (minutes)", settings.earlyOutWindowMinutes.toString()) {
                                        onSettingsChange { current -> current.copy(earlyOutWindowMinutes = it.toIntOrNull() ?: current.earlyOutWindowMinutes) }
                                    }
                                }
                            }
                        }
                        item {
                            Card {
                                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("SMS and dashboard", style = MaterialTheme.typography.titleMedium)
                                    ToggleRow("SMS enabled", settings.smsEnabled) { onSettingsChange { current -> current.copy(smsEnabled = it) } }
                                    SettingsField(
                                        label = "SMS provider",
                                        value = settings.smsProvider ?: "semaphore",
                                        enabled = false,
                                    ) {}
                                    SettingsField(
                                        label = "Semaphore API key",
                                        value = settings.semaphoreApiKey.orEmpty(),
                                        enabled = uiState.canEdit,
                                        visualTransformation = PasswordVisualTransformation(),
                                    ) {
                                        onSettingsChange { current -> current.copy(semaphoreApiKey = it) }
                                    }
                                    SettingsField("Semaphore sender name", settings.semaphoreSenderName.orEmpty(), enabled = uiState.canEdit) {
                                        onSettingsChange { current -> current.copy(semaphoreSenderName = it) }
                                    }
                                    ToggleRow("Absent SMS enabled", settings.absentSmsEnabled) { onSettingsChange { current -> current.copy(absentSmsEnabled = it) } }
                                    ToggleRow("Show students needing attention", settings.showStudentsNeedingAttention) { onSettingsChange { current -> current.copy(showStudentsNeedingAttention = it) } }
                                }
                            }
                        }
                        item {
                            Button(onClick = onSave, enabled = uiState.canEdit && !uiState.isSaving, modifier = Modifier.fillMaxWidth()) {
                                Text(if (uiState.isSaving) "Saving..." else "Save settings")
                            }
                        }
                        item {
                            Card {
                                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text("Student QR tokens", style = MaterialTheme.typography.titleMedium)
                                    Text("Generate QR tokens for all students from their student numbers. Old printed QR codes may stop working.")
                                    OutlinedButton(onClick = { showQrConfirm = true }, enabled = uiState.canEdit) {
                                        Text("Generate QR codes from student numbers")
                                    }
                                }
                            }
                        }
                        if (uiState.canPurgeLogs) {
                            item {
                                Card {
                                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Icon(Icons.Outlined.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                            Text("Purge logs", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
                                        }
                                        AppDateField(
                                            value = uiState.purgeFrom,
                                            label = "From",
                                            onClick = { showPurgeFromPicker = true },
                                        )
                                        AppDateField(
                                            value = uiState.purgeTo,
                                            label = "To",
                                            onClick = { showPurgeToPicker = true },
                                        )
                                        ToggleRow("Delete attendance", uiState.purgeDeleteAttendance) { onPurgeOptionChange(it, null) }
                                        ToggleRow("Delete SMS logs", uiState.purgeDeleteSms) { onPurgeOptionChange(null, it) }
                                        Button(
                                            onClick = { showPurgeConfirm = true },
                                            enabled = (uiState.purgeDeleteAttendance || uiState.purgeDeleteSms),
                                        ) {
                                            Text("Delete logs for date range")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showQrConfirm) {
        AppConfirmationDialog(
            title = "Generate student QR tokens",
            message = "This may invalidate old printed QR codes. Continue?",
            confirmLabel = "Generate",
            onDismiss = { showQrConfirm = false },
            onConfirm = { showQrConfirm = false; onGenerateQr() },
        )
    }

    if (showPurgeConfirm) {
        AppConfirmationDialog(
            title = "Purge logs",
            message = "Delete the selected logs for this school in the chosen date range? This cannot be undone.",
            confirmLabel = "Delete",
            onDismiss = { showPurgeConfirm = false },
            onConfirm = { showPurgeConfirm = false; onPurgeLogs() },
            isDestructive = true,
        )
    }

    if (showPurgeFromPicker) {
        AppDatePickerDialog(
            selectedIsoDate = uiState.purgeFrom,
            onDismiss = { showPurgeFromPicker = false },
            onConfirm = {
                onPurgeRangeChange(it, null)
                showPurgeFromPicker = false
            },
        )
    }

    if (showPurgeToPicker) {
        AppDatePickerDialog(
            selectedIsoDate = uiState.purgeTo,
            onDismiss = { showPurgeToPicker = false },
            onConfirm = {
                onPurgeRangeChange(null, it)
                showPurgeToPicker = false
            },
        )
    }
}

@Composable
private fun SettingsField(
    label: String,
    value: String,
    enabled: Boolean = true,
    visualTransformation: androidx.compose.ui.text.input.VisualTransformation = androidx.compose.ui.text.input.VisualTransformation.None,
    onValueChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        enabled = enabled,
        visualTransformation = visualTransformation,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun ToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

private data class FileSelection(
    val bytes: ByteArray,
    val name: String,
    val mimeType: String,
)

private fun readFileSelection(context: Context, uri: Uri): FileSelection? {
    val resolver = context.contentResolver
    val mimeType = resolver.getType(uri) ?: "image/png"
    val name = resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null } ?: "school-logo"
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    return FileSelection(bytes = bytes, name = name, mimeType = mimeType)
}
