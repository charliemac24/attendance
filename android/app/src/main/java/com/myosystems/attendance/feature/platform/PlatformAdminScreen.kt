package com.myosystems.attendance.feature.platform

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.DeleteOutline
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.model.PlatformSchool
import com.myosystems.attendance.core.model.PlatformUser
import com.myosystems.attendance.core.model.SectionSummary
import com.myosystems.attendance.core.model.UserRole

@Composable
fun PlatformAdminRoute(
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefreshSession: () -> Unit,
    viewModel: PlatformAdminViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val dialogState by viewModel.dialogState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    PlatformAdminScreen(
        uiState = uiState,
        dialogState = dialogState,
        onBack = onBack,
        onOpenScanner = onOpenScanner,
        onRefresh = viewModel::pullToRefresh,
        onSelectTab = viewModel::selectTab,
        onSwitchSchool = { viewModel.switchSchool(it, onRefreshSession) },
        onOpenNewSchool = viewModel::openNewSchoolDialog,
        onEditSchool = viewModel::openEditSchoolDialog,
        onDeleteSchool = viewModel::confirmDeleteSchool,
        onOpenNewUser = viewModel::openNewUserDialog,
        onEditUser = viewModel::openEditUserDialog,
        onDeleteUser = viewModel::confirmDeleteUser,
        onDismissDialog = viewModel::dismissDialog,
        onUpdateSchoolDraft = viewModel::updateSchoolDraft,
        onSaveSchool = viewModel::saveSchool,
        onUpdateUserDraft = viewModel::updateUserDraft,
        onSaveUser = viewModel::saveUser,
        onConfirmDelete = viewModel::confirmDelete,
        snackbarHostState = snackbarHostState,
    )
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun PlatformAdminScreen(
    uiState: PlatformAdminUiState,
    dialogState: PlatformDialogState,
    onBack: () -> Unit,
    onOpenScanner: () -> Unit,
    onRefresh: () -> Unit,
    onSelectTab: (PlatformTab) -> Unit,
    onSwitchSchool: (Int) -> Unit,
    onOpenNewSchool: () -> Unit,
    onEditSchool: (Int) -> Unit,
    onDeleteSchool: (Int) -> Unit,
    onOpenNewUser: () -> Unit,
    onEditUser: (Int) -> Unit,
    onDeleteUser: (Int) -> Unit,
    onDismissDialog: () -> Unit,
    onUpdateSchoolDraft: ((PlatformDialogState.SchoolEditor) -> PlatformDialogState.SchoolEditor) -> Unit,
    onSaveSchool: () -> Unit,
    onUpdateUserDraft: ((PlatformDialogState.UserEditor) -> PlatformDialogState.UserEditor) -> Unit,
    onSaveUser: () -> Unit,
    onConfirmDelete: () -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = if (uiState.currentUserRole == UserRole.SUPER_ADMIN) "Platform Admin" else "Accounts",
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
                else -> LazyColumn(
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
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("Platform Control", style = MaterialTheme.typography.titleLarge)
                                Text(
                                    if (uiState.currentUserRole == UserRole.SUPER_ADMIN) {
                                        "Manage cross-school scope, platform schools, and user accounts from one mobile workspace."
                                    } else {
                                        "Manage user accounts for your current school."
                                    },
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                                SummaryRow(
                                    schoolsCount = uiState.schools.size,
                                    usersCount = uiState.users.size,
                                    selectedSchoolName = uiState.schools.firstOrNull { it.id == uiState.selectedSchoolId }?.name,
                                )
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    uiState.availableTabs.forEach { tab ->
                                        FilterChip(
                                            selected = uiState.selectedTab == tab,
                                            onClick = { onSelectTab(tab) },
                                            label = { Text(tab.label) },
                                        )
                                    }
                                }
                            }
                        }
                    }
                    uiState.errorMessage?.let { message ->
                        item {
                            Card {
                                Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                            }
                        }
                    }
                    when (uiState.selectedTab) {
                        PlatformTab.Scope -> item {
                            ScopeCard(
                                schools = uiState.schools,
                                selectedSchoolId = uiState.selectedSchoolId,
                                onSwitchSchool = onSwitchSchool,
                            )
                        }
                        PlatformTab.Schools -> {
                            if (uiState.canManageSchools) {
                                item { ActionHeaderCard("Schools", "Add School", onOpenNewSchool) }
                                schoolItems(uiState.schools, onEditSchool, onDeleteSchool)
                            }
                        }
                        PlatformTab.Users -> {
                            item { ActionHeaderCard("Users", "Add User", onOpenNewUser) }
                            userItems(uiState.users, uiState.schools, onEditUser, onDeleteUser)
                        }
                    }
                }
            }
        }
    }

    when (dialogState) {
        is PlatformDialogState.SchoolEditor -> SchoolEditorDialog(dialogState, onDismissDialog, onUpdateSchoolDraft, onSaveSchool)
        is PlatformDialogState.UserEditor -> UserEditorDialog(
            state = dialogState,
            schools = uiState.schools,
            sections = uiState.sections,
            availableUserRoles = uiState.availableUserRoles,
            canAssignSchool = uiState.canAssignSchool,
            onDismiss = onDismissDialog,
            onUpdate = onUpdateUserDraft,
            onSave = onSaveUser,
        )
        is PlatformDialogState.DeleteConfirmation -> DeleteDialog(dialogState, onDismissDialog, onConfirmDelete)
        PlatformDialogState.None -> Unit
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ScopeCard(
    schools: List<PlatformSchool>,
    selectedSchoolId: Int?,
    onSwitchSchool: (Int) -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.SwapHoriz, contentDescription = null)
                Text("Switch school scope", style = MaterialTheme.typography.titleMedium)
            }
            Text(
                "The selected school controls which users and school-level records you are editing.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                schools.forEach { school ->
                    FilterChip(
                        selected = selectedSchoolId == school.id,
                        onClick = { onSwitchSchool(school.id) },
                        label = { Text(school.name) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ActionHeaderCard(title: String, actionLabel: String, onAction: () -> Unit) {
    Card {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(
                when (title) {
                    "Schools" -> "Create and update school configuration records."
                    else -> "Manage platform users for the selected school scope."
                },
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = onAction) {
                Icon(Icons.Outlined.Add, contentDescription = null)
                Text(actionLabel, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
private fun androidx.compose.foundation.lazy.LazyListScope.schoolItems(
    schools: List<PlatformSchool>,
    onEditSchool: (Int) -> Unit,
    onDeleteSchool: (Int) -> Unit,
) {
    if (schools.isEmpty()) {
        item { EmptyCard("No schools found.") }
    } else {
        items(schools, key = { it.id }) { school ->
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            AvatarIcon(Icons.Outlined.Apartment)
                            Text(school.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            MetaChip("TZ ${school.timezone ?: "-"}")
                            MetaChip("Late ${school.lateTime ?: "-"}")
                            MetaChip("Credits ${school.monthlySmsCredits}")
                            MetaChip("Overage ${school.smsOverageRateCents}c")
                            MetaChip(if (school.smsEnabled) "SMS On" else "SMS Off")
                        }
                    }
                    Row {
                        IconButton(onClick = { onEditSchool(school.id) }) { Icon(Icons.Outlined.Edit, contentDescription = "Edit school") }
                        IconButton(onClick = { onDeleteSchool(school.id) }) { Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete school") }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
private fun androidx.compose.foundation.lazy.LazyListScope.userItems(
    users: List<PlatformUser>,
    schools: List<PlatformSchool>,
    onEditUser: (Int) -> Unit,
    onDeleteUser: (Int) -> Unit,
) {
    if (users.isEmpty()) {
        item { EmptyCard("No users found for the selected scope.") }
    } else {
        items(users, key = { it.id }) { user ->
            val schoolName = schools.firstOrNull { it.id == user.schoolId }?.name ?: "No school"
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                )
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            AvatarIcon(Icons.Outlined.People)
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(user.fullName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                                Text("@${user.username}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            MetaChip(user.role.backendValue.replace('_', ' ').replaceFirstChar(Char::titlecase))
                            MetaChip(schoolName)
                            if (user.teacherSectionIds.isNotEmpty()) {
                                MetaChip("${user.teacherSectionIds.size} sections")
                            }
                        }
                    }
                    Row {
                        IconButton(onClick = { onEditUser(user.id) }) { Icon(Icons.Outlined.Edit, contentDescription = "Edit user") }
                        IconButton(onClick = { onDeleteUser(user.id) }) { Icon(Icons.Outlined.DeleteOutline, contentDescription = "Delete user") }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyCard(message: String) {
    Card {
        Box(modifier = Modifier.fillMaxWidth().padding(28.dp), contentAlignment = Alignment.Center) {
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SchoolEditorDialog(
    state: PlatformDialogState.SchoolEditor,
    onDismiss: () -> Unit,
    onUpdate: ((PlatformDialogState.SchoolEditor) -> PlatformDialogState.SchoolEditor) -> Unit,
    onSave: () -> Unit,
) {
    FormDialog(
        title = if (state.schoolId == null) "Add School" else "Edit School",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = "Save",
    ) {
        OutlinedTextField(value = state.name, onValueChange = { onUpdate { current -> current.copy(name = it) } }, label = { Text("School name") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = state.loginSlug, onValueChange = { onUpdate { current -> current.copy(loginSlug = it) } }, label = { Text("School slug") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = state.timezone, onValueChange = { onUpdate { current -> current.copy(timezone = it) } }, label = { Text("Timezone") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(value = state.lateTime, onValueChange = { onUpdate { current -> current.copy(lateTime = it) } }, label = { Text("Late time") }, modifier = Modifier.weight(1f))
            OutlinedTextField(value = state.cutoffTime, onValueChange = { onUpdate { current -> current.copy(cutoffTime = it) } }, label = { Text("Cutoff time") }, modifier = Modifier.weight(1f))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("SMS enabled", style = MaterialTheme.typography.titleSmall)
                Text("Controls SMS features for this school.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = state.smsEnabled, onCheckedChange = { onUpdate { current -> current.copy(smsEnabled = it) } })
        }
        OutlinedTextField(value = state.smsProvider, onValueChange = { onUpdate { current -> current.copy(smsProvider = it) } }, label = { Text("SMS provider") }, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(value = state.monthlySmsCredits, onValueChange = { onUpdate { current -> current.copy(monthlySmsCredits = it) } }, label = { Text("Monthly credits") }, modifier = Modifier.weight(1f))
            OutlinedTextField(value = state.smsOverageRateCents, onValueChange = { onUpdate { current -> current.copy(smsOverageRateCents = it) } }, label = { Text("Overage cents") }, modifier = Modifier.weight(1f))
        }
        if (state.schoolId == null) {
            SectionLabel("Initial Admin")
            OutlinedTextField(value = state.adminUsername, onValueChange = { onUpdate { current -> current.copy(adminUsername = it) } }, label = { Text("Admin username") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = state.adminPassword, onValueChange = { onUpdate { current -> current.copy(adminPassword = it) } }, label = { Text("Admin password") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = state.adminFullName, onValueChange = { onUpdate { current -> current.copy(adminFullName = it) } }, label = { Text("Admin full name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = state.adminEmail, onValueChange = { onUpdate { current -> current.copy(adminEmail = it) } }, label = { Text("Admin email") }, modifier = Modifier.fillMaxWidth())
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun UserEditorDialog(
    state: PlatformDialogState.UserEditor,
    schools: List<PlatformSchool>,
    sections: List<SectionSummary>,
    availableUserRoles: List<String>,
    canAssignSchool: Boolean,
    onDismiss: () -> Unit,
    onUpdate: ((PlatformDialogState.UserEditor) -> PlatformDialogState.UserEditor) -> Unit,
    onSave: () -> Unit,
) {
    FormDialog(
        title = if (state.userId == null) "Add User" else "Edit User",
        onDismiss = onDismiss,
        onConfirm = onSave,
        confirmLabel = "Save",
    ) {
        if (!state.isEdit) {
            OutlinedTextField(value = state.username, onValueChange = { onUpdate { current -> current.copy(username = it) } }, label = { Text("Username") }, modifier = Modifier.fillMaxWidth())
        }
        OutlinedTextField(value = state.password, onValueChange = { onUpdate { current -> current.copy(password = it) } }, label = { Text(if (state.isEdit) "New password" else "Password") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = state.fullName, onValueChange = { onUpdate { current -> current.copy(fullName = it) } }, label = { Text("Full name") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = state.email, onValueChange = { onUpdate { current -> current.copy(email = it) } }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())

        SectionLabel("Role")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            availableUserRoles.forEach { role ->
                FilterChip(selected = state.role == role, onClick = { onUpdate { current -> current.copy(role = role) } }, label = { Text(role.replace('_', ' ')) })
            }
        }

        if (canAssignSchool) {
            SectionLabel("School")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                schools.forEach { school ->
                    FilterChip(
                        selected = state.schoolId == school.id.toString(),
                        onClick = { onUpdate { current -> current.copy(schoolId = school.id.toString()) } },
                        label = { Text(school.name) },
                    )
                }
            }
        } else {
            schools.firstOrNull()?.let { school ->
                SectionLabel("School")
                MetaChip(school.name)
            }
        }

        if (state.role == "teacher") {
            SectionLabel("Assigned Grade Level and Section")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                sections.forEach { section ->
                    FilterChip(
                        selected = state.teacherSectionIds.contains(section.id),
                        onClick = {
                            onUpdate { current ->
                                val next = if (current.teacherSectionIds.contains(section.id)) current.teacherSectionIds - section.id else current.teacherSectionIds + section.id
                                current.copy(teacherSectionIds = next.sorted())
                            }
                        },
                        label = {
                            Text(
                                section.gradeLevelName
                                    ?.takeIf { it.isNotBlank() }
                                    ?.let { "$it - ${section.name}" }
                                    ?: section.name,
                            )
                        },
                    )
                }
            }
            Text(
                "Teachers will only see students and attendance data from the grade-level sections assigned here.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun DeleteDialog(
    state: PlatformDialogState.DeleteConfirmation,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AppConfirmationDialog(
        title = state.title,
        message = state.message,
        confirmLabel = "Delete",
        onDismiss = onDismiss,
        onConfirm = onConfirm,
        isDestructive = true,
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SummaryRow(
    schoolsCount: Int,
    usersCount: Int,
    selectedSchoolName: String?,
) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        MetaChip("$schoolsCount schools")
        MetaChip("$usersCount users")
        selectedSchoolName?.let { MetaChip("Scope: $it") }
    }
}

@Composable
private fun MetaChip(label: String) {
    AssistChip(
        onClick = {},
        label = {
            Text(
                label,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        },
    )
}

@Composable
private fun AvatarIcon(icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Box(
        modifier = Modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun FormDialog(
    title: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    confirmLabel: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = MaterialTheme.shapes.extraLarge,
            tonalElevation = 6.dp,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .defaultMinSize(minWidth = 320.dp)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 520.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    content = content,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                ) {
                    TextButton(onClick = onDismiss) { Text("Cancel") }
                    TextButton(onClick = onConfirm) { Text(confirmLabel) }
                }
            }
        }
    }
}
