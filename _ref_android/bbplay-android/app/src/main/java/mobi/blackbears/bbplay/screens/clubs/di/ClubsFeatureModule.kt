package mobi.blackbears.bbplay.screens.clubs.di

import androidx.lifecycle.ViewModel
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.clubs.presentation.ClubsViewModel
import mobi.blackbears.bbplay.screens.clubs.data.mapper.ClubsMapper
import mobi.blackbears.bbplay.screens.clubs.data.model.Info
import mobi.blackbears.bbplay.screens.clubs.data.network.ClubsRepository
import mobi.blackbears.bbplay.screens.clubs.data.network.ClubsRepositoryImpl
import mobi.blackbears.bbplay.screens.clubs.domain.model.ClubInfo
import mobi.blackbears.bbplay.screens.clubs.domain.usecases.GetClubInfoUseCase
import mobi.blackbears.bbplay.screens.clubs.domain.usecases.GetClubInfoUseCaseImpl
import mobi.blackbears.bbplay.screens.clubs.navigation.ClubsRouter
import mobi.blackbears.bbplay.screens.clubs.navigation.ClubsRouterImpl
import dagger.Binds
import dagger.Module
import dagger.multibindings.IntoMap

@Module
interface ClubsFeatureModule {

    //region navigation
    @ClubsScope
    @Binds
    fun bindClubsRouter(router: ClubsRouterImpl): ClubsRouter
    //endregion

    //region network
    @Binds
    @ClubsScope
    fun bindClubsRepository(repositoryImpl: ClubsRepositoryImpl): ClubsRepository

    @Binds
    @ClubsScope
    fun bindClubsMapper(mapper: ClubsMapper): Mapper<Info, ClubInfo>
// endregion

    //region use case
    @ClubsScope
    @Binds
    fun bindClubsUseCase(useCase: GetClubInfoUseCaseImpl): GetClubInfoUseCase
// endregion

    //region view model
    @ClubsScope
    @Binds
    @IntoMap
    @ViewModelKey(ClubsViewModel::class)
    fun bindProfileViewModel(viewModel: ClubsViewModel): ViewModel
    //endregion
}