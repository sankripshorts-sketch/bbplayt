package mobi.blackbears.bbplay.screens.booking.data.mapper

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.ProductResponse
import mobi.blackbears.bbplay.screens.booking.domain.model.SpecialProductPrice
import javax.inject.Inject

class SpecialShopMapper @Inject constructor() : Mapper<ProductResponse, SpecialProductPrice> {
    override fun transform(data: ProductResponse): SpecialProductPrice = data.run {
        SpecialProductPrice(
            productId = productId,
            productName = productName,
            productPrice = productPrice,
            productEnabledClient = productEnabledClient == 1,
            productEnableTime = productEnableTime,
            productShowTime = productShowTime
        )
    }
}