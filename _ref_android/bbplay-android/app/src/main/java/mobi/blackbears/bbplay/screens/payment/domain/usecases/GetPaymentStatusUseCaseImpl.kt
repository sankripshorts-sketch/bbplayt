package mobi.blackbears.bbplay.screens.payment.domain.usecases

import mobi.blackbears.bbplay.screens.payment.domain.PaymentNetworkRepository
import javax.inject.Inject

class GetPaymentStatusUseCaseImpl @Inject constructor(
    private val repository: PaymentNetworkRepository
): GetPaymentStatusUseCase {
    override suspend fun invoke(paymentId: String): String =
        repository.getPaymentStatus(paymentId).status
}