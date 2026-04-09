package mobi.blackbears.bbplay.screens.leaderboard.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.domain.model.GamesStates

interface LeaderBoardRouter {
    fun navigateToLeadersFragment(gameState: GamesStates): NavCommand

    fun navigateToDialogFragment(): NavCommand
}