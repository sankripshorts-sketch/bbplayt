package mobi.blackbears.bbplay.screens.payment.domain.usecases

interface GetPaymentStatusUseCase {
    suspend operator fun invoke(paymentId: String): String
}