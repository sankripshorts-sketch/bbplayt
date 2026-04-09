package mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.adapter

import android.view.ViewGroup
import mobi.blackbears.bbplay.common.fragment.adapter.GeneralListAdapter

class UserBookingAdapter : GeneralListAdapter<UserBookingItem, UserBookingViewHolder>() {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserBookingViewHolder =
        UserBookingViewHolder(parent)

    override fun onBindViewHolder(holder: UserBookingViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}