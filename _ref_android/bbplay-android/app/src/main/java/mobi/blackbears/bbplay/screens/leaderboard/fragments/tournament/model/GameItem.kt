package mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.model

import androidx.annotation.DrawableRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.GameInfo

data class GameItem(
    @DrawableRes
    val imageItem: Int,
    val gameInfo: GameInfo,
    val listener: (String) -> Unit
) : Item()