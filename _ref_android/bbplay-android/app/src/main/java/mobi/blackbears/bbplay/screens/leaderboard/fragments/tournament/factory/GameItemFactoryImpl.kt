package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.factory

import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model.GameItem
import javax.inject.Inject

class GameItemFactoryImpl @Inject constructor(): GameItemFactory {
    private val imagesMap = hashMapOf<String, Int>()

    init {
        imagesMap[GamesStates.DOTA.gameName] = GamesStates.DOTA.imageItem
        imagesMap[GamesStates.LOL.gameName] = GamesStates.LOL.imageItem
        imagesMap[GamesStates.CSGO.gameName] = GamesStates.CSGO.imageItem
        imagesMap[GamesStates.VALORANT.gameName] = GamesStates.VALORANT.imageItem
        imagesMap[GamesStates.FORTNITE.gameName] = GamesStates.FORTNITE.imageItem
    }

    override fun createGameItem(
        gameInfo: GameInfo,
        listener: (String) -> Unit
    ): GameItem = gameInfo.run {
        GameItem(
            imagesMap[this.titleGame] ?: R.drawable.bg_splash_screen,
            this,
            listener
        )
    }
}