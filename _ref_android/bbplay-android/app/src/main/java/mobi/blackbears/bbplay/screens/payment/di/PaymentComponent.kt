package mobi.blackbears.bbplay.screens.payment.di

import dagger.Component
import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.payment.fragment.PayFragment

@PaymentScope
@Component(
    modules = [PaymentFeatureModule::class, PaymentApiModule::class],
    dependencies = [AppComponent::class]
)
interface PaymentComponent {
    fun inject(fragment: PayFragment)

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): PaymentComponent
    }
}