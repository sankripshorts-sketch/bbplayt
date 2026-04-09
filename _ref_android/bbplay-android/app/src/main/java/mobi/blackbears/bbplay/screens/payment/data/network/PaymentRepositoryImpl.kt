package mobi.blackbears.bbplay.screens.payment.data.network

import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.screens.payment.data.model.*
import mobi.blackbears.bbplay.screens.payment.domain.PaymentNetworkRepository
import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo
import javax.inject.Inject

class PaymentRepositoryImpl @Inject constructor(
    private val api: PaymentApi,
    private val payMapper: Mapper<PayResponse, PayInfo>
): PaymentNetworkRepository {
    override suspend fun createPayment(
        clientId: Long,
        value: Float,
        token: String?,
        userPhone: String,
        paymentType: String?,
        returnUrl: String?,
        email: String,
    ): PayInfo {
        val body = PayBody(
            clientId,
            value,
            token = token,
            phone = userPhone,
            paymentType = paymentType,
            confirmationUrl = returnUrl,
            memberEmail = email,
        )
        return payMapper.transform(api.createPayment(body))
    }

    override suspend fun getPaymentStatus(paymentId: String): PayInfo {
        val body = PaymentIdBody(paymentId)
        return payMapper.transform(api.getPaymentByPaymentId(body))
    }
}