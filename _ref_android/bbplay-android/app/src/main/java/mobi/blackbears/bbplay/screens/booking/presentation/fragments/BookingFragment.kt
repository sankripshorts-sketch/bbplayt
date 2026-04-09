package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import android.content.Context
import android.os.Bundle
import android.text.Spannable
import android.text.style.AbsoluteSizeSpan
import android.text.style.ForegroundColorSpan
import android.text.style.SuperscriptSpan
import android.util.TypedValue
import android.view.View
import android.widget.*
import androidx.core.text.toSpannable
import androidx.core.view.isVisible
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.onStart
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.common.navigation.safeNavigate
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.FragmentBookingBinding
import mobi.blackbears.bbplay.screens.booking.di.DaggerBookingComponent
import mobi.blackbears.bbplay.screens.booking.presentation.state.AreaState
import mobi.blackbears.bbplay.screens.booking.presentation.state.ButtonBookingState
import mobi.blackbears.bbplay.screens.booking.presentation.state.ChoiceTimeAndPriceState
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale
import javax.inject.Inject

class BookingFragment : BindingFragment<FragmentBookingBinding>(FragmentBookingBinding::inflate) {

    @Inject
    lateinit var factory: ViewModelFactory

    private val viewModel by viewModels<BookingViewModel> { factory }

    override fun onAttach(context: Context) {
        super.onAttach(context)
        DaggerBookingComponent.factory().create(context.appComponent).inject(this)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        observeLogInMessage()
        initLoader()
        observeScreenState()
        initNavigate()
        setErrorFlow()
        setToastFlow()
        initClickListeners()
    }

