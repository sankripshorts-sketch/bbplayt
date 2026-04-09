package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.factory

import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model.LeaderItem

interface SortingFactory {
    fun sortingByValuePicker(ranks: List<RankInfo>, value: Int): List<LeaderItem>
}