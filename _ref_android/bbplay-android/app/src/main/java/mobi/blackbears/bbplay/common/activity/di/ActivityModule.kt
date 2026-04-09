package mobi.blackbears.bbplay.common.activity.di

import androidx.lifecycle.ViewModel
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.activity.MainViewModel
import mobi.blackbears.bbplay.common.activity.navigation.BottomNavigationRouter
import mobi.blackbears.bbplay.common.activity.navigation.BottomNavigationRouterImpl
import mobi.blackbears.bbplay.common.domain.usecases.CheckUserExistsOrActiveUseCase
import mobi.blackbears.bbplay.common.domain.usecases.CheckUserExistsOrActiveUseCaseImpl
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey

@Module
interface ActivityModule {
    @ActivityScope
    @Binds
    fun bindBottomRouter(bottomRouter: BottomNavigationRouterImpl): BottomNavigationRouter

    @ActivityScope
    @Binds
    @IntoMap
    @ViewModelKey(MainViewModel::class)
    fun bindMainViewModel(viewModel: MainViewModel): ViewModel

    @ActivityScope
    @Binds
    fun bindCheckUserExistOrActiveUseCase(useCase: CheckUserExistsOrActiveUseCaseImpl):
            CheckUserExistsOrActiveUseCase
}