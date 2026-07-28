package com.myosystems.attendance.feature.reports

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
import androidx.compose.material.icons.automirrored.outlined.Message
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Button
import androidx.compose.material3.Surface
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.model.AttendanceReportRow
import com.myosystems.attendance.core.model.SmsBillingReportRow
import com.myosystems.attendance.core.model.SmsUsageReportRow
import com.myosystems.attendance.core.ui.AppDateField
import com.myosystems.attendance.core.ui.AppDatePickerDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.util.formatDatabaseTime
import com.myosystems.attendance.core.util.formatIsoDateForDisplay

@Composable
fun ReportsRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: ReportsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val context = androidx.compose.ui.platform.LocalContext.current
    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri: Uri? ->
        pendingReportExport?.let { export ->
            if (uri != null) {
                writeBytesToUri(context, uri, export.bytes)
            }
            pendingReportExport = null
        }
    }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }
    LaunchedEffect(Unit) {
        viewModel.exportEvents.collect { export ->
            pendingReportExport = export
            exportLauncher.launch(export.fileName)
        }
    }

    ReportsScreen(
        uiState = uiState,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRefresh = viewModel::pullToRefresh,
        onRetry = viewModel::refresh,
        onTabSelected = viewModel::selectTab,
        onStartDateChanged = viewModel::updateStartDate,
        onEndDateChanged = viewModel::updateEndDate,
        onMonthChanged = viewModel::updateMonth,
        onGradeChanged = viewModel::updateGrade,
        onSectionChanged = viewModel::updateSection,
        onStudentNameChanged = viewModel::updateStudentName,
        onStudentNoChanged = viewModel::updateStudentNo,
        onApplyFilters = viewModel::applyFilters,
        onExport = viewModel::exportCurrentReport,
        onMarkExcused = viewModel::markExcused,
        snackbarHostState = snackbarHostState,
    )
}

