package mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.adapter

import androidx.annotation.ColorRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import java.time.LocalDateTime
import java.time.LocalTime

data class UserBookingItem(
    @ColorRes
    val colorTextRes: Int,
    val dateBooking: LocalDateTime,
    val pc: String,
    val bookingTime: LocalTime,
    val address: String
) : Item()