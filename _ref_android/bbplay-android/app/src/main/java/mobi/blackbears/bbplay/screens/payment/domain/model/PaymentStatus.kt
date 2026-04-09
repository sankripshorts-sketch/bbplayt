package mobi.blackbears.bbplay.screens.payment.domain.model

enum class PaymentStatus(val nameStatus: String, val isButtonEnabled: Boolean) {
    LOADING("loading", false),
    PENDING("pending", true),
    CANCELED("canceled", true),
    SUCCEEDED("succeeded", true)
}