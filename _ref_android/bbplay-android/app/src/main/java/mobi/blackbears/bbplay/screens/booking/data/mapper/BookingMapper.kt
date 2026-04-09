package mobi.blackbears.bbplay.screens.booking.data.mapper

import mobi.blackbears.bbplay.common.extensions.toLocalDateTime
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.booking.data.model.booking.BookingResponse
import mobi.blackbears.bbplay.screens.booking.domain.model.booking.BookingInfo
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class BookingMapper @Inject constructor(): Mapper<BookingResponse, BookingInfo> {
    override fun transform(data: BookingResponse): BookingInfo = data.run {
        val pattern = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

        BookingInfo(
            memberOfferId = memberOfferId,
            productPcName = productPcName,
            memberAccount = memberAccount,
            startSession = startSession.toLocalDateTime(pattern),
            endSession =  endSession.toLocalDateTime(pattern),
            productMinutes = productMinutes
        )
    }
}