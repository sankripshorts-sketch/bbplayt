package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand

interface VerificationCodeRouter {
    fun navigateToWrongCodeDialogFragment(): NavCommand
    fun navigateToProfileFragment(): NavCommand
}