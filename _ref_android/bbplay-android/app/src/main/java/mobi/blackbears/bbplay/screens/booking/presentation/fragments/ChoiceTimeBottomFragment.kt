package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.os.Bundle
import android.view.View
import android.widget.NumberPicker
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.flow.combine
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentChoiceTimeBinding
import mobi.blackbears.bbplay.screens.booking.domain.model.price_picker.PricePicker
import java.time.LocalTime

class ChoiceTimeBottomFragment :
    BindingBottomFragment<BottomFragmentChoiceTimeBinding>(BottomFragmentChoiceTimeBinding::inflate) {

    private val viewModel: BookingViewModel by viewModels({ parentFragmentManager.fragments[0] })

    private val timeFormatter = object : NumberPicker.Formatter {
        private var times: List<LocalTime>? = null

        override fun format(value: Int): String {
            if (times == null) return value.toString()
            return times!![value].toString()
        }

        fun setList(times: List<LocalTime>) {
            this.times = times
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setSaveClick()
        setTimePickerValues()
        setPricePickerValues()
    }

    private fun setSaveClick() {
        with(binding) {
            btnSaveTimeAndPrice.setBlockingClickListener {
                viewModel.onSaveTimeAndPriceClick(timePicker.value, pricePicker.value)
                findNavController().navigateUp()
            }
        }
    }

    private fun setTimePickerValues() {
        with(binding.timePicker) {
            setFormatter(timeFormatter)
            fixUiBugOfNumberPicker()
            viewModel.timePickerFlow.observe(viewLifecycleOwner) {
                if (it.isEmpty()) return@observe
                timeFormatter.setList(it)
                minValue = 0
                maxValue = it.size - 1
            }
            viewModel.timePickerValue.observe(viewLifecycleOwner) { value = it }
            setOnValueChangedListener { _, _, newVal ->
              viewModel.onTimePickerChanged(newVal)
            }
        }
    }

    private fun setPricePickerValues() {
        with(binding.pricePicker) {
            fixUiBugOfNumberPicker()
            viewModel.pricesPickerFlow
                .combine(viewModel.pricePickerValue) { prices, value -> prices to value }
                .observe(viewLifecycleOwner) { (prices, priceValue) ->
                if (prices.isEmpty()) return@observe
                minValue = 0
                displayedValues = null
                maxValue = prices.size - 1
                displayedValues = prices.map(::mapToString).toTypedArray()
                value = priceValue
            }
        }
    }

    private fun mapToString(pricePicker: PricePicker): String {
        val hours = pricePicker.timeToBooking.hour
        val minutes = pricePicker.timeToBooking.minute
        val formatHours =
            if (hours != 0)
                requireContext().getQuantityStringOrDefault(R.plurals.hours_plurals, hours, hours)
            else
                emptyString()
        val formatMinutes =
            if (minutes != 0) getString(R.string.minutes_text, minutes) else emptyString()
        return getString(
            R.string.price_format_in_booking_time_fragment,
            formatHours,
            formatMinutes,
            getString(pricePicker.name)
        )
    }
}