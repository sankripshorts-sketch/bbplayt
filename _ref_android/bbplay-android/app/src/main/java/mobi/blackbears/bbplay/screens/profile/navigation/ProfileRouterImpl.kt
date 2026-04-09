package mobi.blackbears.bbplay.screens.profile.navigation

import mobi.blackbears.bbplay.common.navigation.*
import mobi.blackbears.bbplay.screens.profile.fragments.ConfirmUserEmailFragmentDirections
import mobi.blackbears.bbplay.screens.profile.fragments.ProfileFragmentDirections
import javax.inject.Inject

class ProfileRouterImpl @Inject constructor() : ProfileRouter {
    override fun navigateToSettingsFragment(): NavCommand =
        ProfileFragmentDirections.actionProfileItemToSettingsFragment().toNavCommand()

    override fun navigateToLeaderBoardScreen(): NavCommand =
        ProfileFragmentDirections.actionProfileItemToLeaderboardFragment().toNavCommand()

    override fun navigateToBonusDialog(): NavCommand =
        ProfileFragmentDirections.actionProfileItemToBonusDialogFragment().toNavCommand()

    override fun navigateToPay(userPhone: String): NavCommand =
        ProfileFragmentDirections.actionProfileItemToPayFragment(userPhone, null).toNavCommand()

    override fun navigateFromConfirmUserEmailFragmentToPay(
        userPhone: String,
        userEmail: String
    ): NavCommand =
        ConfirmUserEmailFragmentDirections.actionConfirmUserEmailFragmentToPayFragment(
            userPhone,
            userEmail
        ).toNavCommand()

    override fun navigateToConfirmUserEmailFragment(): NavCommand =
        ProfileFragmentDirections.actionProfileItemToConfirmUserEmailFragment().toNavCommand()
}