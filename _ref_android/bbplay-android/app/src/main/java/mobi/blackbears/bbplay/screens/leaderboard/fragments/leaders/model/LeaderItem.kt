package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.model

import androidx.annotation.StringRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item

data class LeaderItem(
    val playerName: String,
    val value: String,
    @StringRes val sortNameResource: Int
) : Item()
