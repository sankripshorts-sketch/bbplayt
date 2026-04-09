package mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank

import mobi.blackbears.bbplay.common.extensions.castToInt
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.SortState

data class RankCsGo(
    val title: String,
    val rank: Long,
    val playerName: String,
    val kills: String,
    val deaths: String,
    val assists: String,
    val points: String
) : RankInfo(title, playerName) {
    override fun getSortOptionsArray(): Array<Int> =
        arrayOf(
            SortState.KILLS.strResource,
            SortState.DEATHS.strResource,
            SortState.ASSISTS.strResource,
            SortState.POINT.strResource
        )

    @Suppress("UNCHECKED_CAST")
    override fun getComparator(value: Int): Comparator<RankInfo> =
        comparators[value] as Comparator<RankInfo>

    override fun getValueByPickerPosition(value: Int): String = values[value].invoke(this)

    companion object {
        private val comparators = mutableListOf<Comparator<RankCsGo>>()
        private val values = mutableListOf<Function1<RankInfo, String>>()

        init {
            with(comparators) {
                add(Comparator { o1, o2 -> o2.kills.castToInt().compareTo(o1.kills.castToInt()) })
                add(Comparator { o1, o2 -> o2.deaths.castToInt().compareTo(o1.deaths.castToInt()) })
                add(Comparator { o1, o2 -> o2.assists.castToInt().compareTo(o1.assists.castToInt()) })
                add(Comparator { o1, o2 -> o2.points.castToInt().compareTo(o1.points.castToInt()) })
            }

            with(values) {
                add(object : Function1<RankInfo, String> {
                    override fun invoke(rank: RankInfo): String = (rank as RankCsGo).kills
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(rank: RankInfo): String = (rank as RankCsGo).deaths
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(rank: RankInfo): String = (rank as RankCsGo).assists
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(rank: RankInfo): String = (rank as RankCsGo).points
                })
            }
        }
    }
}