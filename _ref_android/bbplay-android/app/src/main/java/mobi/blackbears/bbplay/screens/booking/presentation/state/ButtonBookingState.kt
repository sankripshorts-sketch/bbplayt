package mobi.blackbears.bbplay.screens.booking.presentation.state

import java.time.LocalTime

data class ButtonBookingState(
    val isBookingEnabled: Boolean = false,
    val pcNumber: String? = null,
    val timeBooking: LocalTime? = null,
    val cost: String = "0.0"
)