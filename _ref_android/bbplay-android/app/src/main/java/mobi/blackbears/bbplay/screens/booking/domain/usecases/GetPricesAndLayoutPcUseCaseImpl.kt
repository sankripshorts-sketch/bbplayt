package mobi.blackbears.bbplay.screens.booking.domain.usecases

import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.screens.booking.domain.BookingRepository
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import java.net.UnknownHostException
import javax.inject.Inject

class GetPricesAndLayoutPcUseCaseImpl @Inject constructor(
    private val repository: BookingRepository
) : GetPricesAndLayoutPcUseCase {

    override fun getPricesAndClubInfo(): Flow<ClubInfoWithPrices> {
        val pricesFromHour = flow { emit(repository.getPricesFromHour()) }
            .catch {
                if (it is UnknownHostException) throw BBError.NO_INTERNET
                emit(listOf())
            }
        val shopPrices = flow { emit(repository.getShopProducts()) }
            .catch {
                if (it is UnknownHostException) throw BBError.NO_INTERNET
                emit(listOf())
            }
        val clubInfo = flow { emit(repository.getClubsInfo()) }
            .catch {
                if (it is UnknownHostException) throw BBError.NO_INTERNET
                emit(ClubInfo.EMPTY)
            }

        return pricesFromHour
            .zip(shopPrices, ::mapToBookingInfo)
            .zip(clubInfo, ::addClubsInfoInBookingInfo)
    }

    private fun mapToBookingInfo(
        pricePerHours: List<PricePerHour>,
        specialPrices: List<SpecialProductPrice>
    ): ClubInfoWithPrices = ClubInfoWithPrices(
        prices = pricePerHours
            .map(::toSpecialProductPrice)
            .toMutableList()
            .apply { addAll(specialPrices) }
    )

    private fun toSpecialProductPrice(pricePerHour: PricePerHour): SpecialProductPrice =
        pricePerHour.run {
            SpecialProductPrice(
                productId = priceId,
                productName = "1 час",
                productPrice = priceShow,
                productEnabledClient = true,
                productEnableTime = emptyString(),
                productShowTime = emptyString()
            )
        }

    private fun addClubsInfoInBookingInfo(
        clubInfoWithPrices: ClubInfoWithPrices,
        clubsInfo: ClubInfo
    ): ClubInfoWithPrices =
        clubInfoWithPrices.copy(
            address = clubsInfo.license_address,
            phone = clubsInfo.license_phone,
            websiteCompany = clubsInfo.license_website,
            lat = clubsInfo.lat,
            lng = clubsInfo.lng
        )

    override suspend fun getAreasWithPcs(): List<AreaZone> = repository.getAreasWithPcs()
}