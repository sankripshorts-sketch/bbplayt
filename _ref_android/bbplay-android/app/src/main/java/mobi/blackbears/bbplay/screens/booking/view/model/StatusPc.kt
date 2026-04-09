package mobi.blackbears.bbplay.screens.booking.view.model

import android.graphics.Paint
import androidx.annotation.ColorRes
import mobi.blackbears.bbplay.R

enum class StatusPc(
    @ColorRes val resColor: Int,
    @ColorRes val textColor: Int,
    val stylePaint: Paint.Style,
) {
    FREE(R.color.pc_color_free, R.color.text_on_pc_color, Paint.Style.FILL),
    BUSY(R.color.pc_color_free, R.color.grey_light, Paint.Style.STROKE),
    DISABLED(R.color.pc_disabled_color, R.color.white, Paint.Style.FILL),
    SELECTED(R.color.pc_selected, R.color.white, Paint.Style.FILL)
}