package mobi.blackbears.bbplay.screens.booking.domain.usecases

import mobi.blackbears.bbplay.screens.booking.domain.model.*
import javax.inject.Inject

class CreatePriceZoneUseCaseImpl @Inject constructor(): CreatePriceZoneUseCase {
    override fun createPriceZone(pricesProducts: List<SpecialProductPrice>): List<PriceZone> {
        val hours = createPriceZoneByCondition(
            pricesProducts,
            PricesAndShops.GAME_ZONE_ONE_HOUR,
            PricesAndShops.GAME_ZONE_ONE_HOUR.priceId,
            PricesAndShops.BOOTCAMP_ONE_HOUR.priceId
        )

        val morning = createPriceZoneByCondition(
            pricesProducts,
            PricesAndShops.GAME_ZONE_MORNING,
            PricesAndShops.GAME_ZONE_MORNING.priceId,
            PricesAndShops.BOOTCAMP_MORNING.priceId
        )

        val threeHours = createPriceZoneByCondition(
            pricesProducts,
            PricesAndShops.GAME_ZONE_THREE_HOURS,
            PricesAndShops.GAME_ZONE_THREE_HOURS.priceId,
            PricesAndShops.BOOTCAMP_THREE_HOURS.priceId
        )

        val fiveHours = createPriceZoneByCondition(
            pricesProducts,
            PricesAndShops.GAME_ZONE_FIVE_HOURS,
            PricesAndShops.GAME_ZONE_FIVE_HOURS.priceId,
            PricesAndShops.BOOTCAMP_FIVE_HOURS.priceId
        )

        val night = createPriceZoneByCondition(
            pricesProducts,
            PricesAndShops.GAME_ZONE_NIGHT,
            PricesAndShops.GAME_ZONE_NIGHT.priceId,
            PricesAndShops.BOOTCAMP_NIGHT.priceId
        )
        return listOf(hours, threeHours, fiveHours, night)
    }

    private fun createPriceZoneByCondition(
        prices: List<SpecialProductPrice>,
        typePrice: PricesAndShops,
        gameZoneId: Long,
        BootCampId: Long
    ): PriceZone {
        var priceZone = PriceZone(typePrice, SpecialProductPrice.EMPTY, SpecialProductPrice.EMPTY)

        prices.forEach {
            when (it.productId) {
                gameZoneId -> priceZone = priceZone.copy(gameZone = it)
                BootCampId -> priceZone = priceZone.copy(bootCamp = it)
            }
        }
        return priceZone
    }
}