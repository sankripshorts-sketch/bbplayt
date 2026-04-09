package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.screens.booking.domain.model.*

interface CreatePriceZoneUseCase {
    fun createPriceZone(pricesProducts: List<SpecialProductPrice>): List<PriceZone>
}