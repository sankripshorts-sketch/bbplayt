package mobi.blackbears.bbplay.screens.payment.di

import dagger.Module
import dagger.Provides
import mobi.blackbears.bbplay.screens.payment.data.network.PaymentApi
import retrofit2.Retrofit

@Module
class PaymentApiModule {
    @[PaymentScope Provides]
    fun provideApi(retrofit: Retrofit): PaymentApi = retrofit.create(PaymentApi::class.java)
}