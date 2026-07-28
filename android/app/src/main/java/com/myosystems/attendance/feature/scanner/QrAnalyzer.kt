package com.myosystems.attendance.feature.scanner

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.ExperimentalGetImage
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.atomic.AtomicBoolean

class QrAnalyzer(
    private val onQrDetected: (String) -> Unit,
) : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient()
    private val processing = AtomicBoolean(false)

    @ExperimentalGetImage
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || !processing.compareAndSet(false, true)) {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                barcodes
                    .firstOrNull { it.format == Barcode.FORMAT_QR_CODE }
                    ?.rawValue
                    ?.takeIf { it.isNotBlank() }
                    ?.let(onQrDetected)
            }
            .addOnFailureListener {
                // Ignore per-frame decode failures; scanning continues.
            }
            .addOnCompleteListener {
                processing.set(false)
                imageProxy.close()
            }
    }
}
