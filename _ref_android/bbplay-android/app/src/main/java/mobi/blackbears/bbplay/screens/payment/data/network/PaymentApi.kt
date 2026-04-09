package mobi.blackbears.bbplay.screens.payment.data.network

import mobi.blackbears.bbplay.screens.payment.data.model.*
import retrofit2.http.*

interface PaymentApi {
    @POST("create-payment-v2")
    suspend fun createPayment(@Body payFields: PayBody): PayResponse

    @POST("check-payment")
    suspend fun getPaymentByPaymentId(@Body paymentId: PaymentIdBody): PayResponse
}