package mobi.blackbears.bbplay.screens.leaderboard.domain.model

data class GameInfo(
    val titleGame: String,
    val topRanksName: List<String>
) {
    companion object {
        val EMPTY = GameInfo("", listOf())
    }
}