package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand

interface LoginRouter {
    fun navigateToRegistrationFragment(): NavCommand

    fun navigateToPasswordRecoveryBottomFragment(): NavCommand

    fun navigateToPhoneNumberConfirmationFragment(): NavCommand
}