private var pendingReportExport: ReportExportPayload? = null

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun ReportsScreen(
    uiState: ReportsUiState,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onTabSelected: (ReportTab) -> Unit,
    onStartDateChanged: (String) -> Unit,
    onEndDateChanged: (String) -> Unit,
    onMonthChanged: (String) -> Unit,
    onGradeChanged: (String) -> Unit,
    onSectionChanged: (String) -> Unit,
    onStudentNameChanged: (String) -> Unit,
    onStudentNoChanged: (String) -> Unit,
    onApplyFilters: () -> Unit,
    onExport: () -> Unit,
    onMarkExcused: (AttendanceReportRow) -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "Reports",
                subtitle = "Phase 7 reporting and review",
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
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                uiState.errorMessage != null &&
                    uiState.attendanceRows.isEmpty() &&
                    uiState.smsUsageRows.isEmpty() &&
                    uiState.smsBillingRows.isEmpty() -> {
                    ErrorState(
                        message = uiState.errorMessage,
                        onRetry = onRetry,
                    )
                }
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
                                    Text("Report Center", style = MaterialTheme.typography.titleLarge)
                                    Text(
                                        "Review attendance trends, absences, late history, and SMS activity without leaving the app.",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (uiState.canExportCsv) {
                                        Button(
                                            onClick = onExport,
                                            enabled = !uiState.isExporting,
                                        ) {
                                            Icon(Icons.Outlined.Download, contentDescription = null)
                                            Text(if (uiState.isExporting) "Exporting..." else "Export CSV")
                                        }
                                    }
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        ReportTab.entries
                                            .filter { it != ReportTab.SMS_BILLING || uiState.canViewBilling }
                                            .forEach { tab ->
                                                FilterChip(
                                                    selected = uiState.selectedTab == tab,
                                                    onClick = { onTabSelected(tab) },
                                                    label = { Text(tab.label) },
                                                )
                                            }
                                    }
                                }
                            }
                        }
                        item {
                            FiltersCard(
                                uiState = uiState,
                                onStartDateChanged = onStartDateChanged,
                                onEndDateChanged = onEndDateChanged,
                                onMonthChanged = onMonthChanged,
                                onGradeChanged = onGradeChanged,
                                onSectionChanged = onSectionChanged,
                                onStudentNameChanged = onStudentNameChanged,
                                onStudentNoChanged = onStudentNoChanged,
                                onApplyFilters = onApplyFilters,
                            )
                        }
                        when (uiState.selectedTab) {
                            ReportTab.SMS_USAGE -> smsUsageItems(uiState.smsUsageRows)
                            ReportTab.SMS_BILLING -> smsBillingItems(uiState.smsBillingRows)
                            else -> attendanceItems(
                                rows = uiState.attendanceRows,
                                reportTab = uiState.selectedTab,
                                canMarkExcused = uiState.canMarkExcused,
                                onMarkExcused = onMarkExcused,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FiltersCard(
    uiState: ReportsUiState,
    onStartDateChanged: (String) -> Unit,
    onEndDateChanged: (String) -> Unit,
    onMonthChanged: (String) -> Unit,
    onGradeChanged: (String) -> Unit,
    onSectionChanged: (String) -> Unit,
    onStudentNameChanged: (String) -> Unit,
    onStudentNoChanged: (String) -> Unit,
    onApplyFilters: () -> Unit,
) {
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }

    Card {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Filters", style = MaterialTheme.typography.titleMedium)
            if (uiState.selectedTab == ReportTab.SMS_BILLING) {
                OutlinedTextField(
                    value = uiState.month,
                    onValueChange = onMonthChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Month (YYYY-MM)") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.CalendarMonth, contentDescription = null) },
                )
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    AppDateField(
                        value = uiState.startDate,
                        modifier = Modifier.weight(1f),
                        label = "Start date",
                        onClick = { showStartDatePicker = true },
                    )
                    AppDateField(
                        value = uiState.endDate,
                        modifier = Modifier.weight(1f),
                        label = "End date",
                        onClick = { showEndDatePicker = true },
                    )
                }
            }

            if (uiState.selectedTab !in setOf(ReportTab.SMS_USAGE, ReportTab.SMS_BILLING)) {
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
                OutlinedTextField(
                    value = uiState.studentName,
                    onValueChange = onStudentNameChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Student name") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null) },
                )
                OutlinedTextField(
                    value = uiState.studentNo,
                    onValueChange = onStudentNoChanged,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Student ID") },
                    singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onApplyFilters) {
                    Text("Apply Filters")
                }
            }
        }
    }

    if (showStartDatePicker) {
        AppDatePickerDialog(
            selectedIsoDate = uiState.startDate,
            onDismiss = { showStartDatePicker = false },
            onConfirm = {
                onStartDateChanged(it)
                showStartDatePicker = false
            },
        )
    }

    if (showEndDatePicker) {
        AppDatePickerDialog(
            selectedIsoDate = uiState.endDate,
            onDismiss = { showEndDatePicker = false },
            onConfirm = {
                onEndDateChanged(it)
                showEndDatePicker = false
            },
        )
    }
}


