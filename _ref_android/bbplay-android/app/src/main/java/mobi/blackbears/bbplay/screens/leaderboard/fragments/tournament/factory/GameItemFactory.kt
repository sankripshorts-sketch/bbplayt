package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.factory

import mobi.blackbears.bbplay.screens.leaderboard.domain.model.GameInfo
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model.GameItem

interface GameItemFactory {
    fun createGameItem(gameInfo: GameInfo, listener: (String) -> Unit): GameItem
}