package mobi.blackbears.bbplay.screens.booking.data.network

import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.data.model.getDataOrThrowException
import mobi.blackbears.bbplay.common.extensions.castToDouble
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.*
import mobi.blackbears.bbplay.screens.booking.data.model.booking.BookingResponse
import mobi.blackbears.bbplay.screens.booking.data.model.booking.body.*
import mobi.blackbears.bbplay.screens.booking.domain.BookingRepository
import mobi.blackbears.bbplay.screens.booking.domain.model.*
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.BookingInfo
import javax.inject.Inject

private const val SUCCESS_BOOKING_CODE = 3

class BookingRepositoryImpl @Inject constructor(
    private val api: BookingApi,
    private val productsMapper: Mapper<ProductResponse, SpecialProductPrice>,
    private val clubsMapper: Mapper<Info, ClubInfo>,
    private val pricesMapper: Mapper<PriceResponse, PricePerHour>,
    private val areasMapper: Mapper<AreaModel, AreaZone>,
    private val bookingMapper: Mapper<BookingResponse, BookingInfo>
) : BookingRepository {
    override suspend fun getShortUserInfo(memberId: Long): UserPhoneAndBalance {
        val userInfo = api.getUserInfo(memberId = memberId).getDataOrThrowException().memberResponse
        return UserPhoneAndBalance(userInfo.memberBalance.castToDouble(), userInfo.memberPhone)
    }

    override suspend fun getClubsInfo(): ClubInfo {
        val data = api.getClubInfo().getDataOrThrowException()
        return clubsMapper.transform(data.info)
    }

    override suspend fun getPricesFromHour(): List<PricePerHour> {
        val pricesFromHour = api.getPriceFromHour().getDataOrThrowException()
        return pricesFromHour.map(pricesMapper::transform)
    }

    override suspend fun getShopProducts(): List<SpecialProductPrice> {
        val data = api.getProducts().getDataOrThrowException()
        return data.products.map { productsMapper.transform(it) }
    }

    override suspend fun getAreasWithPcs(): List<AreaZone> {
        val areas = api.getRooms().getDataOrThrowException()
        val pcsInfo = api.getListOfPcs().getDataOrThrowException()

        return areas.map { areasMapper.transform(AreaModel(it, pcsInfo)) }
    }

    override suspend fun makeBooking(
        pcName: String,
        memberAccount: String,
        memberId: String,
        startDate: String,
        startTime: String,
        minutes: String,
        priceId: Long?,
        randomKey: String,
        key: String
    ) {
        val bookingBody = BookingBody(
            pcName,
            memberAccount,
            memberId,
            startDate,
            startTime,
            minutes,
            priceId,
            randomKey,
            key
        )

        val response = api.makeBooking(params = bookingBody)

        if (response.code == SUCCESS_BOOKING_CODE) {
            return
        } else {
            response.iCafeResponse?.let {
                throw BBError(it.code, it.message)
            } ?: {
                throw BBError("404", "Something went wrong")
            }
        }
    }

    override suspend fun getAllBookings(): List<BookingInfo> {
        val data = api.getAllBookings().getDataOrThrowException()
        return data.map(bookingMapper::transform)
    }
}