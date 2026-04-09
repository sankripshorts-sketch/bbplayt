package mobi.blackbears.bbplay.screens.booking.navigation

import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.booking.presentation.fragments.BookingFragmentDirections
import javax.inject.Inject

class BookingRouterImpl @Inject constructor() : BookingRouter{
    override fun navigateToPriceInfo(): NavCommand =
       BookingFragmentDirections.actionBookingFragmentToPriceInfoBottomFragment2().toNavCommand()


    override fun navigateChoiceAddress(): NavCommand =
        BookingFragmentDirections.actionBookingFragmentToChoiceAddressBottomFragment().toNavCommand()

    override fun navigateToChoiceDate(): NavCommand =
        BookingFragmentDirections.actionBookingItemToChoiceDateBottomFragment().toNavCommand()

    override fun navigateToChoiceTimeAndPackage(): NavCommand =
        BookingFragmentDirections.actionBookingItemToChoiceTimeBottomFragment().toNavCommand()

    override fun navigateToSuccessBooking(): NavCommand =
        BookingFragmentDirections.actionBookingItemToSuccessBookingBottomFragment().toNavCommand()

    override fun navigateToUserBookings(): NavCommand =
        BookingFragmentDirections.actionBookingItemToUserBookingsFragment().toNavCommand()

    override fun navigateToPayFragment(userPhone: String): NavCommand =
        BookingFragmentDirections.actionBookingItemToPayFragment(userPhone, emptyString()).toNavCommand()
}