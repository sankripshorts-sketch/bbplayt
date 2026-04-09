package mobi.blackbears.bbplay.screens.booking.view.model

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import androidx.core.graphics.transform
import mobi.blackbears.bbplay.common.extensions.dpToPx
import mobi.blackbears.bbplay.screens.booking.domain.model.AreaTypeName

private const val RADIUS_AREA = 6f
private const val STROKE_WIDTH_ROOM = 2f
private const val TEXT_SIZE_NAME_AREA = 100f

data class AreaZoneCanvas(
    val areaName: AreaTypeName,
    val pcs: List<PcCanvas>,
    val rectArea: RectF = RectF(),
    private val colorBorder: Int,
    private val typefaceText: Typeface?,
    private val colorNameArea: Int,
    private var textSize: Float = TEXT_SIZE_NAME_AREA
) {
    private var textWidth: Float
    private val paintBorderArea = Paint()
    private val textNameAreaPaint = Paint()
    private val areaNameWithoutDigit = areaName.areaName.split(" ")[0]

    init {
        paintBorderArea.style = Paint.Style.STROKE
        paintBorderArea.color = colorBorder

        textNameAreaPaint.typeface = typefaceText
        textNameAreaPaint.style = Paint.Style.FILL
        textNameAreaPaint.textSize = textSize
        textNameAreaPaint.color = colorNameArea
        textWidth = textNameAreaPaint.measureText(areaNameWithoutDigit)
    }

    /**
     * Возвращает прямоугольник с занимаемым размером текста
     */
    fun getTextNameBounds(): Rect {
        val bounds = Rect()
        textNameAreaPaint.getTextBounds(
            areaNameWithoutDigit,
            0,
            areaNameWithoutDigit.length,
            bounds
        )
        return bounds
    }

    /**
     * Изменяет размер в заданное значение, например в 1.5 раза, чтобы подогнать к экрану телефона
     * по ширине.
     */
    fun resizeAreaForPhoneScreen(sizeInHowMore: Float) {
        rectArea.set(
            rectArea.left / sizeInHowMore,
            rectArea.top / sizeInHowMore,
            rectArea.right / sizeInHowMore,
            rectArea.bottom / sizeInHowMore
        )
        pcs.forEach { it.resizeAreaForPhoneScreen(sizeInHowMore) }
        textSize /= sizeInHowMore
        textNameAreaPaint.textSize = textSize
        textWidth = textNameAreaPaint.measureText(areaNameWithoutDigit)
    }

    /**
     * Обновляет смещение арены, и его компьютеров внутри по дистанции X и Y
     */
    fun updateScroll(dx: Float, dy: Float) {
        with(rectArea) {
            set(left - dx, top - dy, right - dx, bottom - dy)
        }
        pcs.forEach { it.updateScroll(dx, dy) }
    }

    /**
     * Обновляет размер арены, текста арены и его компьютеров внутри по матрице и scaleDetector
     */
    fun updateScale(matrix: Matrix, scaleDetector: Float) {
        rectArea.transform(matrix)
        textSize *= scaleDetector
        textNameAreaPaint.textSize = textSize
        textWidth = textNameAreaPaint.measureText(areaNameWithoutDigit)
        pcs.forEach { it.updateScale(matrix) }
    }

    fun drawArea(canvas: Canvas, context: Context) {
        paintBorderArea.strokeWidth = STROKE_WIDTH_ROOM.dpToPx(context)
        canvas.drawRoundRect(
            rectArea,
            RADIUS_AREA.dpToPx(context),
            RADIUS_AREA.dpToPx(context),
            paintBorderArea
        )
        canvas.drawText(
            areaName.areaName.split(" ")[0],
            rectArea.left + rectArea.width() / 2 - textWidth / 2,
            rectArea.top - 10f.dpToPx(context),
            textNameAreaPaint
        )
        pcs.forEach { it.drawPc(canvas, context) }
    }

    fun onTouch(x: Float, y: Float) {
        if (rectArea.contains(x, y)) {
            pcs.forEach { pc -> pc.onTouch(x, y) }
        }
    }
}
