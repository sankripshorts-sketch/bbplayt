package mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.databinding.ItemUserBookingBinding
import java.time.LocalTime
import java.time.format.TextStyle
import java.util.Locale

class UserBookingViewHolder private constructor(
    private val binding: ItemUserBookingBinding
) : RecyclerView.ViewHolder(binding.root) {

    constructor(parent: ViewGroup) : this(
        ItemUserBookingBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    fun bind(item: UserBookingItem) {
        setDateBooking(item)
        setPlacePc(item.pc)
        setTimeOfBooking(item.bookingTime)
        setAddress(item.address)
    }

    private fun setDateBooking(item: UserBookingItem) {
        val date = item.dateBooking
        val resources = binding.root.resources
        with(binding) {
            tvUserDateBooking.setTextColor(resources.getColor(item.colorTextRes, root.context.theme))
            tvUserDateBooking.text = root.resources.getString(
                R.string.user_booking_date_format,
                date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                date.dayOfMonth,
                date.month.getDisplayName(TextStyle.FULL, Locale.getDefault()),
                date.parseToTimeString()
            )
        }
    }

    private fun setPlacePc(pcName: String) {
        binding.tvUserPcSelected.text = binding.root.resources.getString(
            R.string.user_booking_pc_name_format,
            pcName.removeAllNotDigitChars()
        )
    }

    private fun setTimeOfBooking(time: LocalTime) {
        val context = binding.root.context
        val resources = context.resources

        val hours = time.hour
        val minutes = time.minute
        val formatHours =
            if (hours != 0)
                context.getQuantityStringOrDefault(R.plurals.hours_plurals, hours, hours)
            else
                emptyString()
        val formatMinutes =
            if (minutes != 0) resources.getString(R.string.minutes_text, minutes) else emptyString()

        binding.tvTimeUserBooking.text = binding.root.resources.getString(
            R.string.text_format_with_two_params, formatHours, formatMinutes
        )
    }

    private fun setAddress(address: String) {
        binding.tvLocationUserBooking.text = address
    }
}