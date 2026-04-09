package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.login.fragments.confirmnumber.PhoneNumberConfirmationFragmentDirections
import javax.inject.Inject

class PhoneNumberConfirmationRouterImpl @Inject constructor() : PhoneNumberConfirmationRouter {
    override fun navigatePhoneVerificationFragment(): NavCommand =
        PhoneNumberConfirmationFragmentDirections.actionConfirmationToVerificationFragment()
            .toNavCommand()
}