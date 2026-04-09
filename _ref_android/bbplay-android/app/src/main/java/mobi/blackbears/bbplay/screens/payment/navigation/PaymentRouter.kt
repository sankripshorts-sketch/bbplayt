package mobi.blackbears.bbplay.screens.payment.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand

interface PaymentRouter {
    fun navigateToProcessPaymentBottomFragment(): NavCommand

    fun navigateToProfileFragment(): NavCommand
}