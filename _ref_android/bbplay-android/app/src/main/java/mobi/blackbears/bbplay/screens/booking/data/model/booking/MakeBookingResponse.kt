package mobi.blackbears.bbplay.screens.booking.data.model.booking

import com.google.gson.annotations.SerializedName
import mobi.blackbears.bbplay.common.data.model.BBResponse

data class MakeBookingResponse(
    @SerializedName("code")
    val code: Int,

    @SerializedName("message")
    val message: String,

    @SerializedName("iCafe_response")
    val iCafeResponse: BBResponse<SuccessMakeBookingResponse>?
)