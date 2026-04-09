package mobi.blackbears.bbplay.screens.settings.di


import androidx.lifecycle.ViewModel
import mobi.blackbears.bbplay.common.data.model.MemberResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.settings.SettingsViewModel
import mobi.blackbears.bbplay.screens.settings.data.mapper.SettingsMapper
import mobi.blackbears.bbplay.screens.settings.data.network.SettingsRepository
import mobi.blackbears.bbplay.screens.settings.data.network.SettingsRepositoryImpl
import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo
import mobi.blackbears.bbplay.screens.settings.domain.usecases.*
import dagger.Binds
import dagger.Module
import dagger.multibindings.IntoMap

@Module
interface SettingsFeatureModule {

    //region network
    @Binds
    @SettingsScope
    fun bindSettingsRepository(repositoryImpl: SettingsRepositoryImpl): SettingsRepository

    @SettingsScope
    @Binds
    fun bindChangePasswordUseCase(usecase: ChangePasswordUseCaseImpl): ChangePasswordUseCase

    //region Mappers
    @Binds
    @SettingsScope
    fun bindSettingsMapper(mapper: SettingsMapper): Mapper<MemberResponse, SettingsInfo>
    // endregion

    //region use case
    @SettingsScope
    @Binds
    fun bindSettingsUseCase(settingsUseCase: GetSettingsInfoUseCaseImpl): GetSettingsInfoUseCase
    // endregion

    //region view model
    @SettingsScope
    @Binds
    @IntoMap
    @ViewModelKey(SettingsViewModel::class)
    fun bindSettingsViewModel(viewModel: SettingsViewModel): ViewModel
    // endregion

}