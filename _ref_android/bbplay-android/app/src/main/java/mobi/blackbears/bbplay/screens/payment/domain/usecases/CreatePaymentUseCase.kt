package mobi.blackbears.bbplay.screens.payment.domain.usecases

import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo

interface CreatePaymentUseCase {
    suspend fun createPaymentByBankCard(
        clientId: Long,
        value: Float,
        token: String,
        userPhone: String,
        email: String,
    ): PayInfo

    suspend fun createPaymentBySberPay(
        clientId: Long,
        value: Float,
        userPhone: String,
        paymentType: String,
        email: String,
    ): PayInfo

    suspend fun createPaymentBySbp(
        clientId: Long,
        value: Float,
        token: String,
        userPhone: String,
        paymentType: String,
        email: String,
    ): PayInfo
}