    private fun observeLogInMessage() {
        viewModel.messageFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), getString(it), Toast.LENGTH_SHORT).show()
        }
    }

    private fun initLoader() {
        viewModel.isLoaderVisible.observe(viewLifecycleOwner) {
            binding.progressBar.root.isVisible = it
        }
    }

    private fun observeScreenState() {
        viewModel.screenState
            /*Делаем задержку, т.к. после возвращения на этот экран, допустим, с экрана payment,
            * у нас данные приходят раньше, чем в textView сохраняются compound drawables.
            * Из-за этого у нас цвет картинок при заполненных данных окрашиваются по default(серый)
            */
            .onStart { delay(50) }
            .observe(viewLifecycleOwner) {
            setAddress(it.addressText)
            setDate(it.date)
            setTimeAndPrice(it.choiceTimeAndPriceState)
            setAreaState(it.areaState)
            setEnabledBooking(it.bookingButtonState, it.isUserBookingsVisible)
            setUserBookingsVisible(it.isUserBookingsVisible)
        }
    }

    private fun setAddress(address: String) {
        if (address.isEmpty()) return
        changeColorAndTextSize(binding.tvChoiceAddress)
        binding.tvChoiceAddress.text = getString(
            R.string.text_in_two_lines,
            getString(R.string.choice_club_text),
            address
        ).toSpannableChoiceItem()
    }

    private fun setDate(date: LocalDate) {
        if (date == LocalDate.MIN) return
        changeColorAndTextSize(binding.tvChoiceDate)
        binding.tvChoiceDate.text = getString(
            R.string.text_in_two_lines,
            getString(R.string.choice_date_text),
            getString(
                R.string.date_text_in_booking_format,
                date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()),
                date.dayOfMonth,
                date.month.getDisplayName(TextStyle.FULL, Locale.getDefault())
            )
        ).toSpannableChoiceItem()
    }

    private fun setTimeAndPrice(timeAndPrice: ChoiceTimeAndPriceState) {
        binding.tvChoiceTime.isEnabled = timeAndPrice.isEnabled
        val price = timeAndPrice.price
        if (price == null) {
            changeColorAndTextSize(binding.tvChoiceTime, timeAndPrice.colorRes, timeAndPrice.textSize)
            binding.tvChoiceTime.text = getString(R.string.choice_time_text)
            return
        }
        changeColorAndTextSize(binding.tvChoiceTime, timeAndPrice.colorRes, timeAndPrice.textSize)
        val hours = price.timeToBooking.hour
        val minutes = price.timeToBooking.minute
        val formatHours =
            if (hours != 0)
                requireContext().getQuantityStringOrDefault(R.plurals.hours_plurals, hours, hours)
            else
                emptyString()
        val formatMinutes =
            if (minutes != 0) getString(R.string.minutes_text, minutes) else emptyString()

        binding.tvChoiceTime.text = getString(
            R.string.text_in_two_lines,
            getString(R.string.choice_time_text),
            getString(
                R.string.time_and_price_format,
                timeAndPrice.time.toString(),
                formatHours,
                formatMinutes
            )
        ).toSpannableChoiceItem()
    }

    private fun changeColorAndTextSize(
        view: TextView,
        colorRes: Int = R.color.white,
        textSize: Float = 15f
    ) {
        val color = resources.getColor(colorRes, requireContext().theme)
        with(view) {
            compoundDrawables.forEach { it?.setTint(color) }
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, textSize)
        }
    }

    private fun String.toSpannableChoiceItem(): Spannable =
        this.toSpannable().apply {
            val color = resources.getColor(R.color.green, requireContext().theme)
            setSpan(ForegroundColorSpan(color),
                0,
                this.indexOf("\n"),
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }

    private fun setAreaState(areaState: AreaState) {
        with(binding.headerAreas) {
            viewAreas.isEnabled = areaState.isEnabled
            viewAreas.alpha = areaState.alpha
            areasDescriptionState.alpha = areaState.alpha
            viewAreas.setZones(areaState.areas)
        }
    }

    private fun setEnabledBooking(buttonState: ButtonBookingState, isUserBookings: Boolean) {
        with(binding.btnBooking) {
            isEnabled = buttonState.isBookingEnabled
            text = if (buttonState.pcNumber == null)
                getString(R.string.to_book_text)
            else
                getString(
                    R.string.booking_button_format,
                    buttonState.pcNumber,
                    buttonState.timeBooking.toString(),
                    buttonState.cost
                ).toSpannableBooking(isUserBookings)
        }
    }

    private fun String.toSpannableBooking(isUserBookings: Boolean): Spannable =
        this.toSpannable().apply {
            val color = resources.getColor(R.color.green_dark_booking, requireContext().theme)
            val endIndex = this.indexOf("\n")
            setSpan(
                ForegroundColorSpan(color),
                0,
                endIndex,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
            setSpan(
                AbsoluteSizeSpan(16, true),
                0,
                endIndex,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )
            /*сдвигает часть текста вверх, с полем android:lineSpacingMultiplier="0.6" в кнопке
             *позволяет выравнить по вертикали текст в две линии
            */
            setSpan(
                SuperscriptSpan(),
                0,
                endIndex,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
            )

            if (isUserBookings) {
                setSpan(
                    AbsoluteSizeSpan(14, true),
                    0,
                    endIndex,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
                setSpan(
                    AbsoluteSizeSpan(14, true),
                    endIndex,
                    length,
                    Spannable.SPAN_EXCLUSIVE_EXCLUSIVE
                )
            }
        }

    private fun setUserBookingsVisible(isVisible: Boolean) {
        binding.btnUserBookings.isVisible = isVisible
    }

    private fun initNavigate() {
        binding.btnAllPrices.setBlockingClickListener {
            viewModel.navigateToPriceInfo()
        }
        binding.tvChoiceAddress.setBlockingClickListener {
            viewModel.navigateChoiceAddress()
        }
        binding.tvChoiceDate.setBlockingClickListener {
            viewModel.navigateToChoiceDate()
        }
        binding.tvChoiceTime.setBlockingClickListener {
            viewModel.navigateToChoiceTimeAndPackage()
        }
        binding.btnUserBookings.setBlockingClickListener {
            viewModel.navigateToUserBookings()
        }
        viewModel.navCommand.observe(viewLifecycleOwner, observer = findNavController()::safeNavigate)
    }

    private fun setErrorFlow() {
        viewModel.errorFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), it.responseMessage, Toast.LENGTH_SHORT).show()
        }
    }

    private fun setToastFlow() {
        viewModel.toastFlow.observe(viewLifecycleOwner) {
            Toast.makeText(requireContext(), resources.getText(it), Toast.LENGTH_SHORT).show()
        }
    }

    private fun initClickListeners() {
        binding.headerAreas.viewAreas.addOnClickListener(viewModel::onPcSelected)
        binding.btnBooking.setBlockingClickListener {
            viewModel.onBookingClick()
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadUserPhoneAndBalance()
    }
}