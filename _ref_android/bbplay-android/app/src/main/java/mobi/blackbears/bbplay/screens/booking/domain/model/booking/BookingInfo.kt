package mobi.blackbears.bbplay.screens.booking.domain.model.booking

import java.time.LocalDateTime

data class BookingInfo(
    val memberOfferId: Long,
    val productPcName: String,
    val memberAccount: String,
    val startSession: LocalDateTime,
    val endSession: LocalDateTime,
    val productMinutes: Int
)