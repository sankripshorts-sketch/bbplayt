package mobi.blackbears.bbplay.screens.leaderboard.domain.usecase

import mobi.blackbears.bbplay.screens.leaderboard.data.network.LeaderBoardRepository
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.domain.model.GamesStates
import java.net.UnknownHostException
import javax.inject.Inject

class GetGamesUseCaseImpl @Inject constructor(private val repository: LeaderBoardRepository) : GetGamesUseCase {
    override fun invoke(): Flow<List<GameInfo>> {

        val gameDota = getFlowGame(GamesStates.DOTA)
        val gameLol = getFlowGame(GamesStates.LOL)
        val gameCs = getFlowGame(GamesStates.CSGO)
        val gameValorant = getFlowGame(GamesStates.VALORANT)
        val gameFortnite = getFlowGame(GamesStates.FORTNITE)

        return gameDota
            .zip(gameLol) { dota, lol -> mutableListOf(dota, lol) }
            .zip(gameCs, ::addGameInList)
            .zip(gameValorant, ::addGameInList)
            .zip(gameFortnite, ::addGameInList)
            .map(::deleteAllEmpty)
    }

    private fun getFlowGame(gameName: GamesStates): Flow<GameInfo> =
        flow { emit(repository.getGame(gameName)) }
            .catch {
                if (it is UnknownHostException) throw BBError.NO_INTERNET
                emit(GameInfo.EMPTY)
            }

    private fun addGameInList(list: MutableList<GameInfo>, gameInfo: GameInfo): MutableList<GameInfo> =
        list.apply { add(gameInfo) }

    private fun deleteAllEmpty(list: MutableList<GameInfo>): List<GameInfo> =
        list.apply { removeAll { gameInfo -> gameInfo == GameInfo.EMPTY } }


    override fun getGame(gamesState: GamesStates): Flow<List<RankInfo>> =
        flow { emit(repository.getLeaderGame(gamesState)) }
}