package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.*
import mobi.blackbears.bbplay.screens.login.fragments.login.LoginFragmentDirections
import javax.inject.Inject

class LoginRouterImpl @Inject constructor() : LoginRouter {
    override fun navigateToRegistrationFragment(): NavCommand =
        LoginFragmentDirections.actionLoginFragmentToRegistrationFragment().toNavCommand()

    override fun navigateToPasswordRecoveryBottomFragment(): NavCommand =
        LoginFragmentDirections.actionLoginFragmentToPasswordRecoveryFragment().toNavCommand()

    override fun navigateToPhoneNumberConfirmationFragment(): NavCommand =
        LoginFragmentDirections.actionLoginFragmentToPhoneNumberConfirmationFragment()
            .toNavCommand()
}