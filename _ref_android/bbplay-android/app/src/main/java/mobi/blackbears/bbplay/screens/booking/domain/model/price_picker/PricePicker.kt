package mobi.blackbears.bbplay.screens.booking.domain.model.price_picker

import java.time.LocalTime

data class PricePicker(
    val timeToBooking: LocalTime,
    val name: Int,
    val type: PricePickerType
)