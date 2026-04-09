package mobi.blackbears.bbplay.screens.leaderboard.domain.model.rank

sealed class RankInfo(val titleGame: String, val name: String) {
    abstract fun getSortOptionsArray(): Array<Int>

    abstract fun getComparator(value: Int): Comparator<RankInfo>

    abstract fun getValueByPickerPosition(value: Int): String
}