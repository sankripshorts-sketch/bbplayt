package mobi.blackbears.bbplay.screens.clubs.navigation


import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.clubs.presentation.ClubsFragmentDirections

import javax.inject.Inject

class ClubsRouterImpl @Inject constructor() : ClubsRouter {
    override fun navigateToJobReviewDialog(): NavCommand =
        ClubsFragmentDirections.actionClubsItemToJobReviewDialogFragment().toNavCommand()

}