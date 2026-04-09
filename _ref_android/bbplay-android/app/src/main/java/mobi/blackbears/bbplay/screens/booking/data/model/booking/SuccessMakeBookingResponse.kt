package mobi.blackbears.bbplay.screens.booking.data.model.booking

import com.google.gson.annotations.SerializedName
import mobi.blackbears.bbplay.screens.booking.data.model.PcResponse

data class SuccessMakeBookingResponse(
    @SerializedName("pcs")
    val pcs: List<PcResponse>?
)