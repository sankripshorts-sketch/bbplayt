package mobi.blackbears.bbplay.screens.events.fragments.event.model

import androidx.annotation.*
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import java.time.LocalDateTime

sealed class EventItem : Item() {

    data class HeaderEvent(
        @StringRes
        val textRes: Int,
        @ColorRes
        val textColorRes: Int
    ) : EventItem()

    object NowEmptyEvent : EventItem()

    data class Event(
        val eventId: String,
        val name: String,
        @DrawableRes
        val imageRes: Int,
        val startDate: LocalDateTime,
        val endDate: LocalDateTime,
        @ColorRes
        val textColorRes: Int,
        val isActive: Boolean,
        val isParticipant: Boolean
    ) : EventItem()

    data class CompletedEvent(
        val eventId: String,
        val name: String,
        @DrawableRes
        val imageRes: Int,
        val startDate: LocalDateTime,
        val endDate: LocalDateTime,
        val alpha: Float,
        @ColorRes
        val textColorRes: Int
    ) : EventItem()
}