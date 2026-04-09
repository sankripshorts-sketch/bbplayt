package mobi.blackbears.bbplay.screens.booking.data.model.booking

import com.google.gson.annotations.SerializedName

data class BookingResponse(
    @SerializedName("member_offer_id")
    val memberOfferId: Long,

    @SerializedName("product_pc_name")
    val productPcName: String,

    @SerializedName("member_account")
    val memberAccount: String,

    @SerializedName("product_available_date_local_from")
    val startSession: String,

    @SerializedName("product_available_date_local_to")
    val endSession: String,

    @SerializedName("product_mins")
    val productMinutes: Int
)