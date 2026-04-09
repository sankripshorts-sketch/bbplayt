package mobi.blackbears.bbplay.screens.booking.domain.model

import mobi.blackbears.bbplay.common.extensions.emptyString


data class ClubInfoWithPrices(
    val address: String = emptyString(),
    val phone: String = emptyString(),
    val websiteCompany: String = emptyString(),
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val prices: List<SpecialProductPrice> = listOf()
) {
    companion object {
        val EMPTY = ClubInfoWithPrices()
    }
}