package com.myosystems.attendance.feature.dashboard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.ClearAll
import androidx.compose.material.icons.outlined.CrisisAlert
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.DashboardCustomize
import androidx.compose.material.icons.outlined.Domain
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.TaskAlt
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myosystems.attendance.core.model.AtRiskStudent
import com.myosystems.attendance.core.model.AttendanceRecord
import com.myosystems.attendance.core.model.DashboardSummary
import com.myosystems.attendance.core.model.UserRole
import com.myosystems.attendance.core.ui.AppConfirmationDialog
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.util.formatDatabaseTime
import com.myosystems.attendance.core.util.formatIsoDateForDisplay
import com.myosystems.attendance.feature.today.TodayStatusType
import java.time.Instant
import java.time.ZoneOffset
import kotlinx.coroutines.launch

@Composable
fun DashboardRoute(
    userName: String,
    userRole: UserRole,
    schoolName: String,
    scrollToGradeBreakdown: Boolean,
    onDrawerVisibilityChanged: (Boolean) -> Unit,
    onLogout: () -> Unit,
    canOpenScanner: Boolean,
    onOpenScanner: () -> Unit,
    canOpenAdmin: Boolean,
    onOpenAdmin: () -> Unit,
    canOpenStudents: Boolean,
    onOpenStudents: () -> Unit,
    canOpenSettings: Boolean,
    onOpenSettings: () -> Unit,
    canOpenSms: Boolean,
    onOpenSms: () -> Unit,
    canOpenReports: Boolean,
    onOpenReports: () -> Unit,
    canOpenPlatformAdmin: Boolean,
    onOpenPlatformAdmin: () -> Unit,
    canOpenAccounts: Boolean,
    onOpenAccounts: () -> Unit,
    canOpenOnCampus: Boolean,
    canOpenAbsences: Boolean,
    showDashboardKpis: Boolean,
    showMissedCheckoutSection: Boolean,
    showAttentionSection: Boolean,
    showGradeBreakdownSection: Boolean,
    showRecentActivitySection: Boolean,
    onOpenStatus: (TodayStatusType) -> Unit,
    viewModel: DashboardViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    var showClearDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.messages.collect { message ->
            snackbarHostState.showSnackbar(message)
        }
    }

    DashboardScreen(
        uiState = uiState,
        userName = userName,
        userRole = userRole,
        schoolName = schoolName,
        scrollToGradeBreakdown = scrollToGradeBreakdown,
        onDrawerVisibilityChanged = onDrawerVisibilityChanged,
        onLogout = onLogout,
        canOpenScanner = canOpenScanner,
        onOpenScanner = onOpenScanner,
        canOpenAdmin = canOpenAdmin,
        onOpenAdmin = onOpenAdmin,
        canOpenStudents = canOpenStudents,
        onOpenStudents = onOpenStudents,
        canOpenSettings = canOpenSettings,
        onOpenSettings = onOpenSettings,
        canOpenSms = canOpenSms,
        onOpenSms = onOpenSms,
        canOpenReports = canOpenReports,
        onOpenReports = onOpenReports,
        canOpenPlatformAdmin = canOpenPlatformAdmin,
        onOpenPlatformAdmin = onOpenPlatformAdmin,
        canOpenAccounts = canOpenAccounts,
        onOpenAccounts = onOpenAccounts,
        canOpenOnCampus = canOpenOnCampus,
        canOpenAbsences = canOpenAbsences,
        showDashboardKpis = showDashboardKpis,
        showMissedCheckoutSection = showMissedCheckoutSection,
        showAttentionSection = showAttentionSection,
        showGradeBreakdownSection = showGradeBreakdownSection,
        showRecentActivitySection = showRecentActivitySection,
        onOpenStatus = onOpenStatus,
        onRetry = viewModel::refresh,
        onToday = viewModel::selectToday,
        onYesterday = viewModel::selectYesterday,
        onDateSelected = viewModel::selectDate,
        onRefresh = viewModel::refresh,
        onClearRecentActivity = { showClearDialog = true },
        snackbarHostState = snackbarHostState,
    )

    if (showClearDialog) {
        AppConfirmationDialog(
            title = "Clear recent activity",
            message = "Remove all recent activity entries for this school?",
            confirmLabel = "Clear",
            onDismiss = { showClearDialog = false },
            onConfirm = {
                showClearDialog = false
                viewModel.clearRecentActivity()
            },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun DashboardScreen(
    uiState: DashboardUiState,
    userName: String,
    userRole: UserRole,
    schoolName: String,
    scrollToGradeBreakdown: Boolean,
    onDrawerVisibilityChanged: (Boolean) -> Unit,
    onLogout: () -> Unit,
    canOpenScanner: Boolean,
    onOpenScanner: () -> Unit,
    canOpenAdmin: Boolean,
    onOpenAdmin: () -> Unit,
    canOpenStudents: Boolean,
    onOpenStudents: () -> Unit,
    canOpenSettings: Boolean,
    onOpenSettings: () -> Unit,
    canOpenSms: Boolean,
    onOpenSms: () -> Unit,
    canOpenReports: Boolean,
    onOpenReports: () -> Unit,
    canOpenPlatformAdmin: Boolean,
    onOpenPlatformAdmin: () -> Unit,
    canOpenAccounts: Boolean,
    onOpenAccounts: () -> Unit,
    canOpenOnCampus: Boolean,
    canOpenAbsences: Boolean,
    showDashboardKpis: Boolean,
    showMissedCheckoutSection: Boolean,
    showAttentionSection: Boolean,
    showGradeBreakdownSection: Boolean,
    showRecentActivitySection: Boolean,
    onOpenStatus: (TodayStatusType) -> Unit,
    onRetry: () -> Unit,
    onToday: () -> Unit,
    onYesterday: () -> Unit,
    onDateSelected: (String) -> Unit,
    onRefresh: () -> Unit,
    onClearRecentActivity: () -> Unit,
    snackbarHostState: SnackbarHostState,
) {
    var showDatePicker by remember { mutableStateOf(false) }
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    val headerBlue = Color(0xFF0E5CCF)
    val drawerBackground = Color.White
    val drawerForeground = Color(0xFF141414)
    val drawerMuted = Color(0xFF141414).copy(alpha = 0.72f)
    val quickLinkActions = remember(
        canOpenAdmin,
        canOpenStudents,
        canOpenSettings,
        canOpenSms,
        canOpenReports,
        canOpenPlatformAdmin,
        canOpenAccounts,
        canOpenOnCampus,
        canOpenAbsences,
    ) {
        buildQuickLinkActions(
            canOpenAdmin = canOpenAdmin,
            canOpenScanner = canOpenScanner,
            onOpenScanner = onOpenScanner,
            onOpenAdmin = onOpenAdmin,
            canOpenStudents = canOpenStudents,
            onOpenStudents = onOpenStudents,
            canOpenSettings = canOpenSettings,
            onOpenSettings = onOpenSettings,
            canOpenSms = canOpenSms,
            onOpenSms = onOpenSms,
            canOpenReports = canOpenReports,
            onOpenReports = onOpenReports,
            canOpenPlatformAdmin = canOpenPlatformAdmin,
            onOpenPlatformAdmin = onOpenPlatformAdmin,
            canOpenAccounts = canOpenAccounts,
            onOpenAccounts = onOpenAccounts,
            canOpenOnCampus = canOpenOnCampus,
            canOpenAbsences = canOpenAbsences,
            onOpenStatus = onOpenStatus,
        )
    }

    LaunchedEffect(
        scrollToGradeBreakdown,
        uiState.dashboard,
        showDashboardKpis,
        showMissedCheckoutSection,
        showAttentionSection,
        showGradeBreakdownSection,
        uiState.showStudentsNeedingAttention,
    ) {
        if (scrollToGradeBreakdown && uiState.dashboard != null && showGradeBreakdownSection) {
            var targetIndex = 1
            if (showDashboardKpis) targetIndex += 1
            if (showMissedCheckoutSection) targetIndex += 1
            if (showAttentionSection && uiState.showStudentsNeedingAttention) targetIndex += 1
            listState.scrollToItem(targetIndex)
        }
    }

    LaunchedEffect(drawerState.isOpen) {
        onDrawerVisibilityChanged(drawerState.isOpen)
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = drawerBackground,
                drawerContentColor = drawerForeground,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        "Quick Links",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = drawerForeground,
                    )
                    Text(
                        schoolName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = drawerMuted,
                    )
                    quickLinkActions.forEach { action ->
                        NavigationDrawerItem(
                            label = {
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(
                                        action.title,
                                        fontWeight = FontWeight.SemiBold,
                                        color = drawerForeground,
                                    )
                                    Text(
                                        action.supporting,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = drawerMuted,
                                    )
                                }
                            },
                            selected = false,
                            onClick = {
                                coroutineScope.launch { drawerState.close() }
                                action.onClick()
                            },
                            icon = {
                                Icon(action.icon, contentDescription = null, tint = drawerForeground)
                            },
                            colors = androidx.compose.material3.NavigationDrawerItemDefaults.colors(
                                unselectedContainerColor = Color.Transparent,
                                selectedContainerColor = Color(0xFFF2F4F7),
                                unselectedTextColor = drawerForeground,
                                selectedTextColor = drawerForeground,
                                unselectedIconColor = drawerForeground,
                                selectedIconColor = drawerForeground,
                            ),
                        )
                    }
                    }
                }
        },
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF7F4FA)),
        ) {
            Scaffold(
                containerColor = Color(0xFFF7F4FA),
                topBar = {
                    AppSectionTopBar(
                        title = "MYO Attendance",
                        subtitle = schoolName,
                        onOpenScanner = if (canOpenScanner) onOpenScanner else null,
                        leading = {
                            if (quickLinkActions.isNotEmpty()) {
                                Surface(
                                    onClick = { coroutineScope.launch { drawerState.open() } },
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.Transparent,
                                ) {
                                    Box(
                                        modifier = Modifier.size(40.dp),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(
                                            Icons.Outlined.Menu,
                                            contentDescription = "Open quick links",
                                            tint = Color.White,
                                        )
                                    }
                                }
                            } else {
                                Spacer(modifier = Modifier.size(40.dp))
                            }
                        },
                        actions = {
                            Surface(
                                onClick = onLogout,
                                shape = RoundedCornerShape(12.dp),
                                color = Color.Transparent,
                            ) {
                                Box(
                                    modifier = Modifier.size(40.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Outlined.Logout,
                                        contentDescription = "Logout",
                                        tint = Color.White,
                                    )
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
                        uiState.errorMessage != null && uiState.dashboard == null -> {
                            ErrorState(
                                message = uiState.errorMessage,
                                onRetry = onRetry,
                            )
                        }
                        else -> {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                                verticalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                item {
                                    HeaderCard(
                                        userName = userName,
                                        userRole = userRole,
                                        schoolName = schoolName,
                                        selectedDate = uiState.selectedDate,
                                        onToday = onToday,
                                        onYesterday = onYesterday,
                                        onSelectDate = { showDatePicker = true },
                                    )
                                }
                                uiState.dashboard?.let { dashboard ->
                                    if (showDashboardKpis) {
                                        item {
                                            KpiSection(
                                                dashboard = dashboard,
                                                onOpenStatus = onOpenStatus,
                                            )
                                        }
                                    }
                                    if (showMissedCheckoutSection) {
                                        item {
                                            MissedCheckoutSection(
                                                records = dashboard.missedCheckoutsPreviousDay,
                                            )
                                        }
                                    }
                                    if (showAttentionSection && uiState.showStudentsNeedingAttention) {
                                        item {
                                            AttentionSection(
                                                students = uiState.intelligence?.atRiskStudents.orEmpty(),
                                                count = uiState.intelligence?.summary?.atRiskCount ?: 0,
                                            )
                                        }
                                    }
                                    if (showGradeBreakdownSection) {
                                        item {
                                            GradeBreakdownSection(
                                                dashboard = dashboard,
                                            )
                                        }
                                    }
                                    if (showRecentActivitySection) {
                                        item {
                                            RecentActivitySection(
                                                events = dashboard.recentEvents,
                                                canClear = uiState.canClearRecentActivity,
                                                isClearing = uiState.isClearingRecentActivity,
                                                onClear = onClearRecentActivity,
                                            )
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
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HeaderCard(
    userName: String,
    userRole: UserRole,
    schoolName: String,
    selectedDate: String,
    onToday: () -> Unit,
    onYesterday: () -> Unit,
    onSelectDate: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = Color.White,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
    ) {
        Box(
            modifier = Modifier.fillMaxWidth(),
        ) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 18.dp, end = 22.dp)
                    .size(92.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(Color(0xFFE8F1FF)),
            )
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 42.dp, end = 52.dp)
                    .size(40.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(Color(0xFFF3F8FF)),
            )
            Icon(
                imageVector = Icons.Outlined.Domain,
                contentDescription = null,
                tint = Color(0xFFB7CEF8),
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 26.dp, end = 18.dp)
                    .size(86.dp),
            )

            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(androidx.compose.foundation.shape.CircleShape)
                            .background(Color(0xFF1E63DA)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = schoolName.schoolInitials(),
                            color = Color.White,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = schoolName,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF172554),
                        )
                        Text(
                            text = userName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF64748B),
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color(0xFFE9F2FF))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Text(
                            text = "Signed in as ${userRole.displayName()}",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color(0xFF335EA8),
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                HorizontalDivider(color = Color(0xFFE5ECF6))

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "View attendance for",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF94A3B8),
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        HeaderFilterButton(
                            label = "Today",
                            selected = selectedDate == java.time.LocalDate.now().toString(),
                            onClick = onToday,
                        )
                        HeaderFilterButton(
                            label = "Yesterday",
                            selected = false,
                            onClick = onYesterday,
                        )
                        HeaderFilterButton(
                            label = formatIsoDateForDisplay(selectedDate),
                            selected = selectedDate != java.time.LocalDate.now().toString(),
                            onClick = onSelectDate,
                            leadingIcon = {
                                Icon(
                                    Icons.Outlined.CalendarToday,
                                    contentDescription = null,
                                    tint = if (selectedDate != java.time.LocalDate.now().toString()) Color(0xFF1E63DA) else Color(0xFF64748B),
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HeaderFilterButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    leadingIcon: @Composable (() -> Unit)? = null,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = if (selected) Color(0xFFE8F1FF) else Color.White,
        border = BorderStroke(1.dp, if (selected) Color(0xFFC8DBFF) else Color(0xFFE2E8F0)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            leadingIcon?.invoke()
            Text(
                text = label,
                color = if (selected) Color(0xFF1E63DA) else Color(0xFF334155),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            )
        }
    }
}

private fun String.schoolInitials(): String = split(" ")
    .filter { it.isNotBlank() }
    .take(2)
    .joinToString("") { it.first().uppercase() }
    .ifBlank { "SC" }

private fun UserRole.displayName(): String =
    name.lowercase().replace('_', ' ').replaceFirstChar(Char::titlecase)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun KpiSection(
    dashboard: DashboardSummary,
    onOpenStatus: (TodayStatusType) -> Unit,
) {
    val presentToday = dashboard.kpis.checkedOut + dashboard.kpis.onCampus
    val cards = listOf(
        KpiCardModel(
            title = "Present Today",
            value = presentToday.toString(),
            supporting = "Late arrivals are already included",
            icon = Icons.Outlined.Group,
            accent = Color(0xFF0F766E),
            tint = Color(0xFFE6FFFB),
            onClick = { onOpenStatus(TodayStatusType.PENDING_CHECKOUT) },
        ),
        KpiCardModel(
            title = "Not Checked In",
            value = dashboard.kpis.notCheckedIn.toString(),
            supporting = "Active students with no record",
            icon = Icons.Outlined.DashboardCustomize,
            accent = Color(0xFFB45309),
            tint = Color(0xFFFFF5E8),
            onClick = { onOpenStatus(TodayStatusType.NOT_CHECKED_IN) },
        ),
        KpiCardModel(
            title = "Late Arrivals",
            value = dashboard.kpis.lateArrivals.toString(),
            supporting = "Includes on-campus and checked-out late arrivals",
            icon = Icons.Outlined.Schedule,
            accent = Color(0xFF2563EB),
            tint = Color(0xFFEBF3FF),
            onClick = { onOpenStatus(TodayStatusType.LATE) },
        ),
        KpiCardModel(
            title = "Checked Out",
            value = dashboard.kpis.checkedOut.toString(),
            supporting = "Students who completed check-out",
            icon = Icons.Outlined.TaskAlt,
            accent = Color(0xFF15803D),
            tint = Color(0xFFEAF8EE),
            onClick = { onOpenStatus(TodayStatusType.PRESENT) },
        ),
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Today at a glance", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    "Tap a card to open the matching student list.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = Color(0xFFEAF3FF),
                border = BorderStroke(1.dp, Color(0xFFD7E6FF)),
            ) {
                Text(
                    "${dashboard.kpis.total} active",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = Color(0xFF1D4ED8),
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
            }
        }
        SmsCreditsCard(dashboard = dashboard)
        cards.chunked(2).forEach { rowCards ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                rowCards.forEach { card ->
                    KpiCard(
                        title = card.title,
                        value = card.value,
                        supporting = card.supporting,
                        icon = card.icon,
                        accent = card.accent,
                        tint = card.tint,
                        modifier = Modifier.weight(1f),
                        onClick = card.onClick,
                    )
                }
                if (rowCards.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SmsCreditsCard(dashboard: DashboardSummary) {
    val smsCredits = dashboard.smsCredits
    Card(
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF0369A1),
            contentColor = Color.White,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "SMS Credits Remaining",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        "${smsCredits.usedCredits} successful SMS sent for ${smsCredits.month}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.86f),
                    )
                }
                Icon(
                    Icons.Outlined.Assessment,
                    contentDescription = null,
                    tint = Color.White.copy(alpha = 0.92f),
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom,
            ) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        smsCredits.remainingCredits.toString(),
                        style = MaterialTheme.typography.displaySmall,
                        fontWeight = FontWeight.Black,
                    )
                    Text(
                        "/ ${smsCredits.monthlyCredits}",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White.copy(alpha = 0.86f),
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }
                AssistChip(
                    onClick = {},
                    label = {
                        Text(
                            "Used ${smsCredits.usedCredits}",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                        )
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Outlined.Assessment,
                            contentDescription = null,
                            tint = Color.White,
                        )
                    },
                    colors = androidx.compose.material3.AssistChipDefaults.assistChipColors(
                        containerColor = Color.Transparent,
                        labelColor = Color.White,
                        leadingIconContentColor = Color.White,
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)),
                )
            }
            if (smsCredits.overageCount > 0) {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color(0xFFB91C1C),
                        contentColor = Color.White,
                    ),
                ) {
                    Text(
                        "Overage this month: ${smsCredits.overageCount} SMS beyond included credits",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
    }
}

private fun buildQuickLinkActions(
    canOpenAdmin: Boolean,
    canOpenScanner: Boolean,
    onOpenScanner: () -> Unit,
    onOpenAdmin: () -> Unit,
    canOpenStudents: Boolean,
    onOpenStudents: () -> Unit,
    canOpenSettings: Boolean,
    onOpenSettings: () -> Unit,
    canOpenSms: Boolean,
    onOpenSms: () -> Unit,
    canOpenReports: Boolean,
    onOpenReports: () -> Unit,
    canOpenPlatformAdmin: Boolean,
    onOpenPlatformAdmin: () -> Unit,
    canOpenAccounts: Boolean,
    onOpenAccounts: () -> Unit,
    canOpenOnCampus: Boolean,
    canOpenAbsences: Boolean,
    onOpenStatus: (TodayStatusType) -> Unit,
) = buildList {
    if (canOpenScanner) {
        add(ActionCardModel("Open Scanner", "Launch kiosk scanning", Icons.Outlined.QrCodeScanner, onOpenScanner))
    }
    if (canOpenStudents) {
        add(ActionCardModel("Students", "Roster, QR codes, attendance actions", Icons.Outlined.Group, onOpenStudents))
    }
    if (canOpenSettings) {
        add(ActionCardModel("Settings", "School timings, SMS, logo", Icons.Outlined.Settings, onOpenSettings))
    }
    if (canOpenSms) {
        add(ActionCardModel("SMS", "Templates, logs, test messages", Icons.Outlined.Assessment, onOpenSms))
    }
    if (canOpenOnCampus) {
        add(ActionCardModel("On Campus", "Students awaiting check-out", Icons.Outlined.Schedule) {
            onOpenStatus(TodayStatusType.PENDING_CHECKOUT)
        })
    }
    if (canOpenAbsences) {
        add(ActionCardModel("Absences", "Review absent students", Icons.Outlined.TaskAlt) {
            onOpenStatus(TodayStatusType.ABSENT)
        })
    }
    if (canOpenReports) {
        add(ActionCardModel("Reports", "Daily, late, and SMS reports", Icons.Outlined.Assessment, onOpenReports))
    }
    if (canOpenPlatformAdmin) {
        add(ActionCardModel("Platform", "Switch schools and manage users", Icons.Outlined.Domain, onOpenPlatformAdmin))
    } else if (canOpenAccounts) {
        add(ActionCardModel("Accounts", "Manage users for this school", Icons.Outlined.People, onOpenAccounts))
    }
    if (canOpenAdmin) {
        add(ActionCardModel("Admin Hub", "Setup grades, sections, kiosks", Icons.Outlined.AdminPanelSettings, onOpenAdmin))
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    supporting: String,
    icon: ImageVector,
    accent: Color,
    tint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFCFBFF)),
        border = BorderStroke(1.dp, Color(0xFFE7E2F1)),
    ) {
        Column(
            modifier = Modifier
                .height(152.dp)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(accent),
            )
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = tint,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.padding(8.dp),
                )
            }
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                color = Color(0xFF1F2937),
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
            )
            Text(
                value,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Black,
                color = Color(0xFF111827),
            )
            Text(
                supporting,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6B7280),
                maxLines = 2,
            )
        }
    }
}

