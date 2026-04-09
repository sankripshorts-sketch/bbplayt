package mobi.blackbears.bbplay.screens.payment.data.model

private const val MESSAGE = "Unknown payment method"

class UnknownPaymentMethodException(paymentType: String)
    : Exception("$MESSAGE: $paymentType")