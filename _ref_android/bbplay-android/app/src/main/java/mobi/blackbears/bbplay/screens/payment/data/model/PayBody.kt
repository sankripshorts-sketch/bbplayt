package mobi.blackbears.bbplay.screens.payment.data.model

import com.google.gson.annotations.SerializedName

data class PayBody(
    @SerializedName("client_id")
    val clientId: Long,

    @SerializedName("value")
    val value: Float,

    @SerializedName("currency")
    val currency: String = "RUB",

    @SerializedName("token")
    val token: String? = null,

    @SerializedName("paymentType")
    val paymentType: String? = null,

    @SerializedName("confirmation_return_url")
    val confirmationUrl: String? = null,

    @SerializedName("phone")
    val phone: String,

    @SerializedName("email")
    val memberEmail: String,
)