package mobi.blackbears.bbplay.screens.leaderboard.data.mapper

import mobi.blackbears.bbplay.common.data.model.GameResponse
import mobi.blackbears.bbplay.common.data.model.RankedResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import javax.inject.Inject

class GameInfoMapper @Inject constructor(): Mapper<GameResponse<out RankedResponse>, GameInfo> {

    override fun transform(data: GameResponse<out RankedResponse>): GameInfo = data.run {
        GameInfo(
            titleGame = gameCode,
            topRanksName = ranks.map(::transformRankToRankInfo)
        )
    }

    private fun transformRankToRankInfo(data: RankedResponse): String =
        "${data.rank}.${data.playerName}"
}