private fun androidx.compose.foundation.lazy.LazyListScope.attendanceItems(
    rows: List<AttendanceReportRow>,
    reportTab: ReportTab,
    canMarkExcused: Boolean,
    onMarkExcused: (AttendanceReportRow) -> Unit,
) {
    if (rows.isEmpty()) {
        item { EmptyStateCard("No records found for this report.") }
    } else {
        items(rows, key = { "${it.attendanceId ?: 0}-${it.studentNo}-${it.date}" }) { row ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(row.studentName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text("${row.gradeLevel} / ${row.section.ifBlank { "-" }}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        StatusChip(label = statusLabel(row, reportTab))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        LabeledValue("Student ID", row.studentNo)
                        LabeledValue("Date", formatIsoDateForDisplay(row.date))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        LabeledValue("Check-in", formatDatabaseTime(row.checkInTime))
                        LabeledValue("Check-out", formatDatabaseTime(row.checkOutTime))
                    }
                    if (reportTab == ReportTab.ABSENTEES && canMarkExcused && row.studentId != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End,
                        ) {
                            OutlinedButton(
                                onClick = { onMarkExcused(row) },
                            ) {
                                Text("Excused")
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.smsUsageItems(
    rows: List<SmsUsageReportRow>,
) {
    if (rows.isEmpty()) {
        item { EmptyStateCard("No SMS usage rows found for this range.") }
    } else {
        items(rows, key = { it.date }) { row ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(formatIsoDateForDisplay(row.date), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        ReportBadge(
                            label = "${row.total} total",
                            containerColor = Color(0xFFE9F2FF),
                            contentColor = Color(0xFF2459C6),
                        )
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        LabeledValue("Sent", row.sent.toString())
                        LabeledValue("Failed", row.failed.toString())
                        LabeledValue("Submitted", row.submitted.toString())
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        LabeledValue("Queued", row.queued.toString())
                        LabeledValue("Retry wait", row.retryWait.toString())
                    }
                }
            }
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.smsBillingItems(
    rows: List<SmsBillingReportRow>,
) {
    if (rows.isEmpty()) {
        item { EmptyStateCard("No SMS billing rows found for this month.") }
    } else {
        items(rows, key = { it.schoolId }) { row ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(row.schoolName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                            Text(row.month, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        StatusChip(label = "PHP ${(row.overageAmountCents / 100.0).toString()}")
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        LabeledValue("Sent", row.sentCount.toString())
                        LabeledValue("Credits", row.monthlySmsCredits.toString())
                        LabeledValue("Excess", row.excessCount.toString())
                    }
                    LabeledValue("Rate", "PHP ${(row.smsOverageRateCents / 100.0)} / SMS")
                }
            }
        }
    }
}

@Composable
private fun LabeledValue(
    label: String,
    value: String,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun StatusChip(label: String) {
    val (containerColor, contentColor) = when (label.lowercase()) {
        "absent" -> Color(0xFFFFEEE8) to Color(0xFFB45309)
        "late" -> Color(0xFFFFF4D6) to Color(0xFFB7791F)
        "present" -> Color(0xFFE8F7EE) to Color(0xFF17643A)
        else -> Color(0xFFEFF3F8) to Color(0xFF475569)
    }
    ReportBadge(
        label = label,
        containerColor = containerColor,
        contentColor = contentColor,
    )
}

@Composable
private fun ReportBadge(
    label: String,
    onClick: (() -> Unit)? = null,
    containerColor: Color,
    contentColor: Color,
) {
    Surface(
        onClick = onClick ?: {},
        enabled = onClick != null,
        color = containerColor,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
    ) {
        Text(
            text = label,
            color = contentColor,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
        )
    }
}

@Composable
private fun EmptyStateCard(message: String) {
    Card {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
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
            Icon(Icons.Outlined.Assessment, contentDescription = null)
            Text(message, color = MaterialTheme.colorScheme.error)
            TextButton(onClick = onRetry) {
                Text("Retry")
            }
        }
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
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (key, display) ->
                DropdownMenuItem(
                    text = { Text(display) },
                    onClick = {
                        expanded = false
                        onValueSelected(key)
                    },
                )
            }
        }
    }
}

private fun statusLabel(
    row: AttendanceReportRow,
    reportTab: ReportTab,
): String {
    return when (reportTab) {
        ReportTab.LATE_HISTORY -> if (row.checkOutTime.isNullOrBlank()) "Late / on campus" else "Late / checked out"
        ReportTab.ABSENTEES -> "Absent"
        else -> row.status.replace('_', ' ').replaceFirstChar(Char::titlecase)
    }
}

private fun writeBytesToUri(context: Context, uri: Uri, bytes: ByteArray) {
    context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
}
