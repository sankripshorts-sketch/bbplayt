package mobi.blackbears.bbplay.screens.payment.domain.model

data class PayInfo(
    val id: String,
    val status: String,
    val paid: Boolean,
    val value: String,
    val currency: String,
    val confirmationType: String,
    val confirmationURL: String,
    val description: String,
    val accountID: String,
    val gatewayID: String,
    val refundable: Boolean,
    val test: Boolean,
    val createdAt: String,
    val paymentType: String,
    val paymentId: String,
    val paymentSaved: Boolean
)