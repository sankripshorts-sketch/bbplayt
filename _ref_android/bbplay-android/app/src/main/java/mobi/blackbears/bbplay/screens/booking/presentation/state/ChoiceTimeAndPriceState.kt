package mobi.blackbears.bbplay.screens.booking.presentation.state

import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.screens.booking.domain.model.price_picker.PricePicker
import java.time.LocalTime

private const val DEFAULT_TEXT_SIZE = 20f

data class ChoiceTimeAndPriceState(
    val time: LocalTime = LocalTime.MIN,
    val price: PricePicker? = null,
    val textSize: Float = DEFAULT_TEXT_SIZE,
    val colorRes: Int = R.color.grey_light,
    val isEnabled: Boolean = false
) {
    companion object {
        const val SELECTED_TEXT_SIZE = 15f
    }
}