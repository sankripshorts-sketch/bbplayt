package mobi.blackbears.bbplay.screens.booking.view

import android.app.Activity
import android.content.Context
import android.graphics.*
import android.util.*
import android.view.*
import androidx.annotation.ColorRes
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.contains
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.dpToPx
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import mobi.blackbears.bbplay.screens.booking.view.model.*
import kotlin.math.*

class AreasPcView(context: Context, attributeSet: AttributeSet) : View(context, attributeSet) {
    private val displayMetrics = DisplayMetrics()
    private var areas = mutableListOf<AreaZoneCanvas>()
    private val scrollListener: GestureDetector
    private val scaleDetector: ScaleGestureDetector
    private var isZooming = false
    /*Во сколько раз крайняя точка X больше точки X экрана*/
    private var sizeInHowMore = 1f
    private var scale = 1f
    private val matrixViews = Matrix()
    private var viewListener: ((Pc?) -> Unit)? = null
    /* Внутренний листенер, чтобы отслеживать нажатый компьютер*/
    private val onPcListener: (PcCanvas) -> Unit = { pcCanvas ->
        viewListener?.invoke(pcCanvas.pc)
    }
    private val point = PointF()
    private val scrollRect = RectF()

    init {
        (context as Activity).windowManager.defaultDisplay.getMetrics(displayMetrics)
        scrollListener =
            GestureDetector(context, object : GestureDetector.SimpleOnGestureListener() {
                override fun onScroll(
                    e1: MotionEvent?,
                    e2: MotionEvent,
                    distanceX: Float,
                    distanceY: Float
                ): Boolean {
                    if (isZooming) return false

                    if (!scrollRect.contains(point) && point.x >= scrollRect.left && distanceX < 0) {
                        point.set(point.x + distanceX, point.y)
                        areas.forEach { area -> area.updateScroll(distanceX, 0f) }
                        invalidate()
                    }
                    if (!scrollRect.contains(point) && point.x <= scrollRect.right && distanceX > 0) {
                        point.set(point.x + distanceX, point.y)
                        areas.forEach { area -> area.updateScroll(distanceX, 0f) }
                        invalidate()
                    }
                    if (!scrollRect.contains(point) && point.y <= scrollRect.bottom && distanceY > 0) {
                        point.set(point.x, point.y + distanceY)
                        areas.forEach { area -> area.updateScroll(0f, distanceY) }
                        invalidate()
                    }
                    if (!scrollRect.contains(point) && point.y >= scrollRect.top && distanceY < 0) {
                        point.set(point.x, point.y + distanceY)
                        areas.forEach { area -> area.updateScroll(0f, distanceY) }
                        invalidate()
                        return true
                    }

                    if (!scrollRect.contains(point)) {
                        return false
                    } else {
                        point.set(point.x + distanceX, point.y + distanceY)
                    }

                    areas.forEach { area -> area.updateScroll(distanceX, distanceY) }
                    invalidate()
                    return true
                }

                override fun onSingleTapUp(e: MotionEvent): Boolean {
                    areas.forEach { area -> area.onTouch(e.x, e.y) }
                    return true
                }
            })

        scaleDetector =
            ScaleGestureDetector(context, object : ScaleGestureDetector.OnScaleGestureListener {
                override fun onScale(detector: ScaleGestureDetector): Boolean {
                    scale *= detector.scaleFactor
                    scale = max(1f, min(scale, sizeInHowMore))
                    matrixViews.setScale(detector.scaleFactor, detector.scaleFactor)

                    if (scale > 1f && scale < sizeInHowMore) {
                        areas.forEach { area -> area.updateScale(matrixViews, detector.scaleFactor) }
                        resizeScrollRect()
                        invalidate()
                        return true
                    }
                    return false
                }

                override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
                    isZooming = true
                    return true
                }

                override fun onScaleEnd(detector: ScaleGestureDetector) {
                    isZooming = false
                }
            })
    }

    fun addOnClickListener(listener: (Pc?) -> Unit) {
        viewListener = listener
    }

    /**
     * Положить данные во view, когда они пришли.
     * В зависимости от зоны, создает объект, который будет сам себя рисовать, изменять размеры,
     * когда мы к нему обратимся.
     * Также здесь получаем максимальную точку X и Y у первоначальных размеров.
     * Если зоны уже созданы обновляем данные внутри них, сохраняя предыдущие размеры
     * updateDataInAreas()
     */
    fun setZones(areaPcs: List<AreaZone>) {
        if (areaPcs.isEmpty()) return
        if (areas.isNotEmpty()) {
            updateDataInAreas(areaPcs)
            invalidate()
            return
        }
        areaPcs.forEach {
            when (it.areaName) {
                AreaTypeName.BOOTCAMP_1 -> {
                    val areaZoneCanvas = getAreaZoneCanvas(it, R.color.pink_light_zone, R.color.pink_light_zone)
                    val rectPcs = getRectPc(areaZoneCanvas.rectArea, it.pcs)
                    val pcsCanvas = getPcsCanvas(rectPcs, it.pcs)
                    areas.add(areaZoneCanvas.copy(pcs = pcsCanvas))
                }

                AreaTypeName.GAME_ZONE -> {
                    val areaZoneCanvas = getAreaZoneCanvas(it, R.color.transparent, R.color.green_light_success)
                    val rectPcs = getRectPc(areaZoneCanvas.rectArea, it.pcs)
                    val pcsCanvas = getPcsCanvas(rectPcs, it.pcs)
                    areas.add(areaZoneCanvas.copy(pcs = pcsCanvas))
                }

                AreaTypeName.BOOTCAMP_2 -> {
                    val areaZoneCanvas = getAreaZoneCanvas(it, R.color.pink_light_zone, R.color.pink_light_zone)
                    val rectPcs = getRectPc(areaZoneCanvas.rectArea, it.pcs)
                    val pcsCanvas = getPcsCanvas(rectPcs, it.pcs)
                    areas.add(areaZoneCanvas.copy(pcs = pcsCanvas))
                }
            }
        }
        resizeRoomsAndPcs()
        invalidate()
    }

    /**
     * Обновляет в созданных элементах AreaCanvas и PcCanvas новые значения, пересчитывая статус
     * компьютеров
     * @throws IllegalStateException если пришла арена, названия которой нет в текущем списке.
     * Вообще это ошибка никогда не должна случиться, если арены пришли верно.
     */
    private fun updateDataInAreas(areaPcs: List<AreaZone>) {
        areas = areas
            .map { area ->
                val areaZone = areaPcs.find { it.areaName == area.areaName }
                    ?: throw IllegalStateException("Area name has unknown name")
                val rectsPcs = area.pcs.map { it.pcRect }
                val pcsCanvas = getPcsCanvas(rectsPcs, areaZone.pcs)
                area.copy(pcs = pcsCanvas)
            }
            .toMutableList()
    }

    /**
     * Получить объект содержащий информацию о комнате, и свой размер.
     * @see AreaZoneCanvas
     */
    private fun getAreaZoneCanvas(
        area: AreaZone,
        @ColorRes colorBorderRes: Int,
        @ColorRes colorTextRes: Int
    ): AreaZoneCanvas =
        area.run {
            AreaZoneCanvas(
                areaName = areaName,
                colorBorder = context.getColor(colorBorderRes),
                pcs = listOf(),
                rectArea = getRectByCoordinates(
                    area.areaFrameX.dpToPx(context),
                    area.areaFrameY.dpToPx(context),
                    (area.areaFrameWidth + area.areaFrameX).dpToPx(context),
                    area.areaFrameHeight.dpToPx(context)
                ),
                typefaceText = ResourcesCompat.getFont(context, R.font.din_round_pro_bold),
                colorNameArea = context.getColor(colorTextRes)
            )
        }

    /**
     * Получить список объектов содержащих информацию о компьютерах, их размер и статус.
     * @see PcCanvas
     */
    private fun getPcsCanvas(rectPcs: List<RectF>, pcList: List<Pc>): List<PcCanvas> {
        val result = ArrayList<PcCanvas>()

        for (i in pcList.indices) {
            val pc = pcList[i]
            val rectF = rectPcs[i]
            val pcCanvas = PcCanvas(
                statusPc = getStatusPc(pc),
                typeface = ResourcesCompat.getFont(context, R.font.din_round_pro_bold),
                onPcListener = onPcListener,
                pc = pc,
                pcRect = rectF
            )
            result.add(pcCanvas)
        }
        return result
    }

    private fun getStatusPc(pc: Pc): StatusPc {
        if (pc.isSelected) return StatusPc.SELECTED
        if (pc.pcEnabled && pc.isPcFreeForTime) return StatusPc.FREE
        if (!pc.pcEnabled) return StatusPc.DISABLED
        return StatusPc.BUSY
    }

    /**
     * Получить новый прямоугольник по координатам
     */
    private fun getRectByCoordinates(left: Float, top: Float, right: Float, bottom: Float): RectF =
        RectF().apply { set(left, top, right, bottom) }

    /**
     * Создает прямоугольники компьютеров, в зависимости от нужной комнаты,
     * Также расчитывает сдвиги по оси X и Y, в зависимости от размера комнаты, и количетва
     * компьютеров в зале.
     */
    private fun getRectPc(area: RectF, pcList: List<Pc>): List<RectF> {
        val widthPc = PcCanvas.PC_WIDTH.dpToPx(context)
        val heightPc = PcCanvas.PC_HEIGHT.dpToPx(context)

        val maxPcX = pcList.maxOf { it.pcBoxLeft }.dpToPx(context)
        val maxPcY = pcList.maxOf { it.pcBoxTop }.dpToPx(context)

        val offsetX = (area.width() - (maxPcX + widthPc)) / 2.0f
        val offsetY = (area.height() - (maxPcY + heightPc)) / 2.0f

        return pcList.map {
            val leftPc = area.left + it.pcBoxLeft.dpToPx(context) + offsetX
            val topPc = area.top + it.pcBoxTop.dpToPx(context) + offsetY
            val rightPc = leftPc + widthPc
            val bottomPc = topPc + heightPc
            RectF(leftPc, topPc, rightPc, bottomPc)
        }
    }

    /**
     * Изначально нам приходят большие значения и элементы не влезают во view. Для того, чтобы
     * подогнать элементы под экран, мы смотрим на ширину экрана и крайнюю точку X элементов
     * отрисовки. Находим во сколько раз она больше, и делим наши элементы на это значение,
     * чтобы отмасштабировать по экрану.
     *
     * Для начала мы смотрим сколько занимает текст названия арены (его ширину и высоту, вызывая
     * метод getTextNameBounds()), потом находим насколько мы будем смещать наши комнаты вправо и
     * вниз, т.к. текст будет располагаться посередине и выше комнаты.
     * После этого смещаем наши комнаты на определенное значение.
     *
     * А дальше смотрим сколько будет занимать самая крайняя точка по X
     * areas.maxOf { it.rectArea.right } + offsetX + 10f.dpToPx(context)
     * где
     * areaMaxOf - максимальная точка отрисовки последней комнаты
     * offsetX - сдвиг вправо (середина текста + offsetX) и есть крайная точка отрисовки текста
     * 10f - мы прибавляем чтобы соблюсти отступ, т.к. с бэка отступ от первого зала приходит 10
     *
     * Находим во сколько раз точка X превосходит экран нашего девайса
     * sizeInHowMore = rightX / getWidthScreenPhone().toFloat(), а далее вызываем
     * resizeAreaForPhoneScreen() где уменьшаются размеры комнат их названия и компов внутри них.
     */
    private fun resizeRoomsAndPcs() {
        val areaZoneCanvas = areas.first()
        val textBounds = areaZoneCanvas.getTextNameBounds()
        val offsetX = textBounds.width() / 4
        val offsetY = textBounds.height() * 2

        areas.forEach { areaCanvas ->
            val rectArea = areaCanvas.rectArea
            rectArea.set(
                rectArea.left + offsetX,
                rectArea.top + offsetY,
                rectArea.right + offsetX,
                rectArea.bottom + offsetY
            )
            areaCanvas.pcs.forEach {
                val pcRect = it.pcRect
                pcRect.set(
                    pcRect.left + offsetX,
                    pcRect.top + offsetY,
                    pcRect.right + offsetX,
                    pcRect.bottom + offsetY
                )
            }
        }
        val rightX = areas.maxOf { it.rectArea.right } + offsetX + 10f.dpToPx(context)
        sizeInHowMore = rightX / getWidthScreenPhone().toFloat()
        areas.forEach { areaCanvas -> areaCanvas.resizeAreaForPhoneScreen(sizeInHowMore) }
        resizeScrollRect()
    }

    private fun getWidthScreenPhone(): Int = displayMetrics.widthPixels

    /**
     * Изменяем размер прямоугольника, внутри которого, можно скролить арены.
     * Также назначаем точку посередине экрана.
     * Точка передвигается внутри прямоугольника смотри scrollListener,
     * как только она достигнет краев, скрол прекращается.
     */
    private fun resizeScrollRect() {
        val minLeftArea = areas.minOf { it.rectArea.left }
        val minTopArea = areas.minOf { it.rectArea.top }
        val maxRightArea = areas.maxOf { it.rectArea.right }
        val maxBotArea = areas.maxOf { it.rectArea.bottom }

        val minLeft = if (0f > minLeftArea) minLeftArea else 0f
        val minTop = if (0f > minTopArea) minTopArea else 0f
        val maxRight = if (maxRightArea > this.width) maxRightArea else this.width.toFloat()
        val maxBottom = if (maxBotArea > this.height) maxBotArea else this.height.toFloat()
        scrollRect.set(minLeft, minTop, maxRight, maxBottom)
        point.set(width / 2f, height / 2f)
    }

    override fun onDraw(canvas: Canvas) {
        areas.forEach { area -> area.drawArea(canvas, context) }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!isEnabled) return false
        scaleDetector.onTouchEvent(event)
        scrollListener.onTouchEvent(event)
        if (event.action == MotionEvent.ACTION_DOWN) parent.requestDisallowInterceptTouchEvent(true)
        return true
    }
}