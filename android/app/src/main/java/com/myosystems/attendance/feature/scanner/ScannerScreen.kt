package com.myosystems.attendance.feature.scanner

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Clear
import androidx.compose.material.icons.outlined.Keyboard
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Vibration
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.myosystems.attendance.core.ui.AppSectionTopBar
import com.myosystems.attendance.core.model.KioskLocation
import com.myosystems.attendance.core.model.ScanResult
import java.util.concurrent.Executors
import kotlinx.coroutines.delay

@Composable
fun ScannerRoute(
    onBack: () -> Unit,
    viewModel: ScannerViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.feedbackEvents.collect { event ->
            if (event.playSuccessTone) {
                runCatching {
                    val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
                    tone.startTone(ToneGenerator.TONE_PROP_BEEP, 120)
                    delay(120)
                    tone.release()
                }
            }
            if (event.playFailureTone) {
                runCatching {
                    val tone = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
                    tone.startTone(ToneGenerator.TONE_SUP_ERROR, 800)
                    delay(800)
                    tone.release()
                }
            }
            if (event.vibrate) {
                context.vibrateBriefly()
            }
        }
    }

    ScannerScreen(
        state = state,
        onRefresh = viewModel::refreshKiosks,
        onSelectKiosk = viewModel::selectKiosk,
        onToggleSound = viewModel::toggleSound,
        onToggleVibration = viewModel::toggleVibration,
        onQrDetected = viewModel::onQrDetected,
        onDismissOverlay = viewModel::dismissOverlay,
        onBack = onBack,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScannerScreen(
    state: ScannerScreenState,
    onRefresh: () -> Unit,
    onSelectKiosk: (Int) -> Unit,
    onToggleSound: () -> Unit,
    onToggleVibration: () -> Unit,
    onQrDetected: (String) -> Unit,
    onDismissOverlay: () -> Unit,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val activity = context.findActivity()
    val view = LocalView.current

    var permissionState by rememberSaveable { mutableStateOf(initialCameraPermissionState(context)) }
    var requestedOnce by rememberSaveable { mutableStateOf(permissionState == CameraPermissionState.Granted) }
    var isCameraEnabled by rememberSaveable { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionState = when {
            granted -> CameraPermissionState.Granted
            activity != null && ActivityCompat.shouldShowRequestPermissionRationale(activity, android.Manifest.permission.CAMERA) -> CameraPermissionState.Denied
            requestedOnce -> CameraPermissionState.PermanentlyDenied
            else -> CameraPermissionState.Denied
        }
    }

    DisposableEffect(Unit) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }

    DisposableEffect(activity) {
        val window = activity?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    LaunchedEffect(permissionState) {
        if (permissionState != CameraPermissionState.Granted) {
            isCameraEnabled = false
        }
    }

    Scaffold(
        topBar = {
            AppSectionTopBar(
                title = "Native Scanner",
                onBack = onBack,
                actions = {
                    IconButton(onClick = onToggleSound) {
                        Icon(
                            imageVector = if (state.soundEnabled) Icons.Outlined.Notifications else Icons.Outlined.NotificationsOff,
                            contentDescription = "Toggle sound",
                            tint = Color.White,
                        )
                    }
                    IconButton(onClick = onToggleVibration) {
                        Icon(
                            imageVector = Icons.Outlined.Vibration,
                            contentDescription = "Toggle vibration",
                            tint = Color.White,
                        )
                    }
                },
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    KioskSelectorCard(
                        kiosks = state.kiosks,
                        selectedKioskId = state.selectedKioskId,
                        isLoading = state.isLoading,
                        onSelectKiosk = onSelectKiosk,
                        onRefresh = onRefresh,
                    )
                }

                item {
                    when (permissionState) {
                        CameraPermissionState.Granted -> CameraScannerCard(
                            onQrDetected = onQrDetected,
                            isSubmitting = state.uiState is ScannerUiState.Submitting,
                            isCameraEnabled = isCameraEnabled,
                            onToggleCamera = { isCameraEnabled = !isCameraEnabled },
                        )
                        CameraPermissionState.NotRequested,
                        CameraPermissionState.Denied -> PermissionCard(
                            title = "Camera access required",
                            description = "Allow camera access to scan student QR codes natively on this device.",
                            actionLabel = "Allow Camera",
                            onAction = {
                                requestedOnce = true
                                permissionLauncher.launch(android.Manifest.permission.CAMERA)
                            },
                        )
                        CameraPermissionState.PermanentlyDenied -> PermissionCard(
                            title = "Camera permission denied",
                            description = "Open Android Settings and enable camera permission for MYO Attendance.",
                            actionLabel = "Open Settings",
                            onAction = {
                                val intent = Intent(
                                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                    Uri.fromParts("package", context.packageName, null),
                                )
                                context.startActivity(intent)
                            },
                        )
                    }
                }

                item {
                    HardwareScannerCard(
                        onQrDetected = onQrDetected,
                        isSubmitting = state.uiState is ScannerUiState.Submitting,
                    )
                }

                when (val ui = state.uiState) {
                    is ScannerUiState.Error -> item {
                        InlineStatusCard(
                            title = "Unable to scan",
                            message = ui.message,
                            success = false,
                        )
                    }
                    is ScannerUiState.Initializing -> item {
                        InlineLoadingCard("Loading scanner…")
                    }
                    else -> Unit
                }

                if (state.recentScans.isNotEmpty()) {
                    item {
                        Text("Recent scans", style = MaterialTheme.typography.titleMedium)
                    }
                    items(state.recentScans, key = { it.id }) { scan ->
                        RecentScanRow(scan)
                    }
                }
            }

            state.overlay?.let { overlay ->
                ScanOverlay(
                    overlay = overlay,
                    onDismiss = onDismissOverlay,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun KioskSelectorCard(
    kiosks: List<KioskLocation>,
    selectedKioskId: Int?,
    isLoading: Boolean,
    onSelectKiosk: (Int) -> Unit,
    onRefresh: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedKiosk = kiosks.firstOrNull { it.id == selectedKioskId }

    Card {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text("Kiosk Location", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Select the gate or scanner station before scanning.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onRefresh) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh kiosks")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded },
            ) {
                OutlinedTextField(
                    modifier = Modifier
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        .fillMaxWidth(),
                    value = selectedKiosk?.name ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(if (isLoading) "Loading kiosks" else "Select kiosk") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                )

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                ) {
                    kiosks.forEach { kiosk ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(kiosk.name)
                                    Text(
                                        kiosk.slug,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            },
                            onClick = {
                                expanded = false
                                onSelectKiosk(kiosk.id)
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CameraScannerCard(
    onQrDetected: (String) -> Unit,
    isSubmitting: Boolean,
    isCameraEnabled: Boolean,
    onToggleCamera: () -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Native Camera", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (isCameraEnabled) {
                            "Camera scanning is active. Point the QR code inside the guide."
                        } else {
                            "Camera scanning is off until you enable it."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                Button(onClick = onToggleCamera) {
                    Icon(
                        imageVector = if (isCameraEnabled) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                        contentDescription = null,
                    )
                    Text(
                        if (isCameraEnabled) "Disable" else "Enable",
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (!isCameraEnabled) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "The external scanner input below will continue to work even while the camera is disabled.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                return@Column
            }

            Text(
                "Position the QR code inside the guide. The app submits automatically once decoded.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(3f / 4f)
                    .clip(RoundedCornerShape(24.dp))
            ) {
                CameraPreview(onQrDetected = onQrDetected)

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Black.copy(alpha = 0.18f), Color.Transparent, Color.Black.copy(alpha = 0.22f))
                            )
                        )
                )

                Surface(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .fillMaxWidth(0.7f)
                        .aspectRatio(1f),
                    color = Color.Transparent,
                    shape = RoundedCornerShape(28.dp),
                    border = BorderStroke(3.dp, MaterialTheme.colorScheme.primary),
                ) {}

                if (isSubmitting) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .padding(top = 16.dp),
                        shape = RoundedCornerShape(999.dp),
                        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            Text("Submitting scan…", modifier = Modifier.padding(start = 10.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HardwareScannerCard(
    onQrDetected: (String) -> Unit,
    isSubmitting: Boolean,
) {
    var scannerInput by rememberSaveable { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    fun submitCurrentValue() {
        val normalizedValue = scannerInput.trim()
        if (normalizedValue.isBlank()) return
        scannerInput = ""
        onQrDetected(normalizedValue)
    }

    LaunchedEffect(isSubmitting) {
        if (!isSubmitting) {
            focusRequester.requestFocus()
        }
    }

    LaunchedEffect(scannerInput, isSubmitting) {
        val normalizedValue = scannerInput.trim()
        if (isSubmitting || normalizedValue.isBlank()) return@LaunchedEffect

        delay(350)

        if (!isSubmitting && scannerInput.trim() == normalizedValue) {
            submitCurrentValue()
        }
    }

    Card {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("External Scanner", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Use this for USB OTG or Bluetooth scanners that type QR values like a keyboard.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Icon(Icons.Outlined.Keyboard, contentDescription = null)
            }

            OutlinedTextField(
                value = scannerInput,
                onValueChange = { value ->
                    val sanitizedValue = value.replace("\r", "")
                    when {
                        '\n' in sanitizedValue -> {
                            scannerInput = sanitizedValue.substringBefore('\n')
                            submitCurrentValue()
                        }
                        else -> {
                            scannerInput = sanitizedValue
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .focusRequester(focusRequester)
                    .clickable { focusRequester.requestFocus() },
                label = { Text("Scanner input") },
                placeholder = { Text("Tap here, then scan with the external device") },
                supportingText = {
                    Text("The app waits for scanner input, then applies the same QR validation before sending anything.")
                },
                singleLine = true,
                enabled = !isSubmitting,
                leadingIcon = { Icon(Icons.Outlined.QrCodeScanner, contentDescription = null) },
                trailingIcon = {
                    if (scannerInput.isNotEmpty()) {
                        IconButton(onClick = {
                            scannerInput = ""
                            focusRequester.requestFocus()
                        }) {
                            Icon(Icons.Outlined.Clear, contentDescription = "Clear scanner input")
                        }
                    }
                },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(
                    onDone = { submitCurrentValue() },
                ),
            )

            Button(
                onClick = { focusRequester.requestFocus() },
                enabled = !isSubmitting,
            ) {
                Text("Focus Scanner Input")
            }
        }
    }
}

@Composable
private fun CameraPreview(
    onQrDetected: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val analyzer = remember(onQrDetected) { QrAnalyzer(onQrDetected) }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            PreviewView(ctx).apply {
                scaleType = PreviewView.ScaleType.FILL_CENTER
                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            }
        },
        update = { previewView ->
            val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().apply {
                    setSurfaceProvider(previewView.surfaceProvider)
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .apply { setAnalyzer(cameraExecutor, analyzer) }

                runCatching {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        analysis,
                    )
                }
            }, ContextCompat.getMainExecutor(context))
        }
    )

    DisposableEffect(Unit) {
        onDispose {
            ProcessCameraProvider.getInstance(context).get().unbindAll()
            cameraExecutor.shutdown()
        }
    }
}

@Composable
private fun PermissionCard(
    title: String,
    description: String,
    actionLabel: String,
    onAction: () -> Unit,
) {
    Card {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(Icons.Outlined.Settings, contentDescription = null)
            Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 12.dp))
            Text(
                description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
            Button(onClick = onAction, modifier = Modifier.padding(top = 16.dp)) {
                Text(actionLabel)
            }
        }
    }
}

@Composable
private fun InlineLoadingCard(message: String) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            Text(message, modifier = Modifier.padding(start = 12.dp))
        }
    }
}

@Composable
private fun InlineStatusCard(
    title: String,
    message: String,
    success: Boolean,
) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (success) Icons.Outlined.CheckCircle else Icons.Outlined.QrCodeScanner,
                contentDescription = null,
                tint = if (success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            )
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(
                    message,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun RecentScanRow(item: RecentScanItem) {
    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (item.photoUrl != null) {
                AsyncImage(
                    model = item.photoUrl,
                    contentDescription = item.title,
                    modifier = Modifier
                        .size(52.dp)
                        .clip(RoundedCornerShape(16.dp)),
                    contentScale = ContentScale.Crop,
                )
            } else {
                Surface(
                    modifier = Modifier.size(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = if (item.success) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (item.success) Icons.Outlined.CheckCircle else Icons.Outlined.QrCodeScanner,
                            contentDescription = null,
                        )
                    }
                }
            }
            Column(
                modifier = Modifier
                    .padding(start = 14.dp)
                    .weight(1f)
            ) {
                Text(item.title, style = MaterialTheme.typography.titleSmall)
                Text(
                    item.subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (item.time != null) {
                Text(
                    item.time,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ScanOverlay(
    overlay: ScanOverlayState,
    onDismiss: () -> Unit,
) {
    LaunchedEffect(overlay.id()) {
        delay(5_000)
        onDismiss()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.20f))
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = if (overlay.success) Icons.Outlined.CheckCircle else Icons.Outlined.QrCodeScanner,
                    contentDescription = null,
                    tint = if (overlay.success) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(64.dp),
                )
                Text(
                    text = overlay.result.studentName ?: if (overlay.success) "Scan accepted" else "Scan rejected",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(top = 16.dp),
                )
                Text(
                    text = overlay.result.message,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = 8.dp),
                )
                val summary = listOfNotNull(overlay.result.action, overlay.result.time).joinToString(" • ")
                if (summary.isNotBlank()) {
                    Text(
                        text = summary,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 10.dp),
                    )
                }
            }
        }
    }
}

private fun ScanOverlayState.id(): String = "${success}:${result.message}:${result.time.orEmpty()}:${result.studentName.orEmpty()}"

private fun initialCameraPermissionState(context: Context): CameraPermissionState {
    return if (
        ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    ) {
        CameraPermissionState.Granted
    } else {
        CameraPermissionState.NotRequested
    }
}

private fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

@Suppress("DEPRECATION")
private fun Context.vibrateBriefly() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val manager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager ?: return
        manager.defaultVibrator.vibrate(VibrationEffect.createOneShot(120L, VibrationEffect.DEFAULT_AMPLITUDE))
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        @Suppress("DEPRECATION")
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        vibrator.vibrate(VibrationEffect.createOneShot(120L, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
        @Suppress("DEPRECATION")
        val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        vibrator.vibrate(120L)
    }
}
