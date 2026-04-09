package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.screens.booking.domain.model.price_picker.PricePicker
import java.time.LocalTime

interface PricePickerUseCase {
    fun getPricesByTime(time: LocalTime): List<PricePicker>
}