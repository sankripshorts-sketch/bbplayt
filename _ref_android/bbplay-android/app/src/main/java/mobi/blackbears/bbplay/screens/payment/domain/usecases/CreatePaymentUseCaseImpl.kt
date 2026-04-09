package mobi.blackbears.bbplay.screens.payment.domain.usecases

import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.screens.payment.domain.PaymentNetworkRepository
import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo
import javax.inject.Inject

class CreatePaymentUseCaseImpl @Inject constructor(
    private val repository: PaymentNetworkRepository
) : CreatePaymentUseCase {
    override suspend fun createPaymentByBankCard(
        clientId: Long,
        value: Float,
        token: String,
        userPhone: String,
        email: String,
    ): PayInfo =
        repository.createPayment(
            clientId,
            value,
            token,
            userPhone,
            null,
            null,
            email
        )

    override suspend fun createPaymentBySberPay(
        clientId: Long,
        value: Float,
        userPhone: String,
        paymentType: String,
        email: String,
    ): PayInfo =
        repository.createPayment(
            clientId,
            value,
            null,
            userPhone,
            paymentType,
            BuildConfig.Y_MONEY_APP_SCHEME,
            email
        )

    override suspend fun createPaymentBySbp(
        clientId: Long,
        value: Float,
        token: String,
        userPhone: String,
        paymentType: String,
        email: String,
    ): PayInfo =
        repository.createPayment(
            clientId,
            value,
            token,
            userPhone,
            paymentType,
            BuildConfig.Y_MONEY_APP_SCHEME,
            email
        )
}