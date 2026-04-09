package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.factory

import mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank.RankInfo
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model.LeaderItem
import javax.inject.Inject

class SortingFactoryImpl @Inject constructor(): SortingFactory {
    override fun sortingByValuePicker(ranks: List<RankInfo>, value: Int): List<LeaderItem> {
        val rankInfo = ranks.firstOrNull() ?: return emptyList()

        val sortedList = ranks.sortedWith(rankInfo.getComparator(value))
        return sortedList.map {
            createLeaderItem(
                it.name,
                it.getValueByPickerPosition(value),
                it.getSortOptionsArray()[value]
            )
        }
    }

    private fun createLeaderItem(
        playerName: String,
        value: String,
        sortingFieldName: Int
    ): LeaderItem =
        LeaderItem(playerName, value, sortingFieldName)
}