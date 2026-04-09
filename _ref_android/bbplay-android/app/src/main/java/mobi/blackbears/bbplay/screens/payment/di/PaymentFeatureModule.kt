package mobi.blackbears.bbplay.screens.payment.di

import androidx.lifecycle.ViewModel
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.payment.data.mapper.PayMapper
import mobi.blackbears.bbplay.screens.payment.data.model.PayResponse
import mobi.blackbears.bbplay.screens.payment.data.network.PaymentRepositoryImpl
import mobi.blackbears.bbplay.screens.payment.domain.PaymentNetworkRepository
import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo
import mobi.blackbears.bbplay.screens.payment.domain.usecases.*
import mobi.blackbears.bbplay.screens.payment.fragment.PayViewModel
import mobi.blackbears.bbplay.screens.payment.navigation.PaymentRouter
import mobi.blackbears.bbplay.screens.payment.navigation.PaymentRouterImpl

@Module
interface PaymentFeatureModule {
    //region network
    @[PaymentScope Binds]
    fun bindsPaymentNetworkRepository(repo: PaymentRepositoryImpl): PaymentNetworkRepository

    @[PaymentScope Binds]
    fun bindPayMapper(mapper: PayMapper): Mapper<PayResponse, PayInfo>
    //endregion

    //region use case
    @[PaymentScope Binds]
    fun bindCreatePaymentUseCase(createPaymentUseCase: CreatePaymentUseCaseImpl): CreatePaymentUseCase

    @[PaymentScope Binds]
    fun bindGetPaymentStatusUseCase(getPaymentStatusUseCase: GetPaymentStatusUseCaseImpl): GetPaymentStatusUseCase
    // endregion

    @[PaymentScope Binds]
    fun bindPaymentRouter(router: PaymentRouterImpl): PaymentRouter

    @[PaymentScope Binds IntoMap ViewModelKey(PayViewModel::class)]
    fun bindPayViewModel(viewModel: PayViewModel): ViewModel
}