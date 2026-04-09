package mobi.blackbears.bbplay.screens.booking.presentation.adapter

import androidx.annotation.StringRes
import mobi.blackbears.bbplay.common.fragment.adapter.Item
import mobi.blackbears.bbplay.screens.booking.domain.model.SpecialProductPrice


data class PriceItem(
    @StringRes
    val resId: Int,
    val gameZone: SpecialProductPrice,
    val bootCamp: SpecialProductPrice
) : Item()
