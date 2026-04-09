package mobi.blackbears.bbplay.screens.clubs.presentation.adapter

import androidx.annotation.DrawableRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo

data class ClubItem(
    val clubInfo: ClubInfo,
    @DrawableRes
    val drawableClub: Int
) : Item()