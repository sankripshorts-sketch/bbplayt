package mobi.blackbears.bbplay.screens.login.di

import mobi.blackbears.bbplay.common.application.AppComponent
import mobi.blackbears.bbplay.screens.login.fragments.login.LoginFragment
import mobi.blackbears.bbplay.screens.login.fragments.login.PasswordRecoveryFragment
import mobi.blackbears.bbplay.screens.login.fragments.registration.RegistrationFragment
import dagger.Component
import mobi.blackbears.bbplay.screens.login.data.preferences.CredentialsManager
import mobi.blackbears.bbplay.screens.login.domain.usecases.RegistrationUseCase
import mobi.blackbears.bbplay.screens.login.fragments.confirmnumber.PhoneNumberConfirmationFragment
import mobi.blackbears.bbplay.screens.login.fragments.verification.VerificationCodeFragment

@Component(
    modules = [
        LoginFeatureModule::class,
        LoginApiModule::class,
        CredentialsModule::class,
    ],
    dependencies = [AppComponent::class]
)
@LoginScope
interface LoginComponent {
    fun inject(fragment: LoginFragment)

    fun inject(fragment: RegistrationFragment)

    fun inject(fragment: PasswordRecoveryFragment)

    fun inject(fragment: VerificationCodeFragment)

    fun inject(fragment: PhoneNumberConfirmationFragment)

    fun getCheckLoginUseCase(): RegistrationUseCase

    fun getCredentialsManager(): CredentialsManager

    @Component.Factory
    interface Factory {
        fun create(appComponent: AppComponent): LoginComponent
    }
}