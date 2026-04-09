package mobi.blackbears.bbplay.screens.profile.di

import androidx.lifecycle.ViewModel
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.profile.data.mapper.ProfileMapper
import mobi.blackbears.bbplay.screens.profile.data.network.*
import mobi.blackbears.bbplay.screens.profile.domain.model.ProfileInfo
import mobi.blackbears.bbplay.screens.profile.domain.usecases.*
import mobi.blackbears.bbplay.screens.profile.fragments.ConfirmUserEmailViewModel
import mobi.blackbears.bbplay.screens.profile.fragments.ProfileViewModel
import mobi.blackbears.bbplay.screens.profile.navigation.*

@Module
interface ProfileFeatureModule {

    //region network
    @Binds
    @ProfileScope
    fun bindProfileRepository(repositoryImpl: ProfileRepositoryImpl): ProfileRepository

    @Binds
    @ProfileScope
    fun bindProfileMapper(mapper: ProfileMapper): Mapper<MemberResponse, ProfileInfo>
    // endregion

    //region view model
    @ProfileScope
    @Binds
    @IntoMap
    @ViewModelKey(ProfileViewModel::class)
    fun bindProfileViewModel(viewModel: ProfileViewModel): ViewModel

    @ProfileScope
    @Binds
    @IntoMap
    @ViewModelKey(ConfirmUserEmailViewModel::class)
    fun bindConfirmUserEmailViewModel(viewModel: ConfirmUserEmailViewModel): ViewModel
    // endregion

    //region router
    @ProfileScope
    @Binds
    fun bindProfileRouter(router: ProfileRouterImpl): ProfileRouter
    // endregion

    //region use case
    @ProfileScope
    @Binds
    fun bindProfileUseCase(profileUseCase: GetProfileInfoUseCaseImpl): GetProfileInfoUseCase
    // endregion
}