package mobi.blackbears.bbplay.screens.leaderboard.data.network

import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo

interface LeaderBoardRepository {
    suspend fun getGame(gameState: GamesStates): GameInfo

    suspend fun getLeaderGame(gameState: GamesStates): List<RankInfo>
}