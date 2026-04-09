package mobi.blackbears.bbplay.screens.booking.data.mapper


import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.PriceResponse
import mobi.blackbears.bbplay.screens.booking.domain.model.PricePerHour
import javax.inject.Inject

class PriceMapper @Inject constructor(): Mapper<PriceResponse, PricePerHour> {
    override fun transform(data: PriceResponse): PricePerHour  = data.run {
        PricePerHour(
            priceId = priceId,
            priceName = priceName,
            priceShow = priceShow
        )
    }
}