package mobi.blackbears.bbplay.screens.login.di

import androidx.lifecycle.ViewModel
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.login.data.mapper.RegistrationBodyMapper
import mobi.blackbears.bbplay.screens.login.data.mapper.UserMapper
import mobi.blackbears.bbplay.screens.login.data.network.LoginRepository
import mobi.blackbears.bbplay.screens.login.data.network.LoginRepositoryImpl
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.screens.login.data.model.RegistrationBody
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import mobi.blackbears.bbplay.screens.login.domain.model.User
import mobi.blackbears.bbplay.screens.login.domain.usecases.*
import mobi.blackbears.bbplay.screens.login.fragments.login.LoginViewModel
import mobi.blackbears.bbplay.screens.login.fragments.registration.UIRegistrationViewModel
import mobi.blackbears.bbplay.screens.login.navigation.*
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.screens.login.data.mapper.VerifyPhoneNumberBodyMapper
import mobi.blackbears.bbplay.screens.login.data.model.VerifyPhoneNumberBody
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData
import mobi.blackbears.bbplay.screens.login.fragments.confirmnumber.PhoneNumberConfirmationViewModel
import mobi.blackbears.bbplay.screens.login.fragments.registration.RegistrationViewModel
import mobi.blackbears.bbplay.screens.login.fragments.verification.VerificationCodeViewModel

@Module
interface LoginFeatureModule {

    //region ViewModels
    @LoginScope
    @Binds
    @IntoMap
    @ViewModelKey(LoginViewModel::class)
    fun bindLoginViewModel(viewModel: LoginViewModel): ViewModel

    @Binds
    @IntoMap
    @ViewModelKey(RegistrationViewModel::class)
    fun bindRegistrationViewModel(viewModel: RegistrationViewModel): ViewModel

    @Binds
    @IntoMap
    @ViewModelKey(UIRegistrationViewModel::class)
    fun bindUIRegistrationViewModel(viewModel: UIRegistrationViewModel): ViewModel

    @Binds
    @IntoMap
    @ViewModelKey(VerificationCodeViewModel::class)
    fun bindVerificationCodeViewModel(viewModel: VerificationCodeViewModel): ViewModel

    @Binds
    @IntoMap
    @ViewModelKey(PhoneNumberConfirmationViewModel::class)
    fun bindPhoneNumberConfirmationViewModel(viewModel: PhoneNumberConfirmationViewModel): ViewModel
    //endregion

    //region RepositoryNetwork
    @Binds
    @LoginScope
    fun bindLoginRepository(repositoryImpl: LoginRepositoryImpl): LoginRepository

    @Binds
    @LoginScope
    fun bindUserMapper(mapper: UserMapper): Mapper<MemberResponse?, User>

    @LoginScope
    @Binds
    fun bindRegistrationBody(mapper: RegistrationBodyMapper): Mapper<NewAccountFields, RegistrationBody>

    @LoginScope
    @Binds
    fun bindVerifyPhoneNumberBody(mapper: VerifyPhoneNumberBodyMapper): Mapper<VerificationPhoneData, VerifyPhoneNumberBody>
    //endregion

    //region UseCases

    @LoginScope
    @Binds
    fun bindRegistrationUseCase(registrationUseCase: RegistrationUseCaseImpl): RegistrationUseCase

    @LoginScope
    @Binds
    fun bindVerificationUseCase(useCase: VerificationUseCaseImpl): VerificationUseCase

    @LoginScope
    @Binds
    fun bindUpdatePhoneNumberUseCase(useCase: UpdatePhoneNumberUseCaseImpl): UpdatePhoneNumberUseCase
    //endregion

    //region Router
    @LoginScope
    @Binds
    fun bindLoginRouter(router: LoginRouterImpl): LoginRouter

    @LoginScope
    @Binds
    fun bindRegistrationRouter(router: RegistrationRouterImpl): RegistrationRouter

    @LoginScope
    @Binds
    fun bindVerificationCodeRouter(router: VerificationCodeRouterImpl): VerificationCodeRouter

    @LoginScope
    @Binds
    fun bindPhoneNumberConfirmationRouter(router: PhoneNumberConfirmationRouterImpl): PhoneNumberConfirmationRouter
    //endregion
}