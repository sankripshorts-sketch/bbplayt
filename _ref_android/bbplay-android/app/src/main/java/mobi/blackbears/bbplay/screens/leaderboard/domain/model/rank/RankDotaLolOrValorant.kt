package mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank

import mobi.blackbears.bbplay.common.extensions.castToDouble
import mobi.blackbears.bbplay.common.extensions.castToInt
import mobi.blackbears.bbplay.common.extensions.roundToTwoCharacters
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.SortState

data class RankDotaLolOrValorant(
    val title: String,
    val rank: Long,
    val playerName: String,
    val kills: String,
    val deaths: String,
    val wins: String,
    val losses: String,
    val kdr: String,
    val assists: String,
    val winRatio: String,
    val points: String
) : RankInfo(title, playerName) {
    override fun getSortOptionsArray(): Array<Int> =
        arrayOf(
            SortState.WINS.strResource,
            SortState.LOSSES.strResource,
            SortState.KILLS.strResource,
            SortState.DEATHS.strResource,
            SortState.ASSISTS.strResource,
            SortState.KDR.strResource,
            SortState.WINS_RATIO.strResource,
            SortState.POINT.strResource
        )

    @Suppress("UNCHECKED_CAST")
    override fun getComparator(value: Int): Comparator<RankInfo> =
        comparators[value] as Comparator<RankInfo>

    override fun getValueByPickerPosition(value: Int): String = values[value].invoke(this)

    companion object {
        private val comparators = mutableListOf<Comparator<RankDotaLolOrValorant>>()
        private val values = mutableListOf<Function1<RankDotaLolOrValorant, String>>()

        init {
            with(comparators) {
                add(Comparator { o1, o2 -> o2.wins.castToInt().compareTo(o1.wins.castToInt()) })
                add(Comparator { o1, o2 -> o2.losses.castToInt().compareTo(o1.losses.castToInt()) })
                add(Comparator { o1, o2 -> o2.kills.castToInt().compareTo(o1.kills.castToInt()) })
                add(Comparator { o1, o2 -> o2.deaths.castToInt().compareTo(o1.deaths.castToInt()) })
                add(Comparator { o1, o2 -> o2.assists.castToInt().compareTo(o1.assists.castToInt()) })
                add(Comparator { o1, o2 -> o2.kdr.castToInt().compareTo(o1.kdr.castToInt()) })
                add(Comparator { o1, o2 -> o2.winRatio.castToDouble().compareTo(o1.winRatio.castToDouble()) })
                add(Comparator { o1, o2 -> o2.points.castToInt().compareTo(o1.points.castToInt()) })
            }

            with(values) {
                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).wins
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).losses
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).kills
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).deaths
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).assists
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).kdr
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String =
                        (p1 as RankDotaLolOrValorant).winRatio.castToDouble().roundToTwoCharacters().toString()
                })

                add(object : Function1<RankInfo, String> {
                    override fun invoke(p1: RankInfo): String = (p1 as RankDotaLolOrValorant).points
                })
            }
        }
    }
}