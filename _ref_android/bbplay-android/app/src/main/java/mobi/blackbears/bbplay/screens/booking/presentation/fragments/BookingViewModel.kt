package mobi.blackbears.bbplay.screens.booking.presentation.fragments

import androidx.lifecycle.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.BookingInfo
import mobi.blackbears.bbplay.screens.booking.domain.model.price_picker.PricePicker
import mobi.blackbears.bbplay.screens.booking.domain.usecases.*
import mobi.blackbears.bbplay.screens.booking.navigation.BookingRouter
import mobi.blackbears.bbplay.screens.booking.presentation.adapter.PriceItem
import mobi.blackbears.bbplay.screens.booking.presentation.state.*
import timber.log.Timber
import java.time.*
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

private const val INTERVAL_MINUTES = 30L
private const val BREAK_START_TIME_HOURS = 8
private const val BREAK_START_TIME_MINUTES = 30
private const val BREAK_END_TIME_HOURS = 10
private const val BREAK_END_TIME_MINUTES = 0
private const val ROUNDING_MINUTES = 30L
private const val ADDITIONAL_MINUTES = 30L

class BookingViewModel @Inject constructor(
    private val settingPreferences: PreferenceManager,
    private val pricePickerUseCase: PricePickerUseCase,
    private val createPriceZoneUseCase: CreatePriceZoneUseCase,
    private val getPricesAndPcsUseCase: GetPricesAndLayoutPcUseCase,
    private val getUserPhoneAndBalanceUseCase: GetUserPhoneAndBalanceUseCase,
    private val bookingUseCase: BookingUseCase,
    private val router: BookingRouter
) : ViewModel() {
    private val _screenState = MutableStateFlow(Screen())
    val screenState get() = _screenState.asStateFlow()

    private val _clubsInfo = MutableStateFlow(ClubInfoWithPrices.EMPTY)
    val clubsInfo get() = _clubsInfo.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    private val _toastFlow = createMutableSingleEventFlow<Int>()
    val toastFlow = _toastFlow.asSharedFlow()

    private val _isLoaderVisible = MutableStateFlow(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _messageFlow = createMutableSingleEventFlow<Int>()
    val messageFlow get() = _messageFlow.asSharedFlow()

    //region Flow для дополнительных шторок выбора клуба, даты, времени и просмотр цен
    private val _priceInfo = MutableStateFlow<List<PriceItem>>(listOf())
    val priceInfo get() = _priceInfo.asStateFlow()

    private val _datesPickerFlow = MutableStateFlow<List<LocalDate>>(listOf())
    val datesPickerFlow get() = _datesPickerFlow.asStateFlow()

    private val _timePickerFlow = MutableStateFlow<List<LocalTime>>(listOf())
    val timePickerFlow get() = _timePickerFlow.asStateFlow()

    private val _pricesPickerFlow = MutableStateFlow<List<PricePicker>>(listOf())
    val pricesPickerFlow get() = _pricesPickerFlow.asStateFlow()

    private val _datePickerValue = MutableStateFlow(0)
    val datePickerValue get() = _datePickerValue.asStateFlow()

    private val _timePickerValue = MutableStateFlow(0)
    val timePickerValue get() = _timePickerValue.asStateFlow()

    private val _pricePickerValue = MutableStateFlow(0)
    val pricePickerValue get() = _pricePickerValue.asStateFlow()
    //endregion

    private var userData: UserData = UserData.NONE

    private var allBookings: List<BookingInfo> = listOf()
    private var prices: List<SpecialProductPrice> = listOf()
    private var userBalanceAndPhone = UserPhoneAndBalance.NONE

    private val dateTimePattern =  DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

    init {
        viewModelScope.launch {
            loadUserData()
            loadContent()
        }
        initDatePicker()
        initTimePicker()
    }

    private fun loadUserData() {
        launchOrError(
            action = {
                userData = settingPreferences.getUserData().first()
            },
            error = {
                Timber.e(it)
            }
        )
    }

    private fun initDatePicker() {
        val currentDate = LocalDate.now()
        val listDates = arrayListOf<LocalDate>()
        for (i in 0..89) {
            listDates.add(currentDate.plusDays(i.toLong()))
        }
        _datesPickerFlow.tryEmit(listDates)
    }

    private fun initTimePicker() {
        _timePickerValue.tryEmit(0)
        val times = arrayListOf<LocalTime>()
        val date = datesPickerFlow.value[datePickerValue.value]

        if (date == LocalDate.now()) {
            var currentTime = LocalTime.now().truncatedTo(ChronoUnit.MINUTES)
            currentTime = if (currentTime.minute in 1..29)
                currentTime.plusMinutes(INTERVAL_MINUTES - currentTime.minute)
            else
                currentTime.plusMinutes(60L - currentTime.minute)
            while (currentTime != LocalTime.MIN) {
                if (currentTime.isBreakTime()) {
                    currentTime = currentTime.plusMinutes(INTERVAL_MINUTES)
                    continue
                }
                times.add(currentTime)
                currentTime = currentTime.plusMinutes(INTERVAL_MINUTES)
            }
            _timePickerFlow.tryEmit(times)
            //Инициализируем price picker
            initPricePicker()
            return
        }

        val minTime = LocalTime.MIN
        for (i in 0 until 48) {
            val time = minTime.plusMinutes((INTERVAL_MINUTES * i))
            if (time.isBreakTime()) continue
            times.add(time)
        }
        _timePickerFlow.tryEmit(times)
        //Инициализируем price picker
        initPricePicker()
    }

    private fun LocalTime.isBreakTime(): Boolean {
        val time = hour + minute.toFloat() / 60
        val breakStart = BREAK_START_TIME_HOURS + BREAK_START_TIME_MINUTES.toFloat() / 60
        val endStart = BREAK_END_TIME_HOURS + BREAK_END_TIME_MINUTES.toFloat() / 60
        return time > breakStart && time < endStart
    }

    private fun initPricePicker() {
        val time = timePickerFlow.value.getOrNull(0) ?: return
        val pricesByTime = pricePickerUseCase.getPricesByTime(time)
        _pricesPickerFlow.tryEmit(pricesByTime)
    }

    private fun loadContent() {
        getPricesAndPcsUseCase.getPricesAndClubInfo()
            .onEach {
                _screenState.tryEmit(screenState.value.copy(addressText = it.address))
                _clubsInfo.tryEmit(it)
            }
            .onEach {
                prices = it.prices
                val items = createPriceZoneUseCase.createPriceZone(it.prices).map(::createBookingItem)
                _priceInfo.tryEmit(items)
            }
            .onEach { loadAreasPcs() }
            .onEach { loadUserBookings() }
            .onEach { _isLoaderVisible.tryEmit(false) }
            .onEach { loadUserPhoneAndBalance() }
            .catch {
                if (it is BBError) _errorFlow.tryEmit(it)
                Timber.e(it)
            }
            .launchIn(viewModelScope)
    }

    private fun createBookingItem(priceZone: PriceZone): PriceItem =
        PriceItem(
            resId = getResourceIdByType(priceZone),
            gameZone = priceZone.gameZone,
            bootCamp = priceZone.bootCamp
        )

    private fun getResourceIdByType(it: PriceZone): Int = when (it.typePrice) {
        PricesAndShops.GAME_ZONE_ONE_HOUR -> R.string.one_hour_text
        PricesAndShops.GAME_ZONE_MORNING -> R.string.morning_text
        PricesAndShops.GAME_ZONE_THREE_HOURS -> R.string.three_hours_text
        PricesAndShops.GAME_ZONE_FIVE_HOURS -> R.string.five_hours_text
        PricesAndShops.GAME_ZONE_NIGHT -> R.string.night_text
        else -> -1
    }

    fun loadUserPhoneAndBalance() {
        launchOrError(
            { userBalanceAndPhone =
                getUserPhoneAndBalanceUseCase.getUserPhoneAndBalance(userData.userId) },
            { Timber.e(it) }
        )
    }

    private suspend fun loadAreasPcs() {
        var screen = screenState.value
        val areaState = screen.areaState.copy(areas = getPricesAndPcsUseCase.getAreasWithPcs())
        screen = screen.copy(areaState = areaState)
        _screenState.tryEmit(screen)
    }

    private suspend fun isPcFreeNow(pcSelected: Pc): Boolean {
        val areasWithPcs = getPricesAndPcsUseCase.getAreasWithPcs()
        val updatedPcs = checkAndGetIsDateTimeFreePcs(areasWithPcs.flatMap { it.pcs })
        val isPcSelectedFreeForTime =
            updatedPcs.find { it.pcName == pcSelected.pcName }?.isPcFreeForTime ?: true

        return isPcSelectedFreeForTime
    }

    private suspend fun loadUserBookings() {
        allBookings = bookingUseCase.getAllBookings()
        val isUserBookingsVisible = allBookings.any { it.memberAccount == userData.nickname }
        _screenState.tryEmit(screenState.value.copy(isUserBookingsVisible = isUserBookingsVisible))
    }

    fun navigateToPriceInfo() {
        _navCommand.tryEmit(router.navigateToPriceInfo())
    }

    fun navigateChoiceAddress() {
        _navCommand.tryEmit(router.navigateChoiceAddress())
    }

    fun navigateToChoiceDate() {
        _navCommand.tryEmit(router.navigateToChoiceDate())
    }

    fun navigateToChoiceTimeAndPackage() {
        _navCommand.tryEmit(router.navigateToChoiceTimeAndPackage())
    }

    fun navigateToUserBookings() {
        _navCommand.tryEmit(router.navigateToUserBookings())
    }

    fun onTimePickerChanged(value: Int) {
        val time = timePickerFlow.value[value]
        val pricesByTime = pricePickerUseCase.getPricesByTime(time)
        _pricesPickerFlow.tryEmit(pricesByTime)
    }

    /*
     * Сохраняем выбранную дату и отображаем на экране. Есть несколько моментов.
     * Во первых нам по новой надо инициализировать timepicker и price picker. Нужно это
     * для того, что у нас может быть текущий день у которого время бронирования начинается
     * с текущего времени, а другой день содержит полные сутки.
     *      Далее нужно занулить уже выбранное время и пакет, так как может получиться ситуация,
     * что на экране останется старое время бронирования. Предположим у нас
     * сегодня 30 мая время 12:00. Допустим у нас стояла дата 31 мая в 11:00 пакет утренний,
     * но после изменеения даты на 30 мая, у нас на экране не изменится отображение, т.е. будет
     * 30 мая 11:00 пакет утренний, но ведь мы не можем забронировать на прошедшее время. Поэтому
     * мы сбрасываем уже выбранное время и пакет, присваивая пустой ChoiceTimeAndPriceState().
     * Плюс может получиться ситуация, что он подумает, что спишется утренний пакеет а спишется пакет
     * 3 часа, т.к. мы изменили timepicker и pricepicker.
     */
    fun onSaveDateClick(value: Int) {
        _datePickerValue.tryEmit(value)
        initTimePicker()
        var screen = screenState.value.copy(
            date = datesPickerFlow.value[value],
            choiceTimeAndPriceState = ChoiceTimeAndPriceState(isEnabled = true)
        )
        var updatedAreaState = checkAndGetEnabledArea(screen)
        screen = screen.copy(areaState = updatedAreaState)
        updatedAreaState = modifyAreaStateAreasAndPcs(screen, updatedAreaState.pcSelected)
        val bookingState = checkAndGetBookingState(screen, updatedAreaState)
        _screenState.tryEmit(screen.copy(areaState = updatedAreaState, bookingButtonState = bookingState))
    }

    fun onSaveTimeAndPriceClick(timeValue: Int, priceValue: Int) {
        if (timePickerFlow.value.isEmpty()) return
        _timePickerValue.tryEmit(timeValue)
        _pricePickerValue.tryEmit(priceValue)
        val time = timePickerFlow.value[timeValue]
        val price = pricesPickerFlow.value[priceValue]
        val screen = screenState.value.copy(
            choiceTimeAndPriceState = ChoiceTimeAndPriceState(
                time,
                price,
                ChoiceTimeAndPriceState.SELECTED_TEXT_SIZE,
                R.color.white,
                isEnabled = true
            )
        )
        var areaState = checkAndGetEnabledArea(screen)
        areaState = modifyAreaStateAreasAndPcs(areaState)
        val bookingState = checkAndGetBookingState(screen, areaState)
        _screenState.tryEmit(screen.copy(areaState = areaState, bookingButtonState = bookingState))
    }

    private fun clearScreenState() {
        val screen = screenState.value
        val areaState = modifyAreaStateAreasAndPcs(screen, null)
        _screenState.tryEmit(screen.copy(areaState = areaState))
    }

    /**
     * Обновляем список свободных компьютеров учитывая время брони и все уже забронированные компы.
     * @return AreaState с обновленными свободными компьютерами.
     */
    private fun modifyAreaStateAreasAndPcs(areaState: AreaState): AreaState {
        val updatedAreas = areaState.areas.map { area ->
            val pcs = checkAndGetIsDateTimeFreePcs(area.pcs)
            area.copy(pcs = pcs)
        }
        return areaState.copy(areas = updatedAreas)
    }

    private fun getNextAvailableStartBookingTime(
        endSession: LocalDateTime,
        roundingMinutes: Long = ROUNDING_MINUTES,
        additionalMinutes: Long = ADDITIONAL_MINUTES,
    ): LocalDateTime {
        val roundedEndSession =
            if (endSession.minute % ROUNDING_MINUTES == 0L) {
                endSession
            } else {
                endSession.truncatedTo(ChronoUnit.HOURS)
                    .plusMinutes(
                        ((endSession.minute / roundingMinutes) + 1) * roundingMinutes
                    )
            }

        return roundedEndSession.plusMinutes(additionalMinutes)
    }

    /**
     * Проходимся по компам, проверяем, что по ним нет броней на выбранную дату и время
     * по времени и возращаем список компов, с переменной isPcFreeForTime.
     */
    private fun checkAndGetIsDateTimeFreePcs(pcs: List<Pc>): List<Pc> {
        val selectedDate = datesPickerFlow.value[datePickerValue.value]
        val selectedTime = timePickerFlow.value[timePickerValue.value]
        val bookingTime = pricesPickerFlow.value[pricePickerValue.value].timeToBooking

        val selectedDateTime = LocalDateTime.of(selectedDate, selectedTime)
        val endSelectedDateTime =
            selectedDateTime
                .plusHours(bookingTime.hour.toLong())
                .plusMinutes(bookingTime.minute.toLong())

        return pcs.map { pc ->
            val bookings = allBookings.filter { it.productPcName == pc.pcName }

            pc.statusDisconnectTimeLocal?.let {
                try {
                    val endCurrentSession = LocalDateTime.parse(it, dateTimePattern).withSecond(0).withNano(0)

                    if (selectedDateTime < getNextAvailableStartBookingTime(endCurrentSession)) {
                        return@map pc.copy(isPcFreeForTime = false)
                    }
                } catch (e: Throwable) {
                    Timber.e(e.message)
                }
            }

            if (bookings.isEmpty()) return@map pc.copy(isPcFreeForTime = true)
            val isPcFree =
                !bookings
                    .map { booking ->
                        val roundedNextAvailableStartBookingTime = getNextAvailableStartBookingTime(booking.endSession)
                        if (
                            selectedDateTime >= roundedNextAvailableStartBookingTime
                        ) {
                            true
                        } else {
                            isFreePcForStartAndEndDateTime(
                                selectedDateTime,
                                endSelectedDateTime,
                                booking
                            )
                        }
                    }
                    .contains(false)
            pc.copy(isPcFreeForTime = isPcFree)
        }
    }

    /**
     * Проверяем свободен ли компьютер в выбранное время начала и окончания.
     * Если выбранное время больше или равно даты начала брони И если выбранное время меньше
     * окончания брони ИЛИ у нас бронь в
     * 22:00 на 1 час, а человек выберет в 21:30 нв 1 час то вернется false, то есть компьютер
     * занят.
     */
    private fun isFreePcForStartAndEndDateTime(
        selectedDateTime: LocalDateTime,
        endSelectedDateTime: LocalDateTime,
        booking: BookingInfo
    ): Boolean {
        return selectedDateTime <= booking.startSession && endSelectedDateTime <= booking.startSession
    }

    /**
     * Проверяем, что у нас заполнены все поля, и если да открываем доступ к арене и выбору места,
     * иначе доступ закрыт.
     */
    private fun checkAndGetEnabledArea(screen: Screen): AreaState {
        val isEnabled = screen.addressText.isNotEmpty()
                && screen.date != LocalDate.MIN
                && screen.choiceTimeAndPriceState.price != null
        val alpha = if (isEnabled) 1.0f else 0.4f
        return screen.areaState.copy(isEnabled = isEnabled, alpha = alpha)
    }

    /**
     * Проверяем, что у нас заполнены все поля, и выбран нужный компьютер, и отдаем
     * соответствущий state кнопки Бронировать.
     */
    private fun checkAndGetBookingState(screen: Screen, areaState: AreaState): ButtonBookingState {
        val pcSelected = areaState.pcSelected ?: return ButtonBookingState()
        val pricePicker = screen.choiceTimeAndPriceState.price
        val idProduct = getIdProductByType(pcSelected.pcAreaName, pricePicker) ?: 0
        val timeBooking = pricePicker?.timeToBooking
        val minutes = (timeBooking?.toSecondOfDay() ?: 60) / 60
        val pcNumber = pcSelected.pcName.removeAllNotDigitChars().trim()
        val cost = calculateCostById(idProduct, minutes).trim()

        return screen.bookingButtonState.copy(
            isBookingEnabled = areaState.isEnabled,
            pcNumber = pcNumber,
            timeBooking = timeBooking,
            cost = cost
        )
    }

    private fun getIdProductByType(type: AreaTypeName, pricePicker: PricePicker?): Long? {
        return if (type == AreaTypeName.GAME_ZONE)
            pricePicker?.type?.gameZoneId
        else
            pricePicker?.type?.bootCampId
    }

    private fun calculateCostById(idProduct: Long, minutes: Int): String {
        return if (idProduct == PricesAndShops.GAME_ZONE_ONE_HOUR.priceId
                || idProduct == PricesAndShops.BOOTCAMP_ONE_HOUR.priceId)
            (getCostProduct(idProduct).castToDouble() * (minutes / 60.0)).toString()
        else
            getCostProduct(idProduct).castToDouble().toString()
    }

    private fun getCostProduct(idProduct: Long): String =
        prices.find { it.productId == idProduct }?.productPrice ?: emptyString()

    fun onPcSelected(pc: Pc?) {
        var screen = screenState.value
        screen = screen.copy(areaState = modifyAreaStateAreasAndPcs(screen, pc))
        val bookingState = checkAndGetBookingState(screen, checkAndGetEnabledArea(screen))
        _screenState.tryEmit(screen.copy(bookingButtonState = bookingState))
    }

    /**
     * Обновляем список комнат по выбранному компу, изменяя поле isSelected.
     * @return AreaState с обновленными комнатами с выбранным компом.
     */
    private fun modifyAreaStateAreasAndPcs(screen: Screen, selectedPc: Pc?): AreaState {
        var resultSelectedPc = selectedPc
        val areas = screen.areaState.areas.map { area ->
            val pcs = area.pcs.map pcsMap@ { pc ->
                if (pc.pcName == selectedPc?.pcName && pc.isSelected)  {
                    resultSelectedPc = null
                    return@pcsMap pc.copy(isSelected = false)
                }
                val isSelected = pc == selectedPc
                pc.copy(isSelected = isSelected)
            }
            area.copy(pcs = checkAndGetIsDateTimeFreePcs(pcs))
        }
        return screen.areaState.copy(areas = areas, pcSelected = resultSelectedPc)
    }

    fun onBookingClick() {
        if (userData == UserData.NONE) {
            _messageFlow.tryEmit(R.string.need_log_in)
            return
        }

        val screen = screenState.value
        if (screen.bookingButtonState.cost.castToDouble() > (userBalanceAndPhone.memberBalance)) {
            Timber.w("User doesn't have enough money")
            _navCommand.tryEmit(router.navigateToPayFragment(userBalanceAndPhone.memberPhone))
            return
        }
        val pcSelected = screen.areaState.pcSelected ?: return
        val timeAndPrice = screen.choiceTimeAndPriceState

        val pcName = pcSelected.pcName
        val startDate = screen.date
        val startTime = timeAndPrice.time
        val min = (timeAndPrice.price?.timeToBooking ?: LocalTime.MIN).toSecondOfDay() / 60


        val pcAreaName = pcSelected.pcAreaName
        var idPrice = getIdProductByType(pcAreaName, timeAndPrice.price)
        if (idPrice == PricesAndShops.GAME_ZONE_ONE_HOUR.priceId
            || idPrice == PricesAndShops.BOOTCAMP_ONE_HOUR.priceId) idPrice = null

        launchOrError(
            {
                if (isPcFreeNow(pcSelected)) {
                    bookingUseCase.makeBooking(
                        pcName,
                        userData,
                        startDate.toString(),
                        startTime.toString(),
                        min.toString(),
                        idPrice
                    )
                    _navCommand.tryEmit(router.navigateToSuccessBooking())
                } else {
                    _toastFlow.tryEmit(R.string.pc_is_not_free_now)
                }

                loadUserBookings()
                clearScreenState()
            },
            {
                if (it is BBError) _errorFlow.tryEmit(it)
                Timber.e(it)
            }
        )
    }
}
