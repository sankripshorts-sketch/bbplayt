package mobi.blackbears.bbplay.screens.payment.data.model

import com.google.gson.annotations.SerializedName

data class PayResponse(
    @SerializedName("id")
    val id: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("paid")
    val paid: Boolean,

    @SerializedName("amount")
    val amount: AmountResponse,

    @SerializedName("confirmation")
    val confirmation: ConfirmationResponse?,

    @SerializedName("description")
    val description: String?,

    @SerializedName("recipient")
    val recipient: RecipientResponse,

    @SerializedName("refundable")
    val refundable: Boolean,

    @SerializedName("test")
    val test: Boolean,

    @SerializedName("created_at")
    val createdAt: String,

    @SerializedName("payment_method")
    val paymentMethod: PaymentResponse
)

data class AmountResponse(
    @SerializedName("value")
    val value: String,

    @SerializedName("currency")
    val currency: String
)

data class ConfirmationResponse(
    @SerializedName("type")
    val type: String,

    @SerializedName("confirmation_url")
    val confirmationURL: String
)

data class PaymentResponse(
    @SerializedName("type")
    val type: String,

    @SerializedName("id")
    val id: String,

    @SerializedName("saved")
    val saved: Boolean
)

data class RecipientResponse(
    @SerializedName("account_id")
    val accountID: String,

    @SerializedName("gateway_id")
    val gatewayID: String
)