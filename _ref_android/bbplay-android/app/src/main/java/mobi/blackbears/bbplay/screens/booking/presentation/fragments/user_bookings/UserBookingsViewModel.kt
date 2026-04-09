package mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings

import androidx.lifecycle.*
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.BookingInfo
import mobi.blackbears.bbplay.screens.booking.domain.usecases.*
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.user_bookings.adapter.UserBookingItem
import timber.log.Timber
import java.time.LocalTime
import javax.inject.Inject

class UserBookingsViewModel @Inject constructor(
    settingPreferences: PreferenceManager,
    private val getPricesAndPcsUseCase: GetPricesAndLayoutPcUseCase,
    private val bookingUseCase: BookingUseCase
) : ViewModel() {
    private val _userBookings = MutableStateFlow<List<UserBookingItem>>(listOf())
    val userBookings get() = _userBookings.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading get() = _isLoading.asStateFlow()

    init {
        _isLoading.tryEmit(true)
        getPricesAndPcsUseCase.getPricesAndClubInfo()
            .map { it.address }
            .map { it to getPricesAndPcsUseCase.getAreasWithPcs().map(AreaZone::pcs).flatten() }
            .onEach { (address, pcs) ->
                val userData = settingPreferences.getUserData().first()
                val userBookings = bookingUseCase.getBookingsByMemberAccount(userData.nickname)
                createAndEmitUserBookingItems(address, pcs, userBookings)
                _isLoading.tryEmit(false)
            }
            .catch {
                Timber.e(it)
            }
            .launchIn(viewModelScope)
    }

    private fun createAndEmitUserBookingItems(
        address: String,
        pcs: List<Pc>,
        userBookings: List<BookingInfo>
    ) {
        val items = userBookings.map {
            UserBookingItem(
                colorTextRes = getColorZoneByPcName(it.productPcName, pcs),
                dateBooking = it.startSession,
                pc = it.productPcName,
                bookingTime = LocalTime.ofSecondOfDay(it.productMinutes * 60L),
                address = address
            )
        }
        _userBookings.tryEmit(items)
    }

    private fun getColorZoneByPcName(pcName: String, pcs: List<Pc>): Int {
        val pcType = pcs.find { pc -> pc.pcName == pcName }?.pcAreaName ?: AreaTypeName.GAME_ZONE
        return if (pcType == AreaTypeName.GAME_ZONE)
            R.color.green_light_success
        else
            R.color.pink_light_text
    }
}