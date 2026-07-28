package com.myosystems.attendance.feature.admin

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
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.ViewAgenda
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.SchoolHoliday
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppDateField
import com.myosystems.attendance.core.ui.AppDatePickerDialog
import com.myosystems.attendance.core.ui.AppFormDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.util.formatIsoDateForDisplay

@Composable
fun AdminRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val dialogState by viewModel.dialogState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    AdminScreen(
        uiState = uiState,
        dialogState = dialogState,
        onBack = onBack,
        onRefresh = viewModel::refresh,
        onTabSelected = viewModel::selectTab,
        onOpenScanner = onOpenScanner,
        onAddCurrent = {
            when (uiState.selectedTab) {
                AdminTab.Grades -> viewModel.openNewGradeDialog()
                AdminTab.Sections -> viewModel.openNewSectionDialog()
                AdminTab.Kiosks -> viewModel.openNewKioskDialog()
                AdminTab.Holidays -> viewModel.openNewHolidayDialog()
            }
        },
        onEditGrade = viewModel::openEditGradeDialog,
        onDeleteGrade = viewModel::confirmDeleteGrade,
        onEditSection = viewModel::openEditSectionDialog,
        onDeleteSection = viewModel::confirmDeleteSection,
        onEditKiosk = viewModel::openEditKioskDialog,
        onDeleteKiosk = viewModel::confirmDeleteKiosk,
        onEditHoliday = viewModel::openEditHolidayDialog,
        onDeleteHoliday = viewModel::confirmDeleteHoliday,
        onDismissDialog = viewModel::dismissDialog,
        onUpdateGradeDraft = viewModel::updateGradeDraft,
        onSaveGrade = viewModel::saveGrade,
        onUpdateSectionDraft = viewModel::updateSectionDraft,
        onSaveSection = viewModel::saveSection,
        onUpdateKioskDraft = viewModel::updateKioskDraft,
        onSaveKiosk = viewModel::saveKiosk,
        onUpdateHolidayDraft = viewModel::updateHolidayDraft,
        onSaveHoliday = viewModel::saveHoliday,
        onConfirmDelete = viewModel::confirmDelete,
        snackbarHostState = snackbarHostState,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun AdminScreen(
    uiState: AdminUiState,
    dialogState: AdminDialogState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onTabSelected: (AdminTab) -> Unit,
    onOpenScanner: () -> Unit,
    onAddCurrent: () -> Unit,
    onEditGrade: (Int) -> Unit,
    onDeleteGrade: (Int) -> Unit,
    onEditSection: (Int) -> Unit,
    onDeleteSection: (Int) -> Unit,
    onEditKiosk: (Int) -> Unit,
    onDeleteKiosk: (Int) -> Unit,
    onEditHoliday: (Int) -> Unit,
    onDeleteHoliday: (Int) -> Unit,
    onDismissDialog: () -> Unit,
    onUpdateGradeDraft: (String?, String?, Map<String, String>?) -> Unit,
    onSaveGrade: () -> Unit,
    onUpdateSectionDraft: (String?, String?, String?, Map<String, String>?) -> Unit,
    onSaveSection: () -> Unit,
    onUpdateKioskDraft: (String?, String?) -> Unit,
    onSaveKiosk: () -> Unit,
    onUpdateHolidayDraft: (String?, String?, String?, Boolean?) -> Unit,
    onSaveHoliday: () -> Unit,
    onConfirmDelete: () -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "Admin",
                subtitle = "School setup and operations",
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
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(20.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text("Phase 6 Admin Hub", style = MaterialTheme.typography.titleLarge)
                                    Text(
                                        "Manage grade levels, sections, kiosk locations, and school holidays in one mobile-friendly workspace.",
                                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    )
                                    FlowRow(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        AdminTab.entries.forEach { tab ->
                                            FilterChip(
                                                selected = uiState.selectedTab == tab,
                                                onClick = { onTabSelected(tab) },
                                                label = { Text(tab.label) },
                                            )
                                        }
                                    }
                                    Button(onClick = onAddCurrent) {
                                        Icon(Icons.Outlined.Add, contentDescription = null)
                                        Text("Add ${uiState.selectedTab.label.dropLast(1)}", modifier = Modifier.padding(start = 8.dp))
                                    }
                                }
                            }
                        }
                        if (uiState.errorMessage != null) {
                            item {
                                Card {
                                    Text(
                                        text = uiState.errorMessage,
                                        color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(16.dp),
                                    )
                                }
                            }
                        }
                        when (uiState.selectedTab) {
                            AdminTab.Grades -> gradeItems(uiState.grades, onEditGrade, onDeleteGrade)
                            AdminTab.Sections -> sectionItems(uiState.sections, uiState.grades, onEditSection, onDeleteSection)
                            AdminTab.Kiosks -> kioskItems(uiState.kiosks, onEditKiosk, onDeleteKiosk)
                            AdminTab.Holidays -> holidayItems(uiState.holidays, onEditHoliday, onDeleteHoliday)
                        }
                    }
                }
            }
        }
    }

    when (dialogState) {
        is AdminDialogState.GradeEditor -> GradeEditorDialog(
            state = dialogState,
            isSaving = uiState.isSaving,
            onDismiss = onDismissDialog,
            onUpdate = onUpdateGradeDraft,
            onSave = onSaveGrade,
        )
        is AdminDialogState.SectionEditor -> SectionEditorDialog(
            state = dialogState,
            grades = uiState.grades,
            isSaving = uiState.isSaving,
            onDismiss = onDismissDialog,
            onUpdate = onUpdateSectionDraft,
            onSave = onSaveSection,
        )
        is AdminDialogState.KioskEditor -> KioskEditorDialog(
            state = dialogState,
            isSaving = uiState.isSaving,
            onDismiss = onDismissDialog,
            onUpdate = onUpdateKioskDraft,
            onSave = onSaveKiosk,
        )
        is AdminDialogState.HolidayEditor -> HolidayEditorDialog(
            state = dialogState,
            isSaving = uiState.isSaving,
            onDismiss = onDismissDialog,
            onUpdate = onUpdateHolidayDraft,
            onSave = onSaveHoliday,
        )
        is AdminDialogState.DeleteConfirmation -> DeleteDialog(
            state = dialogState,
            isDeleting = uiState.isDeleting,
            onDismiss = onDismissDialog,
            onConfirm = onConfirmDelete,
        )
        AdminDialogState.None -> Unit
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.gradeItems(
    grades: List<GradeLevelSummary>,
    onEdit: (Int) -> Unit,
    onDelete: (Int) -> Unit,
) {
    if (grades.isEmpty()) {
        item { EmptyAdminCard("No grade levels yet.") }
    } else {
        items(grades, key = { it.id }) { grade ->
            val weekdayOverrides = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
                .mapNotNull { weekday ->
                    val override = grade.lateTimeOverridesByWeekday?.get(weekday)
                        ?: if (weekday == "Friday") grade.fridayLateTimeOverride else null
                    override?.takeIf { it.isNotBlank() }?.let { "$weekday late override: ${it.take(5)}" }
                }
            val lateTimeSummary = buildList {
                add(grade.lateTimeOverride?.let { "Late override: ${it.take(5)}" } ?: "Uses school-wide late time")
                addAll(weekdayOverrides)
            }.joinToString(separator = "\n")
            AdminRowCard(
                icon = { Icon(Icons.Outlined.School, contentDescription = null) },
                title = grade.name,
                subtitle = lateTimeSummary,
                onEdit = { onEdit(grade.id) },
                onDelete = { onDelete(grade.id) },
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.sectionItems(
    sections: List<SectionSummary>,
    grades: List<GradeLevelSummary>,
    onEdit: (Int) -> Unit,
    onDelete: (Int) -> Unit,
) {
    if (sections.isEmpty()) {
        item { EmptyAdminCard("No sections yet.") }
    } else {
        items(sections, key = { it.id }) { section ->
            val gradeName = section.gradeLevelName ?: grades.firstOrNull { it.id == section.gradeLevelId }?.name ?: "Grade ${section.gradeLevelId}"
            val lateTimeSummary = buildList {
                add(section.lateTimeOverride?.let { "Late override: ${it.take(5)}" } ?: "Uses grade-level late time")
                listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").forEach { weekday ->
                    val override = section.lateTimeOverridesByWeekday?.get(weekday)
                        ?: if (weekday == "Friday") section.fridayLateTimeOverride else null
                    if (!override.isNullOrBlank()) add("$weekday: ${override.take(5)}")
                }
            }.joinToString(" | ")
            AdminRowCard(
                icon = { Icon(Icons.Outlined.ViewAgenda, contentDescription = null) },
                title = section.name,
                subtitle = "$gradeName | $lateTimeSummary",
                onEdit = { onEdit(section.id) },
                onDelete = { onDelete(section.id) },
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.kioskItems(
    kiosks: List<KioskLocation>,
    onEdit: (Int) -> Unit,
    onDelete: (Int) -> Unit,
) {
    if (kiosks.isEmpty()) {
        item { EmptyAdminCard("No kiosks yet.") }
    } else {
        items(kiosks, key = { it.id }) { kiosk ->
            AdminRowCard(
                icon = { Icon(Icons.Outlined.MeetingRoom, contentDescription = null) },
                title = kiosk.name,
                subtitle = "/${kiosk.slug}",
                onEdit = { onEdit(kiosk.id) },
                onDelete = { onDelete(kiosk.id) },
            )
        }
    }
}

private fun androidx.compose.foundation.lazy.LazyListScope.holidayItems(
    holidays: List<SchoolHoliday>,
    onEdit: (Int) -> Unit,
    onDelete: (Int) -> Unit,
) {
    if (holidays.isEmpty()) {
        item { EmptyAdminCard("No holidays configured yet.") }
    } else {
        items(holidays, key = { it.id }) { holiday ->
            val recurringSuffix = if (holiday.isRecurring) " | recurring" else ""
            AdminRowCard(
                icon = { Icon(Icons.Outlined.CalendarMonth, contentDescription = null) },
                title = holiday.name,
                subtitle = "${formatIsoDateForDisplay(holiday.date)} | ${holiday.type}$recurringSuffix",
                onEdit = { onEdit(holiday.id) },
                onDelete = { onDelete(holiday.id) },
            )
        }
    }
}

@Composable
private fun AdminRowCard(
    icon: @Composable () -> Unit,
    title: String,
    subtitle: String,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier.padding(end = 4.dp),
                contentAlignment = Alignment.Center,
            ) { icon() }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Outlined.Edit, contentDescription = "Edit")
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete")
            }
        }
    }
}

@Composable
private fun EmptyAdminCard(message: String) {
    Card {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun GradeEditorDialog(
    state: AdminDialogState.GradeEditor,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onUpdate: (String?, String?, Map<String, String>?) -> Unit,
    onSave: () -> Unit,
) {
    AppFormDialog(
        title = if (state.id == null) "Add Grade Level" else "Edit Grade Level",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = if (isSaving) "Saving..." else "Save",
        confirmEnabled = !isSaving && state.name.isNotBlank(),
    ) {
        OutlinedTextField(
            value = state.name,
            onValueChange = { onUpdate(it, null, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Name") },
            singleLine = true,
        )
        OutlinedTextField(
            value = state.lateTimeOverride,
            onValueChange = { onUpdate(null, it, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Late time override") },
            placeholder = { Text("08:30") },
            singleLine = true,
        )
        Text(
            text = "Leave blank to use the school-wide late time.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text("Late Time Overrides By Weekday", style = MaterialTheme.typography.titleSmall)
        Text(
            text = "Configure only days with a different schedule. Blank days use the grade default above.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").forEach { weekday ->
            OutlinedTextField(
                value = state.lateTimeOverridesByWeekday[weekday].orEmpty(),
                onValueChange = { value ->
                    onUpdate(null, null, state.lateTimeOverridesByWeekday + (weekday to value))
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(weekday) },
                placeholder = { Text("08:30") },
                singleLine = true,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SectionEditorDialog(
    state: AdminDialogState.SectionEditor,
    grades: List<GradeLevelSummary>,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onUpdate: (String?, String?, String?, Map<String, String>?) -> Unit,
    onSave: () -> Unit,
) {
    AppFormDialog(
        title = if (state.id == null) "Add Section" else "Edit Section",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = if (isSaving) "Saving..." else "Save",
        confirmEnabled = !isSaving && state.name.isNotBlank() && state.gradeLevelId.isNotBlank(),
    ) {
        OutlinedTextField(
            value = state.name,
            onValueChange = { onUpdate(it, null, null, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Name") },
            singleLine = true,
        )
        SelectionDropdown(
            label = "Grade level",
            value = state.gradeLevelId,
            options = grades.map { it.id.toString() to it.name },
            onValueSelected = { onUpdate(null, it, null, null) },
        )
        OutlinedTextField(
            value = state.lateTimeOverride,
            onValueChange = { onUpdate(null, null, it, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Late time override") },
            placeholder = { Text("08:30") },
            singleLine = true,
        )
        Text(
            text = "Leave blank to use the grade-level or school-wide late time.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text("Late Time Overrides By Weekday", style = MaterialTheme.typography.titleSmall)
        Text(
            text = "Configure this section's schedule by weekday. Blank days use the section default, then grade-level settings.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday").forEach { weekday ->
            OutlinedTextField(
                value = state.lateTimeOverridesByWeekday[weekday].orEmpty(),
                onValueChange = { value ->
                    onUpdate(null, null, null, state.lateTimeOverridesByWeekday + (weekday to value))
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(weekday) },
                placeholder = { Text("08:30") },
                singleLine = true,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectionDropdown(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onValueSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val displayValue = options.firstOrNull { it.first == value }?.second.orEmpty()

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded },
        modifier = modifier,
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
            options.forEach { (optionValue, optionLabel) ->
                DropdownMenuItem(
                    text = { Text(optionLabel) },
                    onClick = {
                        expanded = false
                        onValueSelected(optionValue)
                    },
                )
            }
        }
    }
}

@Composable
private fun KioskEditorDialog(
    state: AdminDialogState.KioskEditor,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onUpdate: (String?, String?) -> Unit,
    onSave: () -> Unit,
) {
    AppFormDialog(
        title = if (state.id == null) "Add Kiosk" else "Edit Kiosk",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = if (isSaving) "Saving..." else "Save",
        confirmEnabled = !isSaving && state.name.isNotBlank() && state.slug.isNotBlank(),
    ) {
        OutlinedTextField(
            value = state.name,
            onValueChange = { onUpdate(it, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Name") },
            singleLine = true,
        )
        OutlinedTextField(
            value = state.slug,
            onValueChange = { onUpdate(null, it) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Slug") },
            singleLine = true,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HolidayEditorDialog(
    state: AdminDialogState.HolidayEditor,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onUpdate: (String?, String?, String?, Boolean?) -> Unit,
    onSave: () -> Unit,
) {
    var showDatePicker by remember(state.id, state.date) { mutableStateOf(false) }

    AppFormDialog(
        title = if (state.id == null) "Add Holiday" else "Edit Holiday",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = if (isSaving) "Saving..." else "Save",
        confirmEnabled = !isSaving && state.date.isNotBlank() && state.name.isNotBlank(),
    ) {
        AppDateField(
            value = state.date,
            modifier = Modifier.fillMaxWidth(),
            label = "Date",
            onClick = { showDatePicker = true },
        )
        OutlinedTextField(
            value = state.name,
            onValueChange = { onUpdate(null, it, null, null) },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Name") },
            singleLine = true,
        )
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("holiday" to "Holiday", "no_classes" to "No classes", "special_schedule" to "Special schedule").forEach { (value, label) ->
                FilterChip(
                    selected = state.type == value,
                    onClick = { onUpdate(null, null, value, null) },
                    label = { Text(label) },
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text("Recurring yearly", style = MaterialTheme.typography.labelLarge)
                Text("Use for recurring school calendar days", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(
                checked = state.isRecurring,
                onCheckedChange = { onUpdate(null, null, null, it) },
            )
        }
    }

    if (showDatePicker) {
        AppDatePickerDialog(
            selectedIsoDate = state.date,
            onDismiss = { showDatePicker = false },
            onConfirm = {
                onUpdate(it, null, null, null)
                showDatePicker = false
            },
        )
    }
}

@Composable
private fun DeleteDialog(
    state: AdminDialogState.DeleteConfirmation,
    isDeleting: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AppConfirmationDialog(
        title = "Delete",
        message = state.message,
        confirmLabel = if (isDeleting) "Deleting..." else "Delete",
        onDismiss = onDismiss,
        onConfirm = onConfirm,
        isDestructive = true,
        confirmEnabled = !isDeleting,
    )
}
