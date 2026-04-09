package mobi.blackbears.bbplay.screens.booking.presentation.state

import mobi.blackbears.bbplay.common.extensions.emptyString
import java.time.LocalDate

data class Screen(
    val addressText: String = emptyString(),
    val date: LocalDate = LocalDate.MIN,
    val choiceTimeAndPriceState: ChoiceTimeAndPriceState = ChoiceTimeAndPriceState(),
    val areaState: AreaState = AreaState(),
    val bookingButtonState: ButtonBookingState = ButtonBookingState(),
    val isUserBookingsVisible: Boolean = false
)