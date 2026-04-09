package mobi.blackbears.bbplay.screens.booking.view.model

import android.content.Context
import android.graphics.*
import androidx.core.graphics.transform
import mobi.blackbears.bbplay.common.extensions.dpToPx
import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.screens.booking.domain.model.Pc

private const val PC_RADIUS = 4f
private val regexNotDigital = "\\D".toRegex()

data class PcCanvas(
    private var statusPc: StatusPc,
    private val typeface: Typeface?,
    private val onPcListener: (PcCanvas) -> Unit,
    val pc: Pc,
    val pcRect: RectF = RectF()
) {
    private val pcPaint = Paint()
    private val textPaint = Paint()
    private var pcText = emptyString()

    init {
        pcPaint.style = Paint.Style.FILL
        textPaint.style = Paint.Style.FILL
        textPaint.typeface = typeface
        textPaint.textAlign = Paint.Align.CENTER
        pcText = pc.pcName.replace(regexNotDigital, "").trim()
    }

    /**
     * Изменяет размер в заданное значение, например в 1.5 раза, чтобы подогнать к экрану телефона
     * по ширине.
     */
    fun resizeAreaForPhoneScreen(sizeInHowMore: Float) {
        pcRect.set(
            pcRect.left / sizeInHowMore,
            pcRect.top / sizeInHowMore,
            pcRect.right / sizeInHowMore,
            pcRect.bottom / sizeInHowMore
        )
    }

    fun updateScroll(dx: Float, dy: Float) {
        with(pcRect) {
            set(left - dx, top - dy, right - dx, bottom - dy)
        }
    }

    fun updateScale(matrix: Matrix) {
        pcRect.transform(matrix)
    }

    fun drawPc(canvas: Canvas, context: Context) {
        pcPaint.style = statusPc.stylePaint
        pcPaint.strokeWidth = 2f.dpToPx(context)
        pcPaint.color = context.getColor(statusPc.resColor)

        canvas.drawRoundRect(
            pcRect,
            PC_RADIUS.dpToPx(context),
            PC_RADIUS.dpToPx(context),
            pcPaint
        )
        drawTextOnPc(canvas, context)
    }

    private fun drawTextOnPc(canvas: Canvas, context: Context) {
        textPaint.textSize = pcRect.width() * 5 / 12
        textPaint.color = context.getColor(statusPc.textColor)
        val fontMetrics = textPaint.fontMetrics
        val offsetY = pcRect.centerY() - (fontMetrics.top + fontMetrics.bottom) / 2
        canvas.drawText(pcText, pcRect.centerX(), offsetY, textPaint)
    }

    fun onTouch(x: Float, y: Float) {
        if (pcRect.contains(x, y)) {
            if (statusPc == StatusPc.BUSY || statusPc == StatusPc.DISABLED) return
            onPcListener.invoke(this)
        }
    }

    companion object {
        const val PC_WIDTH = 42f
        const val PC_HEIGHT = 42f
    }
}
