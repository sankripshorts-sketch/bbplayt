package mobi.blackbears.bbplay.screens.leaderboard.data.mapper

import mobi.blackbears.bbplay.common.data.model.*
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.LeadersInfo
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.*
import javax.inject.Inject

class LeadersInfoMapper @Inject constructor(): Mapper<GameResponse<out RankedResponse>, LeadersInfo> {
    override fun transform(data: GameResponse<out RankedResponse>): LeadersInfo =
        LeadersInfo(ranks = data.ranks.map{ transformToRankInfo(data.gameCode, it) })

    private fun transformToRankInfo(titleGame: String, data: RankedResponse): RankInfo =
        when (data) {
            is CsGoResponse -> toCsInfo(titleGame, data)
            is FortniteResponse -> toFortniteInfo(titleGame, data)
            is DotaLolOrValorantResponse -> toDotaLolOrValorantInfo(titleGame, data)
            else -> throw IllegalArgumentException("Not find response object")
        }

    private fun toCsInfo(titleGame: String, rankResponse: CsGoResponse): RankInfo = rankResponse.run {
        RankCsGo(
            title = titleGame,
            rank = rank,
            playerName = playerName,
            kills = kills,
            deaths = deaths,
            assists = assists,
            points = points
        )
    }

    private fun toFortniteInfo(titleGame: String, rankResponse: FortniteResponse): RankInfo = rankResponse.run {
        RankFortnite(
            title = titleGame,
            rank = rank,
            playerName = playerName,
            kills = kills,
            wins = wins,
            top5 = top5,
            top10 = top10,
            top25 = top25,
            points = points
        )
    }

    private fun toDotaLolOrValorantInfo(titleGame: String, rankResponse: DotaLolOrValorantResponse): RankInfo =
        rankResponse.run {
            RankDotaLolOrValorant(
                title = titleGame,
                rank = rank,
                playerName = playerName,
                kills = kills,
                deaths = deaths,
                wins = wins,
                losses = losses,
                kdr = kdr,
                assists = assists,
                winRatio = winRatio,
                points = points
            )
        }
}