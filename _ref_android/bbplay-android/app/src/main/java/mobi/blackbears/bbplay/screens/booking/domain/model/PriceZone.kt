package mobi.blackbears.bbplay.screens.booking.domain.model

data class PriceZone(
    val typePrice: PricesAndShops,
    val gameZone: SpecialProductPrice,
    val bootCamp: SpecialProductPrice
)