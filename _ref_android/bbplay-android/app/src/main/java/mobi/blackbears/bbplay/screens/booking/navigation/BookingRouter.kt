package mobi.blackbears.bbplay.screens.booking.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand


interface BookingRouter {

    fun navigateToPriceInfo(): NavCommand

    fun navigateChoiceAddress(): NavCommand

    fun navigateToChoiceDate(): NavCommand

    fun navigateToChoiceTimeAndPackage(): NavCommand

    fun navigateToSuccessBooking(): NavCommand

    fun navigateToUserBookings(): NavCommand

    fun navigateToPayFragment(userPhone: String): NavCommand
}