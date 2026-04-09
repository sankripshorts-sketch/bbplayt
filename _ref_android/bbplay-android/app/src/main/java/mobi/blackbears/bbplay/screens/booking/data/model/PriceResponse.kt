package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

data class PriceResponse(
    @SerializedName("price_id")
    val priceId: Long,

    @SerializedName("price_name")
    val priceName: String,

    @SerializedName("price_show")
    val priceShow: String
)
