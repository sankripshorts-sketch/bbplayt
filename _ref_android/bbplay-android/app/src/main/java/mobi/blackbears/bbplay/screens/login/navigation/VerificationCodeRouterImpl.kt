package mobi.blackbears.bbplay.screens.login.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.login.fragments.verification.VerificationCodeFragmentDirections
import javax.inject.Inject

class VerificationCodeRouterImpl @Inject constructor() : VerificationCodeRouter {
    override fun navigateToWrongCodeDialogFragment(): NavCommand =
        VerificationCodeFragmentDirections.actionVerificationToWrongCodeBottomFragment()
            .toNavCommand()

    override fun navigateToProfileFragment(): NavCommand =
        VerificationCodeFragmentDirections.actionVerificationToProfileFragment()
            .toNavCommand()
}