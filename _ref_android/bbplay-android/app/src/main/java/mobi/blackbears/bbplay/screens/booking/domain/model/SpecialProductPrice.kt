package mobi.blackbears.bbplay.screens.booking.domain.model

import mobi.blackbears.bbplay.common.fragment.adapter.Item


data class SpecialProductPrice (
    val productId: Long,
    val productName: String,
    val productPrice: String,
    val productEnabledClient: Boolean,
    val productEnableTime: String,
    val productShowTime: String
) : Item() {
    companion object {
        val EMPTY = SpecialProductPrice(
            productId = 0,
            productName = "",
            productPrice = "",
            productEnabledClient = false,
            productEnableTime = "",
            productShowTime = ""
        )
    }
}
