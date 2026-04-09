package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

data class ProductResponse(
    @SerializedName("product_id")
    val productId: Long,

    @SerializedName("product_name")
    val productName: String,

    @SerializedName("product_price")
    val productPrice: String,

    @SerializedName("product_enable_client")
    val productEnabledClient: Int,

    @SerializedName("product_enable_time")
    val productEnableTime: String,

    @SerializedName("product_show_time")
    val productShowTime: String
)