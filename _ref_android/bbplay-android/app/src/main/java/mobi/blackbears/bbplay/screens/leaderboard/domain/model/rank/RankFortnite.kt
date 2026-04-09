package mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank

import mobi.blackbears.bbplay.common.extensions.castToInt
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.SortState

data class RankFortnite(
    val title: String,
    val rank: Long,
    val playerName: String,
    val kills: String,
    val wins: String,
    val top5: String,
    val top10: String,
    val top25: String,
    val points: String
) : RankInfo(title, playerName) {
    override fun getSortOptionsArray(): Array<Int> =
        arrayOf(
            SortState.WINS.strResource,
            SortState.KILLS.strResource,
            SortState.TOP_5.strResource,
            SortState.TOP_10.strResource,
            SortState.TOP_25.strResource,
            SortState.POINT.strResource
        )

    @Suppress("UNCHECKED_CAST")
    override fun getComparator(value: Int): Comparator<RankInfo> =
        comparators[value] as Comparator<RankInfo>

    override fun getValueByPickerPosition(value: Int): String = values[value].invoke(this)

    companion object {
        private val comparators = mutableListOf<Comparator<RankFortnite>>()
        private val values = mutableListOf<Function1<RankInfo, String>>()

        init {
            with(comparators) {
                add(Comparator { o1, o2 -> o2.wins.castToInt().compareTo(o1.wins.castToInt()) })
                add(Comparator { o1, o2 -> o2.kills.castToInt().compareTo(o1.kills.castToInt()) })
                add(Comparator { o1, o2 -> o2.top5.castToInt().compareTo(o1.top5.castToInt()) })
                add(Comparator { o1, o2 -> o2.top10.castToInt().compareTo(o1.top10.castToInt()) })
                add(Comparator { o1, o2 -> o2.top25.castToInt().compareTo(o1.top25.castToInt()) })
                add(Comparator { o1, o2 -> o2.points.castToInt().compareTo(o1.points.castToInt()) })
            }

            with(values) {
                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).wins
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).kills
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).top5
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).top10
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).top25
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankFortnite).points
                })
            }
        }
    }
}