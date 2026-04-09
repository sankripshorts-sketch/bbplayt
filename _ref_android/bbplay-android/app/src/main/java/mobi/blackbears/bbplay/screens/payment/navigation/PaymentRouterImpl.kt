package mobi.blackbears.bbplay.screens.payment.navigation

import mobi.blackbears.bbplay.common.navigation.*
import mobi.blackbears.bbplay.screens.payment.fragment.PayFragmentDirections
import javax.inject.Inject

class PaymentRouterImpl @Inject constructor() : PaymentRouter {
    override fun navigateToProcessPaymentBottomFragment(): NavCommand  =
        PayFragmentDirections.actionPayFragmentToProcessPaymentBottomFragment().toNavCommand()

    override fun navigateToProfileFragment(): NavCommand =
        PayFragmentDirections.actionPayFragmentToProfileFragment().toNavCommand()
}