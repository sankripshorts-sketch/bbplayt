package mobi.blackbears.bbplay.screens.booking.data.model

import com.google.gson.annotations.SerializedName

data class SpecialProductsResponse(
    @SerializedName("items")
    val products: List<ProductResponse>
)