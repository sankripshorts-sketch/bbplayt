package mobi.blackbears.bbplay.screens.profile.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand

interface ProfileRouter {
    fun navigateToSettingsFragment(): NavCommand

    fun navigateToLeaderBoardScreen(): NavCommand

    fun navigateToBonusDialog(): NavCommand

    fun navigateToPay(userPhone: String): NavCommand

    fun navigateFromConfirmUserEmailFragmentToPay(userPhone: String, userEmail: String): NavCommand

    fun navigateToConfirmUserEmailFragment(): NavCommand
}