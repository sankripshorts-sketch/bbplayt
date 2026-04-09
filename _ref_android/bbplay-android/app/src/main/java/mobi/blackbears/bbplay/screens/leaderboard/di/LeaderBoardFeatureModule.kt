package mobi.blackbears.bbplay.screens.leaderboard.di

import androidx.lifecycle.ViewModel
import mobi.blackbears.bbplay.common.data.model.GameResponse
import mobi.blackbears.bbplay.common.data.model.RankedResponse
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.leaderboard.data.mapper.GameInfoMapper
import mobi.blackbears.bbplay.screens.leaderboard.data.mapper.LeadersInfoMapper
import mobi.blackbears.bbplay.screens.leaderboard.data.network.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.model.*
import mobi.blackbears.bbplay.screens.leaderboard.domain.usecase.*
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.LeadersViewModel
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.factory.SortingFactory
import mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders.factory.SortingFactoryImpl
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.TournamentsViewModel
import mobi.blackbears.bbplay.screens.leaderboard.fragments.tournament.factory.*
import mobi.blackbears.bbplay.screens.leaderboard.navigation.*
import dagger.*
import dagger.multibindings.IntoMap

@Module
interface LeaderBoardFeatureModule {

    //region ViewModel
    @LeaderBoardScope
    @Binds
    @IntoMap
    @ViewModelKey(TournamentsViewModel::class)
    fun bindTournamentsViewModel(viewModel: TournamentsViewModel): ViewModel

    @LeaderBoardScope
    @Binds
    @IntoMap
    @ViewModelKey(LeadersViewModel::class)
    fun bindLeadersViewModel(viewModel: LeadersViewModel): ViewModel
    //endregion

    //region NetworkRepository
    @LeaderBoardScope
    @Binds
    fun bindTournamentsRepository(repository: LeaderBoardRepositoryImpl): LeaderBoardRepository

    @LeaderBoardScope
    @Binds
    fun bindGameMapper(mapper: GameInfoMapper): Mapper<GameResponse<out RankedResponse>, GameInfo>

    @LeaderBoardScope
    @Binds
    fun bindLeadersInfoMapper(mapper: LeadersInfoMapper): Mapper<GameResponse<out RankedResponse>, LeadersInfo>
    //endregion

    //region UseCases
    @LeaderBoardScope
    @Binds
    fun bindGetGameUseCase(useCase: GetGamesUseCaseImpl): GetGamesUseCase
    //endregion

    //region Router
    @LeaderBoardScope
    @Binds
    fun bindTournamentsRouter(router: LeaderBoardRouterImpl): LeaderBoardRouter
    //endregion

    //region Factory
    @LeaderBoardScope
    @Binds
    fun bindGameItemFactory(factory: GameItemFactoryImpl): GameItemFactory

    @LeaderBoardScope
    @Binds
    fun bindSortingFactory(factory: SortingFactoryImpl): SortingFactory
    //endregion
}