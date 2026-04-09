package mobi.blackbears.bbplay.screens.booking.domain.model.price_picker

import mobi.blackbears.bbplay.screens.booking.domain.model.PricesAndShops.*
import java.time.LocalTime

enum class PricePickerType(
    val gameZoneId: Long,
    val bootCampId: Long,
    val maxTimeToBooking: LocalTime
) {
//    MORNING(
//        GAME_ZONE_MORNING.priceId,
//        BOOTCAMP_MORNING.priceId,
//        LocalTime.of(4, 0)
//    ),
    PRODUCT_3_HOURS(
        GAME_ZONE_THREE_HOURS.priceId,
        BOOTCAMP_THREE_HOURS.priceId,
        LocalTime.of(3, 0)
    ),
    PRODUCT_5_HOURS(
        GAME_ZONE_FIVE_HOURS.priceId,
        BOOTCAMP_FIVE_HOURS.priceId,
        LocalTime.of(5, 0)
    ),
    NIGHT(
        GAME_ZONE_NIGHT.priceId,
        BOOTCAMP_NIGHT.priceId,
        LocalTime.of(12, 0)
    ),
    DEFAULT_1_HOUR(
        GAME_ZONE_ONE_HOUR.priceId,
        BOOTCAMP_ONE_HOUR.priceId,
        LocalTime.of(1, 0)
    ),
    DEFAULT_2_HOUR(
        GAME_ZONE_ONE_HOUR.priceId,
        BOOTCAMP_ONE_HOUR.priceId,
        LocalTime.of(2, 0)
    ),
    DEFAULT_3_HOUR(
        GAME_ZONE_ONE_HOUR.priceId,
        BOOTCAMP_ONE_HOUR.priceId,
        LocalTime.of(3, 0)
    ),
    DEFAULT_4_HOUR(
        GAME_ZONE_ONE_HOUR.priceId,
        BOOTCAMP_ONE_HOUR.priceId,
        LocalTime.of(4, 0)
    ),
    DEFAULT_5_HOUR(
        GAME_ZONE_ONE_HOUR.priceId,
        BOOTCAMP_ONE_HOUR.priceId,
        LocalTime.of(5, 0)
    )
}