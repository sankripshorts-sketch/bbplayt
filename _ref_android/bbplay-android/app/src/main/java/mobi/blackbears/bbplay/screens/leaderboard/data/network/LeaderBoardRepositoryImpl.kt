package mobi.blackbears.bbplay.screens.leaderboard.data.network

import mobi.blackbears.bbplay.common.data.model.GameResponse
import mobi.blackbears.bbplay.common.data.model.RankedResponse
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import javax.inject.Inject

class LeaderBoardRepositoryImpl @Inject constructor(
    private val api: LeaderBoardApi,
    private val mapper: Mapper<GameResponse<out RankedResponse>, GameInfo>,
    private val leaderMapper: Mapper<GameResponse<out RankedResponse>, LeadersInfo>
): LeaderBoardRepository {
    override suspend fun getGame(gameState: GamesStates): GameInfo {
        val game = when(gameState) {
            GamesStates.CSGO -> api.getCsGoGame(gameState.urlGame)
            GamesStates.FORTNITE -> api.getFortniteGame(gameState.urlGame)
            else -> api.getDotaLolOrValorantGame(gameState.urlGame)
        }
        return mapper.transform(game)
    }

    override suspend fun getLeaderGame(gameState: GamesStates): List<RankInfo> {
        val game = when(gameState) {
            GamesStates.CSGO -> api.getCsGoGame(gameState.urlGame)
            GamesStates.FORTNITE -> api.getFortniteGame(gameState.urlGame)
            else -> api.getDotaLolOrValorantGame(gameState.urlGame)
        }
        return leaderMapper.transform(game).ranks
    }
}