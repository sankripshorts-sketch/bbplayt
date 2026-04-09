package mobi.blackbears.bbplay.screens.payment.domain

import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo

interface PaymentNetworkRepository {
    suspend fun createPayment(
        clientId: Long,
        value: Float,
        token: String?,
        userPhone: String,
        paymentType: String?,
        returnUrl: String?,
        email: String,
    ): PayInfo

    suspend fun getPaymentStatus(paymentId: String): PayInfo
}