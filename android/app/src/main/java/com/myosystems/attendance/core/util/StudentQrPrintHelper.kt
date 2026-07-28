package com.myosystems.attendance.core.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.pdf.PdfDocument
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import java.io.FileOutputStream
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.min

data class PrintableStudentQr(
    val fullName: String,
    val studentNo: String,
    val gradeLevelName: String?,
    val qrToken: String,
)

object StudentQrPrintHelper {
    fun printSingleStudent(context: Context, student: PrintableStudentQr) {
        val title = "Student QR Code - ${student.fullName}"
        val bytes = buildSingleStudentPdf(student, title)
        printPdf(context, title, bytes)
    }

    fun printStudentGrid(context: Context, title: String, students: List<PrintableStudentQr>) {
        if (students.isEmpty()) return
        val bytes = buildBulkStudentPdf(title, students)
        printPdf(context, title, bytes)
    }

    private fun printPdf(context: Context, jobName: String, pdfBytes: ByteArray) {
        val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager ?: return
        printManager.print(
            jobName,
            ByteArrayPrintDocumentAdapter(jobName, pdfBytes),
            PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                .build(),
        )
    }

    private fun buildSingleStudentPdf(student: PrintableStudentQr, title: String): ByteArray {
        val document = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = document.startPage(pageInfo)
        val canvas = page.canvas
        canvas.drawColor(Color.WHITE)

        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 20f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val subtitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.DKGRAY
            textSize = 11f
        }
        val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 14f
            textAlign = Paint.Align.CENTER
        }
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.LTGRAY
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }

        canvas.drawText(title, 28f, 40f, titlePaint)
        canvas.drawText("Generated ${timestampLabel()}", 28f, 58f, subtitlePaint)

        val cardLeft = 28f
        val cardTop = 90f
        val cardRight = 567f
        val cardBottom = 540f
        canvas.drawRoundRect(cardLeft, cardTop, cardRight, cardBottom, 12f, 12f, borderPaint)

        val qrBitmap = generateQrBitmap(student.qrToken, 220)
        val qrLeft = (pageInfo.pageWidth - qrBitmap.width) / 2f
        val qrTop = cardTop + 110f
        canvas.drawBitmap(qrBitmap, qrLeft, qrTop, null)

        canvas.drawText(student.fullName, pageInfo.pageWidth / 2f, qrTop + qrBitmap.height + 48f, bodyPaint)
        canvas.drawText("ID: ${student.studentNo}", pageInfo.pageWidth / 2f, qrTop + qrBitmap.height + 68f, bodyPaint)
        canvas.drawText(student.gradeLevelName.orEmpty(), pageInfo.pageWidth / 2f, qrTop + qrBitmap.height + 88f, bodyPaint)

        document.finishPage(page)
        return document.toByteArray()
    }

    private fun buildBulkStudentPdf(title: String, students: List<PrintableStudentQr>): ByteArray {
        val document = PdfDocument()
        val pageWidth = 595
        val pageHeight = 842
        val margin = 24
        val headerHeight = 28
        val cols = 4
        val rows = 3
        val cardsPerPage = cols * rows
        val cardGap = 12
        val cardWidth = (pageWidth - (margin * 2) - (cardGap * (cols - 1))) / cols
        val cardHeight = 220

        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 16f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val subtitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.DKGRAY
            textSize = 10f
        }
        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.LTGRAY
            style = Paint.Style.STROKE
            strokeWidth = 1.5f
        }
        val namePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.BLACK
            textSize = 10f
            textAlign = Paint.Align.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val metaPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.DKGRAY
            textSize = 9f
            textAlign = Paint.Align.CENTER
        }

        students.chunked(cardsPerPage).forEachIndexed { pageIndex, chunk ->
            val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageIndex + 1).create()
            val page = document.startPage(pageInfo)
            val canvas = page.canvas
            canvas.drawColor(Color.WHITE)
            canvas.drawText("$title (${students.size})", margin.toFloat(), 26f, titlePaint)
            canvas.drawText("Generated ${timestampLabel()}", margin.toFloat(), 42f, subtitlePaint)

            chunk.forEachIndexed { index, student ->
                val col = index % cols
                val row = index / cols
                val left = margin + col * (cardWidth + cardGap)
                val top = 56 + row * (cardHeight + cardGap)
                val right = left + cardWidth
                val bottom = top + cardHeight

                canvas.drawRoundRect(left.toFloat(), top.toFloat(), right.toFloat(), bottom.toFloat(), 8f, 8f, borderPaint)

                val qrSize = min(cardWidth - 36, 100)
                val qrBitmap = generateQrBitmap(student.qrToken, qrSize)
                val qrLeft = left + (cardWidth - qrBitmap.width) / 2f
                val qrTop = top + 28f
                canvas.drawBitmap(qrBitmap, qrLeft, qrTop, null)

                val centerX = left + cardWidth / 2f
                val textY = qrTop + qrBitmap.height + 22f
                drawCenteredWrappedText(canvas, student.fullName, centerX, textY, cardWidth - 16, namePaint)
                canvas.drawText("ID: ${student.studentNo}", centerX, bottom - 26f, metaPaint)
                canvas.drawText(student.gradeLevelName.orEmpty(), centerX, bottom - 12f, metaPaint)
            }

            document.finishPage(page)
        }

        return document.toByteArray()
    }

    private fun generateQrBitmap(value: String, size: Int): Bitmap {
        val matrix = QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, size, size)
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bitmap
    }

    private fun drawCenteredWrappedText(
        canvas: Canvas,
        text: String,
        centerX: Float,
        startY: Float,
        maxWidth: Int,
        paint: Paint,
    ) {
        val words = text.split(" ")
        val lines = mutableListOf<String>()
        var current = ""
        for (word in words) {
            val next = if (current.isBlank()) word else "$current $word"
            if (paint.measureText(next) <= maxWidth) {
                current = next
            } else {
                if (current.isNotBlank()) lines += current
                current = word
            }
        }
        if (current.isNotBlank()) lines += current
        lines.take(2).forEachIndexed { index, line ->
            canvas.drawText(line, centerX, startY + (index * 12f), paint)
        }
    }

    private fun timestampLabel(): String =
        LocalDateTime.now().format(DateTimeFormatter.ofPattern("M/d/yyyy, h:mm:ss a"))

    private fun PdfDocument.toByteArray(): ByteArray {
        val output = java.io.ByteArrayOutputStream()
        writeTo(output)
        close()
        return output.toByteArray()
    }
}

private class ByteArrayPrintDocumentAdapter(
    private val documentName: String,
    private val pdfBytes: ByteArray,
) : PrintDocumentAdapter() {
    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes,
        cancellationSignal: CancellationSignal,
        callback: LayoutResultCallback,
        extras: Bundle?,
    ) {
        if (cancellationSignal.isCanceled) {
            callback.onLayoutCancelled()
            return
        }
        callback.onLayoutFinished(
            PrintDocumentInfo.Builder(documentName)
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN)
                .build(),
            true,
        )
    }

    override fun onWrite(
        pages: Array<out PageRange>,
        destination: ParcelFileDescriptor,
        cancellationSignal: CancellationSignal,
        callback: WriteResultCallback,
    ) {
        if (cancellationSignal.isCanceled) {
            callback.onWriteCancelled()
            return
        }
        FileOutputStream(destination.fileDescriptor).use { output ->
            output.write(pdfBytes)
            output.flush()
        }
        callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
    }
}
