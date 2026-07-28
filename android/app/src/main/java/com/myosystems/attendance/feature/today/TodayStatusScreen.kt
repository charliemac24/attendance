package com.myosystems.attendance.feature.today

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
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.PersonOff
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.model.AttendanceRecord
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.util.formatDatabaseTime
import com.myosystems.attendance.core.util.formatIsoDateForDisplay
import java.time.Instant
import java.time.ZoneOffset

@Composable
fun TodayStatusRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: TodayStatusViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pendingAction by viewModel.pendingAction.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    TodayStatusScreen(
        uiState = uiState,
        pendingAction = pendingAction,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRetry = viewModel::refresh,
        onRefresh = viewModel::refresh,
        onToday = viewModel::selectToday,
        onYesterday = viewModel::selectYesterday,
        onDateSelected = viewModel::selectDate,
        onSearchChanged = viewModel::updateSearch,
        onGradeChanged = viewModel::updateGrade,
        onSectionChanged = viewModel::updateSection,
        onNextPage = viewModel::nextPage,
        onPreviousPage = viewModel::previousPage,
        onRequestAction = viewModel::requestAction,
        onDismissAction = viewModel::dismissPendingAction,
        onConfirmAction = viewModel::confirmPendingAction,
        totalPages = viewModel.totalPages(),
        snackbarHostState = snackbarHostState,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun TodayStatusScreen(
    uiState: TodayStatusUiState,
    pendingAction: PendingStatusAction?,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onToday: () -> Unit,
    onYesterday: () -> Unit,
    onDateSelected: (String) -> Unit,
    onSearchChanged: (String) -> Unit,
    onGradeChanged: (String) -> Unit,
    onSectionChanged: (String) -> Unit,
    onNextPage: () -> Unit,
    onPreviousPage: () -> Unit,
    onRequestAction: (AttendanceRecord, AttendanceActionKind) -> Unit,
    onDismissAction: () -> Unit,
    onConfirmAction: () -> Unit,
    totalPages: Int,
    snackbarHostState: SnackbarHostState,
) {
    var showDatePicker by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = uiState.statusType.title,
                subtitle = uiState.statusType.description,
                onBack = onBack,
                onOpenScanner = onOpenScanner,
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = onRefresh,
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
        ) {
            when {
                uiState.isLoading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                uiState.errorMessage != null && uiState.records.isEmpty() -> ErrorState(
                    message = uiState.errorMessage,
                    onRetry = onRetry,
                )
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item {
                            Card {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        AssistChip(onClick = onToday, label = { Text("Today") })
                                        AssistChip(onClick = onYesterday, label = { Text("Yesterday") })
                                        AssistChip(
                                            onClick = { showDatePicker = true },
                                            label = { Text(formatIsoDateForDisplay(uiState.selectedDate)) },
                                            leadingIcon = { Icon(Icons.Outlined.CalendarToday, contentDescription = null) },
                                        )
                                    }
                                    OutlinedTextField(
                                        value = uiState.search,
                                        onValueChange = onSearchChanged,
                                        modifier = Modifier.fillMaxWidth(),
                                        label = { Text("Search student name or ID") },
                                        singleLine = true,
                                    )
                                    FilterDropdown(
                                        label = "Grade",
                                        value = uiState.selectedGrade,
                                        options = listOf("all" to "All Grades") + uiState.grades.map { it.id.toString() to it.name },
                                        onValueSelected = onGradeChanged,
                                    )
                                    FilterDropdown(
                                        label = "Section",
                                        value = uiState.selectedSection,
                                        options = listOf("all" to "All Sections") + uiState.sections.map { it.id.toString() to it.name },
                                        onValueSelected = onSectionChanged,
                                    )
                                }
                            }
                        }

                        if (uiState.records.isEmpty()) {
                            item {
                                Card {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(32.dp),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text("No records found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        } else {
                            items(uiState.records, key = { "${it.studentId}-${it.id ?: it.studentNo}" }) { record ->
                                AttendanceRecordCard(
                                    record = record,
                                    statusType = uiState.statusType,
                                    canManualCheckIn = uiState.canManualCheckIn,
                                    canManualCheckOut = uiState.canManualCheckOut,
                                    canMarkAbsent = uiState.canMarkAbsent,
                                    canMarkExcused = uiState.canMarkExcused,
                                    isSubmittingAction = uiState.isSubmittingAction,
                                    onRequestAction = onRequestAction,
                                )
                            }
                        }

                        if (uiState.total > 0) {
                            item {
                                Card {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text("Page ${uiState.page} of $totalPages")
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            TextButton(onClick = onPreviousPage, enabled = uiState.page > 1) { Text("Previous") }
                                            TextButton(onClick = onNextPage, enabled = uiState.page < totalPages) { Text("Next") }
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

    if (showDatePicker) {
        DatePickerDialogForIsoDate(
            selectedIsoDate = uiState.selectedDate,
            onDismiss = { showDatePicker = false },
            onConfirm = {
                showDatePicker = false
                onDateSelected(it)
            },
        )
    }

    if (pendingAction != null) {
        AppConfirmationDialog(
            title = pendingAction.actionLabel,
            message = pendingAction.confirmText,
            confirmLabel = pendingAction.actionLabel,
            onDismiss = onDismissAction,
            onConfirm = onConfirmAction,
            isDestructive = pendingAction.actionLabel.equals("Absent", ignoreCase = true),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FilterDropdown(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onValueSelected: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val displayValue = options.firstOrNull { it.first == value }?.second.orEmpty()

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
    ) {
        OutlinedTextField(
            value = displayValue,
            onValueChange = {},
            modifier = Modifier
                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                .fillMaxWidth(),
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (key, title) ->
                DropdownMenuItem(
                    text = { Text(title) },
                    onClick = {
                        expanded = false
                        onValueSelected(key)
                    },
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AttendanceRecordCard(
    record: AttendanceRecord,
    statusType: TodayStatusType,
    canManualCheckIn: Boolean,
    canManualCheckOut: Boolean,
    canMarkAbsent: Boolean,
    canMarkExcused: Boolean,
    isSubmittingAction: Boolean,
    onRequestAction: (AttendanceRecord, AttendanceActionKind) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(record.studentName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(record.studentNo, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text("${record.gradeLevel} / ${record.section.ifBlank { "-" }}", style = MaterialTheme.typography.bodyMedium)

            if (statusType != TodayStatusType.NOT_CHECKED_IN) {
                Text("Check-in: ${formatDatabaseTime(record.checkInTime)}", style = MaterialTheme.typography.bodySmall)
                Text("Check-out: ${formatDatabaseTime(record.checkOutTime)}", style = MaterialTheme.typography.bodySmall)
            } else {
                Text("Guardian phone: ${record.guardianPhone ?: "-"}", style = MaterialTheme.typography.bodySmall)
            }

            if (record.missedCheckoutYesterday) {
                Text(
                    "Missed check-out yesterday",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if ((statusType == TodayStatusType.NOT_CHECKED_IN ||
                    statusType == TodayStatusType.ABSENT) && canManualCheckIn) {
                    ActionChip("Check In", Icons.AutoMirrored.Outlined.Login, enabled = !isSubmittingAction) {
                        onRequestAction(record, AttendanceActionKind.CHECK_IN)
                    }
                }
                if (statusType == TodayStatusType.PENDING_CHECKOUT && canManualCheckOut) {
                    ActionChip("Check Out", Icons.AutoMirrored.Outlined.Logout, enabled = !isSubmittingAction) {
                        onRequestAction(record, AttendanceActionKind.CHECK_OUT)
                    }
                }
                if (statusType == TodayStatusType.NOT_CHECKED_IN && canMarkAbsent) {
                    ActionChip("Absent", Icons.Outlined.PersonOff, enabled = !isSubmittingAction) {
                        onRequestAction(record, AttendanceActionKind.ABSENT)
                    }
                }
                if ((statusType == TodayStatusType.NOT_CHECKED_IN || statusType == TodayStatusType.ABSENT) && canMarkExcused) {
                    ActionChip("Excused", Icons.Outlined.TaskAlt, enabled = !isSubmittingAction) {
                        onRequestAction(record, AttendanceActionKind.EXCUSED)
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionChip(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Button(onClick = onClick, enabled = enabled) {
        Icon(icon, contentDescription = null)
        Text(label, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(message, color = MaterialTheme.colorScheme.error)
            Button(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerDialogForIsoDate(
    selectedIsoDate: String,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    val epochMillis = remember(selectedIsoDate) {
        runCatching { Instant.parse("${selectedIsoDate}T00:00:00Z").toEpochMilli() }.getOrNull()
    }
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = epochMillis)

    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                onClick = {
                    val millis = datePickerState.selectedDateMillis
                    if (millis != null) {
                        val isoDate = Instant.ofEpochMilli(millis)
                            .atZone(ZoneOffset.UTC)
                            .toLocalDate()
                            .toString()
                        onConfirm(isoDate)
                    } else {
                        onDismiss()
                    }
                }
            ) { Text("Apply") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        },
    ) {
        DatePicker(state = datePickerState)
    }
}
