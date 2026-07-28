package com.myosystems.attendance.feature.sms

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.model.SmsLogEntry
import com.myosystems.attendance.core.model.SmsTemplateItem

@Composable
fun SmsRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: SmsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = androidx.compose.ui.platform.LocalContext.current
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri: Uri? ->
        pendingExportBytes?.let { bytes ->
            if (uri != null) {
                writeBytesToUri(context, uri, bytes)
            }
            pendingExportBytes = null
        }
    }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { snackbarHostState.showSnackbar(it) }
    }
    LaunchedEffect(Unit) {
        viewModel.exportEvents.collect { bytes ->
            pendingExportBytes = bytes
            exportLauncher.launch("sms-logs-${uiState.fromDate}-to-${uiState.toDate}.csv")
        }
    }

    SmsScreen(
        uiState = uiState,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRefresh = viewModel::pullToRefresh,
        onRetry = viewModel::refresh,
        onTabSelected = viewModel::selectTab,
        onTemplateSave = viewModel::updateTemplate,
        onDateRangeChange = viewModel::updateDateRange,
        onReloadLogs = viewModel::loadLogs,
        onExportLogs = viewModel::exportLogs,
        onTestFieldChange = viewModel::updateTestFields,
        onSendTestSms = viewModel::sendTestSms,
    )
}

private var pendingExportBytes: ByteArray? = null

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun SmsScreen(
    uiState: SmsUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onTabSelected: (SmsTab) -> Unit,
    onTemplateSave: (Int, Boolean, String) -> Unit,
    onDateRangeChange: (String?, String?) -> Unit,
    onReloadLogs: () -> Unit,
    onExportLogs: () -> Unit,
    onTestFieldChange: (String?, String?) -> Unit,
    onSendTestSms: () -> Unit,
) {
    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "SMS",
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
                uiState.errorMessage != null && uiState.templates.isEmpty() && uiState.logs.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(uiState.errorMessage)
                        Button(onClick = onRetry) { Text("Retry") }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SmsTab.entries.forEach { tab ->
                                    FilterChip(
                                        selected = uiState.selectedTab == tab,
                                        onClick = { onTabSelected(tab) },
                                        label = { Text(tab.label) },
                                    )
                                }
                            }
                        }
                        if (uiState.selectedTab == SmsTab.TEMPLATES) {
                            item {
                                Card {
                                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text("Test SMS", style = MaterialTheme.typography.titleMedium)
                                        OutlinedTextField(
                                            value = uiState.testPhone,
                                            onValueChange = { onTestFieldChange(it, null) },
                                            modifier = Modifier.fillMaxWidth(),
                                            label = { Text("Phone") },
                                        )
                                        OutlinedTextField(
                                            value = uiState.testMessage,
                                            onValueChange = { onTestFieldChange(null, it) },
                                            modifier = Modifier.fillMaxWidth(),
                                            label = { Text("Message") },
                                            minLines = 3,
                                        )
                                        Button(onClick = onSendTestSms, enabled = uiState.canManageTemplates) {
                                            Icon(Icons.Outlined.Send, contentDescription = null)
                                            Text("Send test SMS")
                                        }
                                    }
                                }
                            }
                            items(uiState.templates.filter { it.type in listOf("check_in", "check_out", "late", "absent") }, key = { it.id }) { template ->
                                TemplateCard(template = template, canManage = uiState.canManageTemplates, isSaving = uiState.isSaving, onSave = onTemplateSave)
                            }
                        } else {
                            item {
                                Card {
                                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text("SMS logs", style = MaterialTheme.typography.titleMedium)
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            OutlinedTextField(
                                                value = uiState.fromDate,
                                                onValueChange = { onDateRangeChange(it, null) },
                                                modifier = Modifier.weight(1f),
                                                label = { Text("From") },
                                            )
                                            OutlinedTextField(
                                                value = uiState.toDate,
                                                onValueChange = { onDateRangeChange(null, it) },
                                                modifier = Modifier.weight(1f),
                                                label = { Text("To") },
                                            )
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                            Button(onClick = onReloadLogs) { Text("Load logs") }
                                            Button(onClick = onExportLogs) {
                                                Icon(Icons.Outlined.Download, contentDescription = null)
                                                Text("Export CSV")
                                            }
                                        }
                                    }
                                }
                            }
                            if (uiState.logs.isEmpty()) {
                                item {
                                    Card { Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text("No SMS logs in this range") } }
                                }
                            } else {
                                items(uiState.logs, key = { it.id }) { log ->
                                    SmsLogCard(log)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TemplateCard(
    template: SmsTemplateItem,
    canManage: Boolean,
    isSaving: Boolean,
    onSave: (Int, Boolean, String) -> Unit,
) {
    var enabled by remember(template.id) { mutableStateOf(template.enabled) }
    var text by remember(template.id) { mutableStateOf(template.templateText) }
    Card {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(template.type.replace('_', ' '), style = MaterialTheme.typography.titleMedium)
                Switch(checked = enabled, onCheckedChange = { enabled = it }, enabled = canManage)
            }
            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                modifier = Modifier.fillMaxWidth(),
                minLines = 4,
                label = { Text("Template text") },
                enabled = canManage,
            )
            Button(onClick = { onSave(template.id, enabled, text) }, enabled = canManage && !isSaving) {
                Text(if (isSaving) "Saving..." else "Save")
            }
        }
    }
}

@Composable
private fun SmsLogCard(log: SmsLogEntry) {
    Card {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(log.studentName ?: "-", style = MaterialTheme.typography.titleMedium)
            Text("${log.templateType ?: "-"} • ${log.toPhone}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(log.message, style = MaterialTheme.typography.bodyMedium)
            Text("Status: ${log.status}", style = MaterialTheme.typography.bodySmall)
            if (!log.errorMessage.isNullOrBlank()) {
                Text(log.errorMessage, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
            Text(log.createdAt ?: "-", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun writeBytesToUri(context: Context, uri: Uri, bytes: ByteArray) {
    context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
}
