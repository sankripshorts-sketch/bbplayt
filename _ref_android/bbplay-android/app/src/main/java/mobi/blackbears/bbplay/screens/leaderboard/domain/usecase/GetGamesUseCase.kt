package mobi.blackbears.bbplay.screens.leaderboard.domain.usecase

import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import kotlinx.coroutines.flow.Flow
import mobi.blackbears.bbplay.common.domain.model.GamesStates

interface GetGamesUseCase {
    operator fun invoke(): Flow<List<GameInfo>>

    fun getGame(gamesState: GamesStates): Flow<List<RankInfo>>
}