package mobi.blackbears.bbplay.screens.leaderboard.domain.model

import androidx.annotation.StringRes
import mobi.blackbears.bbplay.R

enum class SortState(@StringRes val strResource: Int) {
    WINS(R.string.win_text),
    LOSSES(R.string.losses_text),
    KILLS(R.string.kills_text),
    DEATHS(R.string.deaths_text),
    ASSISTS(R.string.assists_text),
    KDR(R.string.kdr_text),
    WINS_RATIO(R.string.wins_ratio_text),
    TOP_5(R.string.top_5_text),
    TOP_10(R.string.top_10_text),
    TOP_25(R.string.top_25_text),
    POINT(R.string.points_text)
}