@Composable
private fun MissedCheckoutSection(records: List<AttendanceRecord>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBFB)),
        border = BorderStroke(1.dp, Color(0xFFF1DDDD)),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("Missed Check-Out Yesterday", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Students who checked in but never recorded a departure.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (records.isEmpty()) Color(0xFFEAF8EE) else Color(0xFFFEECEC),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.CrisisAlert,
                            contentDescription = null,
                            tint = if (records.isEmpty()) Color(0xFF15803D) else Color(0xFFB91C1C),
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            records.size.toString(),
                            style = MaterialTheme.typography.labelLarge,
                            color = if (records.isEmpty()) Color(0xFF15803D) else Color(0xFFB91C1C),
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            if (records.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = Color(0xFFF7F4FA),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White,
                        ) {
                            Icon(
                                Icons.Outlined.TaskAlt,
                                contentDescription = null,
                                tint = Color(0xFF15803D),
                                modifier = Modifier.padding(10.dp),
                            )
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("All clear", fontWeight = FontWeight.SemiBold, color = Color(0xFF111827))
                            Text("No students missed check-out yesterday.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else {
                records.forEach { record ->
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = Color(0xFFFFF4F4),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(3.dp),
                            ) {
                                Text(
                                    record.studentName,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF111827),
                                    maxLines = 2,
                                )
                                Text("${record.gradeLevel} / ${record.section.ifBlank { "-" }}", style = MaterialTheme.typography.bodySmall)
                                Text("Checked in at ${formatDatabaseTime(record.checkInTime)}", style = MaterialTheme.typography.bodySmall)
                            }
                            Surface(
                                shape = RoundedCornerShape(999.dp),
                                color = Color.White,
                            ) {
                                Text(
                                    "Pending",
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color(0xFFB91C1C),
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AttentionSection(
    students: List<AtRiskStudent>,
    count: Int,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Students Needing Attention", style = MaterialTheme.typography.titleMedium)
                AssistChip(onClick = {}, label = { Text(count.toString()) }, leadingIcon = {
                    Icon(Icons.Outlined.CrisisAlert, contentDescription = null)
                })
            }
            if (students.isEmpty()) {
                Text("No students needing attention in the selected window.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                students.take(8).forEach { student ->
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(student.studentName, fontWeight = FontWeight.SemiBold)
                        Text("${student.gradeLevel} / ${student.section}", style = MaterialTheme.typography.bodySmall)
                        Text("Score ${student.score} | ${student.trend.replaceFirstChar(Char::titlecase)}", style = MaterialTheme.typography.bodySmall)
                        if (student.riskFlags.isNotEmpty()) {
                            Text(student.riskFlags.joinToString(", "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    HorizontalDivider()
                }
            }
        }
    }
}

@Composable
private fun GradeBreakdownSection(dashboard: DashboardSummary) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF9FBFF)),
        border = BorderStroke(1.dp, Color(0xFFDCE8FF)),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Attendance by Grade", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "A quick view of attendance coverage across grade levels.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            if (dashboard.gradeBreakdown.isEmpty()) {
                Text("No grade breakdown for this date.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    dashboard.gradeBreakdown.forEach { row ->
                        GradeAttendanceChartRow(
                            label = row.gradeLevel,
                            rate = row.attendanceRate,
                            checkedIn = row.checkedIn,
                            totalStudents = row.totalStudents,
                            absent = row.absent,
                            notCheckedIn = row.notCheckedIn,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GradeAttendanceChartRow(
    label: String,
    rate: Double,
    checkedIn: Int,
    totalStudents: Int,
    absent: Int,
    notCheckedIn: Int,
) {
    val clampedRate = rate.coerceIn(0.0, 100.0)
    val barColor = when {
        clampedRate >= 90 -> Color(0xFF15803D)
        clampedRate >= 75 -> Color(0xFF0F766E)
        clampedRate >= 50 -> Color(0xFFD97706)
        else -> Color(0xFFB91C1C)
    }

    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text("${clampedRate.toInt()}%", style = MaterialTheme.typography.labelLarge, color = barColor)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(14.dp)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceContainerHighest),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth((clampedRate / 100.0).toFloat())
                    .height(14.dp)
                    .clip(MaterialTheme.shapes.small)
                    .background(barColor),
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Present $checkedIn / $totalStudents",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "Absent $absent • Not in $notCheckedIn",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun RecentActivitySection(
    events: List<com.myosystems.attendance.core.model.RecentAttendanceEvent>,
    canClear: Boolean,
    isClearing: Boolean,
    onClear: () -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Recent Activity", style = MaterialTheme.typography.titleMedium)
                if (canClear) {
                    TextButton(onClick = onClear, enabled = !isClearing && events.isNotEmpty()) {
                        Icon(Icons.Outlined.ClearAll, contentDescription = null)
                        Spacer(Modifier.padding(horizontal = 4.dp))
                        Text(if (isClearing) "Clearing..." else "Clear")
                    }
                }
            }
            if (events.isEmpty()) {
                Text("No recent activity", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                events.forEach { event ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(2.dp),
                        ) {
                            Text(
                                event.studentName,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                event.eventType,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            formatDatabaseTime(event.occurredAt),
                            modifier = Modifier.weight(0.42f),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    HorizontalDivider()
                }
            }
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
            Text(message, color = MaterialTheme.colorScheme.error)
            Button(onClick = onRetry) {
                Text("Retry")
            }
        }
    }
}

private data class KpiCardModel(
    val title: String,
    val value: String,
    val supporting: String,
    val icon: ImageVector,
    val accent: Color,
    val tint: Color,
    val onClick: () -> Unit,
)

private data class ActionCardModel(
    val title: String,
    val supporting: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
)

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
