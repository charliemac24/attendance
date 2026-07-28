package com.myosystems.attendance.feature.students

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.PersonOff
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.myosystems.attendance.core.util.PrintableStudentQr
import com.myosystems.attendance.core.util.StudentQrPrintHelper
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.ui.AppDateField
import com.myosystems.attendance.core.ui.AppDatePickerDialog
import com.myosystems.attendance.core.ui.AppFormDialog
import com.myosystems.attendance.core.model.GradeLevelSummary
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.StudentSummary

@Composable
fun StudentsRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    viewModel: StudentsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val editorState by viewModel.editorState.collectAsStateWithLifecycle()
    val deleteTarget by viewModel.deleteTarget.collectAsStateWithLifecycle()
    val statusDialog by viewModel.statusDialog.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    StudentsScreen(
        uiState = uiState,
        editorState = editorState,
        deleteTarget = deleteTarget,
        statusDialog = statusDialog,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRefresh = viewModel::pullToRefresh,
        onRetry = viewModel::refresh,
        onSearchChange = viewModel::updateSearch,
        onRosterSelected = viewModel::updateRoster,
        onGradeSelected = viewModel::updateGradeFilter,
        onSectionSelected = viewModel::updateSectionFilter,
        onOpenCreate = viewModel::openCreateStudent,
        onOpenEdit = viewModel::openEditStudent,
        onSaveStudent = viewModel::saveStudent,
        onEditorChange = viewModel::updateEditor,
        onDismissEditor = viewModel::dismissEditor,
        onDeleteStudent = viewModel::deleteStudent,
        onConfirmDelete = viewModel::confirmDelete,
        onDismissDelete = viewModel::dismissDelete,
        onRegenerateQr = viewModel::regenerateQrToken,
        onOpenStatus = viewModel::openStatusDialog,
        onStatusDateChange = viewModel::updateStatusDate,
        onStatusNoteChange = viewModel::updateStatusNote,
        onDismissStatus = viewModel::dismissStatusDialog,
        onApplyStatus = viewModel::applyStatus,
        onBulkAssign = viewModel::bulkAssignSection,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun StudentsScreen(
    uiState: StudentsUiState,
    editorState: StudentEditorState?,
    deleteTarget: StudentSummary?,
    statusDialog: StudentStatusDialogState?,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onSearchChange: (String) -> Unit,
    onRosterSelected: (StudentRosterFilter) -> Unit,
    onGradeSelected: (String) -> Unit,
    onSectionSelected: (String) -> Unit,
    onOpenCreate: () -> Unit,
    onOpenEdit: (StudentSummary) -> Unit,
    onSaveStudent: (ByteArray?, String?, String?) -> Unit,
    onEditorChange: ((StudentEditorState) -> StudentEditorState) -> Unit,
    onDismissEditor: () -> Unit,
    onDeleteStudent: () -> Unit,
    onConfirmDelete: (StudentSummary) -> Unit,
    onDismissDelete: () -> Unit,
    onRegenerateQr: (StudentSummary) -> Unit,
    onOpenStatus: (StudentSummary, String) -> Unit,
    onStatusDateChange: (String) -> Unit,
    onStatusNoteChange: (String) -> Unit,
    onDismissStatus: () -> Unit,
    onApplyStatus: () -> Unit,
    onBulkAssign: (List<Int>, Int?) -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val visibleSections = uiState.sections.filter {
        uiState.selectedGradeId == "all" || it.gradeLevelId.toString() == uiState.selectedGradeId
    }
    val visibleStudents = uiState.students.filter { student ->
        (uiState.selectedGradeId == "all" || student.gradeLevelId?.toString() == uiState.selectedGradeId) &&
            (uiState.selectedSectionId == "all" || student.sectionId?.toString() == uiState.selectedSectionId)
    }
    var selectedIds by rememberSaveable { mutableStateOf(setOf<Int>()) }
    var bulkAssignOpen by rememberSaveable { mutableStateOf(false) }
    var bulkAssignSectionId by rememberSaveable { mutableStateOf("none") }

    LaunchedEffect(visibleStudents) {
        val validIds = visibleStudents.map { it.id }.toSet()
        selectedIds = selectedIds.intersect(validIds)
    }

    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "Students",
                onBack = onBack,
                onOpenScanner = onOpenScanner,
                actions = {
                    if (uiState.canManageStudents) {
                        IconButton(onClick = onOpenCreate) {
                            Icon(Icons.Outlined.Add, contentDescription = "Add student", tint = Color.White)
                        }
                    }
                },
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
                uiState.errorMessage != null && uiState.students.isEmpty() -> {
                    EmptyState(
                        title = uiState.errorMessage,
                        actionLabel = "Retry",
                        onAction = onRetry,
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        item {
                            OutlinedTextField(
                                value = uiState.search,
                                onValueChange = onSearchChange,
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                label = { Text("Search students") },
                                leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                            )
                        }
                        item {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                StudentRosterFilter.entries.forEach { filter ->
                                    FilterChip(
                                        selected = uiState.rosterFilter == filter,
                                        onClick = { onRosterSelected(filter) },
                                        label = { Text(filter.title) },
                                    )
                                }
                            }
                        }
                        item {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                SelectionField(
                                    modifier = Modifier.weight(1f),
                                    label = "Grade",
                                    value = uiState.selectedGradeId,
                                    options = listOf("all" to "All grades") + uiState.grades.map { it.id.toString() to it.name },
                                    onValueSelected = onGradeSelected,
                                )
                                SelectionField(
                                    modifier = Modifier.weight(1f),
                                    label = "Section",
                                    value = uiState.selectedSectionId,
                                    options = listOf("all" to "All sections") + visibleSections.map { it.id.toString() to it.name },
                                    onValueSelected = onSectionSelected,
                                )
                            }
                        }
                        if (uiState.canManageStudents && visibleStudents.isNotEmpty()) {
                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            StudentQrPrintHelper.printStudentGrid(
                                                context = context,
                                                title = "Student QR Codes",
                                                students = visibleStudents.map { it.toPrintableQr() },
                                            )
                                        },
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Outlined.Print, contentDescription = null)
                                        Text("Print Filtered QR", modifier = Modifier.padding(start = 8.dp))
                                    }
                                    if (selectedIds.isNotEmpty()) {
                                        OutlinedButton(
                                            onClick = {
                                                val selectedStudents = visibleStudents
                                                    .filter { it.id in selectedIds }
                                                    .map { it.toPrintableQr() }
                                                StudentQrPrintHelper.printStudentGrid(
                                                    context = context,
                                                    title = "Selected Student QR Codes",
                                                    students = selectedStudents,
                                                )
                                            },
                                            modifier = Modifier.weight(1f),
                                        ) {
                                            Icon(Icons.Outlined.Print, contentDescription = null)
                                            Text("Print Selected QR", modifier = Modifier.padding(start = 8.dp))
                                        }
                                    }
                                }
                            }
                        }
                        if (uiState.canManageStudents && selectedIds.isNotEmpty()) {
                            item {
                                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text("${selectedIds.size} selected")
                                        OutlinedButton(onClick = { bulkAssignOpen = true }) {
                                            Text("Bulk assign section")
                                        }
                                    }
                                }
                            }
                        }
                        if (visibleStudents.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "No students found",
                                    actionLabel = if (uiState.canManageStudents) "Add student" else "Refresh",
                                    onAction = if (uiState.canManageStudents) onOpenCreate else onRetry,
                                )
                            }
                        } else {
                            items(visibleStudents, key = { it.id }) { student ->
                                StudentRow(
                                    student = student,
                                    canManageStudents = uiState.canManageStudents,
                                    canShowStudentRowActions = uiState.canShowStudentRowActions,
                                    canMarkAbsent = uiState.canMarkAbsent && uiState.rosterFilter == StudentRosterFilter.ACTIVE,
                                    canMarkExcused = uiState.canMarkExcused && uiState.rosterFilter == StudentRosterFilter.ACTIVE,
                                    isSelected = selectedIds.contains(student.id),
                                    onSelectedChange = { checked ->
                                        selectedIds = if (checked) selectedIds + student.id else selectedIds - student.id
                                    },
                                    onEdit = { onOpenEdit(student) },
                                    onDelete = { onConfirmDelete(student) },
                                    onRegenerateQr = { onRegenerateQr(student) },
                                    onPrintQr = {
                                        StudentQrPrintHelper.printSingleStudent(
                                            context = context,
                                            student = student.toPrintableQr(),
                                        )
                                    },
                                    onMarkAbsent = { onOpenStatus(student, "absent") },
                                    onMarkExcused = { onOpenStatus(student, "excused") },
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    StudentEditorDialog(
        state = editorState,
        grades = uiState.grades,
        sections = uiState.sections,
        isSaving = uiState.isSaving,
        onDismiss = onDismissEditor,
        onStateChange = onEditorChange,
        onSave = onSaveStudent,
    )

    if (deleteTarget != null) {
        AppConfirmationDialog(
            title = "Delete student",
            message = "Delete ${deleteTarget.fullName} (${deleteTarget.studentNo})? This cannot be undone.",
            confirmLabel = if (uiState.isSaving) "Deleting..." else "Delete",
            onDismiss = onDismissDelete,
            onConfirm = onDeleteStudent,
            isDestructive = true,
            confirmEnabled = !uiState.isSaving,
        )
    }

    if (statusDialog != null) {
        var showDatePicker by remember(statusDialog.studentId, statusDialog.status) { mutableStateOf(false) }
        AppFormDialog(
            title = "Mark ${statusDialog.status}",
            onDismiss = onDismissStatus,
            onConfirm = onApplyStatus,
            confirmLabel = "Apply",
        ) {
            Text(statusDialog.studentName)
            AppDateField(
                value = statusDialog.date,
                modifier = Modifier.fillMaxWidth(),
                label = "Date",
                onClick = { showDatePicker = true },
            )
            OutlinedTextField(
                value = statusDialog.note,
                onValueChange = onStatusNoteChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Note") },
            )
        }

        if (showDatePicker) {
            AppDatePickerDialog(
                selectedIsoDate = statusDialog.date,
                onDismiss = { showDatePicker = false },
                onConfirm = {
                    onStatusDateChange(it)
                    showDatePicker = false
                },
            )
        }
    }

    if (bulkAssignOpen) {
        AppFormDialog(
            title = "Bulk assign section",
            onDismiss = { bulkAssignOpen = false },
            onConfirm = {
                bulkAssignOpen = false
                onBulkAssign(selectedIds.toList(), bulkAssignSectionId.toIntOrNull())
                bulkAssignSectionId = "none"
                selectedIds = emptySet()
            },
            confirmLabel = "Apply",
        ) {
            SelectionField(
                label = "Section",
                value = bulkAssignSectionId,
                options = listOf("none" to "Clear section assignment") + uiState.sections.map { it.id.toString() to it.name },
                onValueSelected = { bulkAssignSectionId = it },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun StudentRow(
    student: StudentSummary,
    canManageStudents: Boolean,
    canShowStudentRowActions: Boolean,
    canMarkAbsent: Boolean,
    canMarkExcused: Boolean,
    isSelected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onRegenerateQr: () -> Unit,
    onPrintQr: () -> Unit,
    onMarkAbsent: () -> Unit,
    onMarkExcused: () -> Unit,
) {
    Card {
        Box(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 12.dp, end = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                StudentAttendanceStatusBadge(student.currentDayStatus)
                StatusBadge(
                    label = if (student.isActive) "Active" else "Inactive",
                    isActive = student.isActive,
                )
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (canManageStudents && canShowStudentRowActions) {
                        Checkbox(checked = isSelected, onCheckedChange = { onSelectedChange(it) })
                    }
                    if (student.photoUrl != null) {
                        AsyncImage(
                            model = student.photoUrl,
                            contentDescription = student.fullName,
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .padding(end = 4.dp),
                            contentScale = ContentScale.Crop,
                        )
                    }
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(student.fullName, style = MaterialTheme.typography.titleMedium)
                        Text(student.studentNo, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            listOfNotNull(student.gradeLevelName, student.sectionName).joinToString(" / ").ifBlank { "Unassigned" },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                if (!student.guardianPhone.isNullOrBlank()) {
                    Text("Guardian: ${student.guardianPhone}", style = MaterialTheme.typography.bodySmall)
                }
                if (canShowStudentRowActions) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (canManageStudents) {
                            ActionChip(
                                label = "Print QR",
                                icon = { Icon(Icons.Outlined.Print, contentDescription = null) },
                                onClick = onPrintQr,
                            )
                            ActionChip(
                                label = "Regenerate QR",
                                icon = { Icon(Icons.Outlined.QrCode2, contentDescription = null) },
                                onClick = onRegenerateQr,
                            )
                            ActionChip(
                                label = "Edit",
                                icon = { Icon(Icons.Outlined.Edit, contentDescription = null) },
                                onClick = onEdit,
                            )
                            ActionChip(
                                label = "Delete",
                                icon = { Icon(Icons.Outlined.DeleteOutline, contentDescription = null) },
                                onClick = onDelete,
                            )
                        }
                        if (canMarkAbsent) {
                            ActionChip(
                                label = "Absent",
                                icon = { Icon(Icons.Outlined.PersonOff, contentDescription = null) },
                                onClick = onMarkAbsent,
                            )
                        }
                        if (canMarkExcused) {
                            ActionChip(
                                label = "Excused",
                                icon = { Icon(Icons.Outlined.CheckCircle, contentDescription = null) },
                                onClick = onMarkExcused,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StudentAttendanceStatusBadge(status: String?) {
    val badge = when (status?.lowercase()) {
        "late" -> Triple("Late", Color(0xFFFEF3C7), Color(0xFFB45309))
        "absent" -> Triple("Absent", Color(0xFFFEE2E2), Color(0xFFB91C1C))
        "excused" -> Triple("Excused", Color(0xFFDCFCE7), Color(0xFF166534))
        else -> null
    } ?: return

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(badge.second)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = badge.first,
            color = badge.third,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

@Composable
private fun ActionChip(
    label: String,
    icon: @Composable (() -> Unit)? = null,
    onClick: () -> Unit,
) {
    AssistChip(
        onClick = onClick,
        label = { Text(label) },
        leadingIcon = icon,
    )
}

@Composable
private fun StatusBadge(
    label: String,
    isActive: Boolean,
    modifier: Modifier = Modifier,
) {
    val containerColor = if (isActive) {
        MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
    } else {
        MaterialTheme.colorScheme.error.copy(alpha = 0.14f)
    }
    val contentColor = if (isActive) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.error
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(999.dp))
            .background(containerColor)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = label,
            color = contentColor,
            style = MaterialTheme.typography.labelMedium,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StudentEditorDialog(
    state: StudentEditorState?,
    grades: List<GradeLevelSummary>,
    sections: List<SectionSummary>,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onStateChange: ((StudentEditorState) -> StudentEditorState) -> Unit,
    onSave: (ByteArray?, String?, String?) -> Unit,
) {
    if (state == null) return
    val context = androidx.compose.ui.platform.LocalContext.current
    var selectedPhotoBytes by remember(state.id) { mutableStateOf<ByteArray?>(null) }
    var selectedPhotoName by remember(state.id) { mutableStateOf<String?>(null) }
    var selectedPhotoMimeType by remember(state.id) { mutableStateOf<String?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        readFileSelection(context, uri)?.let { file ->
            selectedPhotoBytes = file.bytes
            selectedPhotoName = file.name
            selectedPhotoMimeType = file.mimeType
        }
    }
    val filteredSections = sections.filter {
        state.gradeLevelId.isBlank() || it.gradeLevelId.toString() == state.gradeLevelId
    }

    AppFormDialog(
        title = if (state.isEdit) "Edit student" else "Add student",
        onDismiss = onDismiss,
        onConfirm = {
            onSave(selectedPhotoBytes, selectedPhotoName, selectedPhotoMimeType)
        },
        confirmLabel = if (isSaving) "Saving..." else "Save",
        confirmEnabled = !isSaving,
    ) {
        OutlinedTextField(
            value = state.firstName,
            onValueChange = { onStateChange { current -> current.copy(firstName = it) } },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("First name") },
        )
        OutlinedTextField(
            value = state.lastName,
            onValueChange = { onStateChange { current -> current.copy(lastName = it) } },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Last name") },
        )
        OutlinedTextField(
            value = state.studentNo,
            onValueChange = { onStateChange { current -> current.copy(studentNo = it) } },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Student number") },
        )
        SelectionField(
            label = "Grade",
            value = state.gradeLevelId,
            options = grades.map { it.id.toString() to it.name },
            onValueSelected = {
                onStateChange { current -> current.copy(gradeLevelId = it, sectionId = "") }
            },
        )
        SelectionField(
            label = "Section",
            value = state.sectionId,
            options = listOf("" to "No section") + filteredSections.map { it.id.toString() to it.name },
            onValueSelected = { onStateChange { current -> current.copy(sectionId = it) } },
        )
        OutlinedTextField(
            value = state.guardianName,
            onValueChange = { onStateChange { current -> current.copy(guardianName = it) } },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Guardian name") },
        )
        OutlinedTextField(
            value = state.guardianPhone,
            onValueChange = { onStateChange { current -> current.copy(guardianPhone = it) } },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Guardian phone") },
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(if (selectedPhotoName != null) selectedPhotoName!! else "Student photo")
            OutlinedButton(onClick = { launcher.launch(arrayOf("image/*")) }) {
                Icon(Icons.Outlined.PhotoCamera, contentDescription = null)
                Text("Choose photo")
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Active")
            Switch(
                checked = state.isActive,
                onCheckedChange = { onStateChange { current -> current.copy(isActive = it) } },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectionField(
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
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth(),
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            options.forEach { (optionValue, optionLabel) ->
                DropdownMenuItem(
                    text = { Text(optionLabel) },
                    onClick = {
                        onValueSelected(optionValue)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun EmptyState(
    title: String,
    actionLabel: String,
    onAction: () -> Unit,
) {
    Card {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Button(onClick = onAction) {
                Icon(Icons.Outlined.Refresh, contentDescription = null)
                Text(actionLabel)
            }
        }
    }
}

private data class FileSelection(
    val bytes: ByteArray,
    val name: String,
    val mimeType: String,
)

private fun readFileSelection(context: Context, uri: Uri): FileSelection? {
    val resolver = context.contentResolver
    val mimeType = resolver.getType(uri) ?: "image/jpeg"
    val name = resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { cursor ->
            if (cursor.moveToFirst()) {
                cursor.getString(0)
            } else {
                null
            }
        } ?: "student-photo"
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    return FileSelection(bytes = bytes, name = name, mimeType = mimeType)
}

private fun StudentSummary.toPrintableQr(): PrintableStudentQr = PrintableStudentQr(
    fullName = fullName,
    studentNo = studentNo,
    gradeLevelName = gradeLevelName ?: sectionName,
    qrToken = qrToken,
)
