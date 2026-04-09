package mobi.blackbears.bbplay.screens.payment.data.model

import com.google.gson.annotations.SerializedName

data class PaymentIdBody(
    @SerializedName("order_id")
    val paymentId: String
)