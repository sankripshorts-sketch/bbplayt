package mobi.blackbears.bbplay.screens.leaderboard.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.LeadersFragmentDirections
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.TournamentsFragmentDirections
import javax.inject.Inject

class LeaderBoardRouterImpl @Inject constructor() : LeaderBoardRouter {
    override fun navigateToLeadersFragment(gameState: GamesStates): NavCommand {
        val action = TournamentsFragmentDirections.actionTournamentsItemToLeadersFragment()
        action.gameState = gameState
        return action.toNavCommand()
    }


    override fun navigateToDialogFragment(): NavCommand =
        LeadersFragmentDirections.actionLeadersFragmentToStatisticDialogFragment().toNavCommand()
}