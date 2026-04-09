package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.login.fragments.registration.RegistrationFragmentDirections
import javax.inject.Inject

class RegistrationRouterImpl @Inject constructor() : RegistrationRouter {
    override fun navigateToVerificationCodeFragment(): NavCommand =
        RegistrationFragmentDirections.actionRegistrationItemToVerificationCodeFragment()
            .toNavCommand()
}