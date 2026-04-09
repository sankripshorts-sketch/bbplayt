package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.os.Bundle
import android.view.View
import android.widget.NumberPicker
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.fixUiBugOfNumberPicker
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentChoiceDateBinding
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

class ChoiceDateBottomFragment :
    BindingBottomFragment<BottomFragmentChoiceDateBinding>(BottomFragmentChoiceDateBinding::inflate) {

    private val viewModel: BookingViewModel by viewModels({ parentFragmentManager.fragments[0] })

    private val dateFormatter = object : NumberPicker.Formatter {
        private var listDates: List<LocalDate>? = null

        override fun format(value: Int): String {
            if (listDates == null) return value.toString()
            val date = listDates!![value]
            return getString(
                R.string.date_text_in_booking_format,
                date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                date.dayOfMonth,
                date.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
            )
        }

        fun setList(listDates: List<LocalDate>) {
            this.listDates = listDates
        }
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setDatePickerValues()
        setSaveClickListener()
    }

    private fun setDatePickerValues() {
        with(binding.datePicker) {
            wrapSelectorWheel = false
            setFormatter(dateFormatter)
            fixUiBugOfNumberPicker()
            viewModel.datesPickerFlow.observe(viewLifecycleOwner) {
                if (it.isEmpty()) return@observe
                minValue = 0
                maxValue = it.size - 1
                dateFormatter.setList(it)
            }
            viewModel.datePickerValue.observe(viewLifecycleOwner) { value = it }
        }
    }

    private fun setSaveClickListener() {
        binding.btnSaveDate.setBlockingClickListener {
            viewModel.onSaveDateClick(binding.datePicker.value)
            findNavController().navigateUp()
        }
    }
}