package mobi.blackbears.bbplay.screens.news.di

import androidx.lifecycle.ViewModel
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.news.data.mapper.VkNewsMapper
import mobi.blackbears.bbplay.screens.news.data.model.VkNewsResponse
import mobi.blackbears.bbplay.screens.news.domain.model.VkInfo
import mobi.blackbears.bbplay.screens.news.domain.usecases.*
import mobi.blackbears.bbplay.screens.news.fragment.NewsViewModel

@Module
interface NewsModule {
    @[NewsScope Binds IntoMap ViewModelKey(NewsViewModel::class)]
    fun bindNewsViewModel(viewModel: NewsViewModel): ViewModel

    @[NewsScope Binds]
    fun bindVkMapper(mapper: VkNewsMapper): Mapper<VkNewsResponse, VkInfo>

    @[NewsScope Binds]
    fun bindGetNewsUseCase(useCaseImpl: GetNewsUseCaseImpl): GetNewsUseCase

    @[NewsScope Binds]
    fun bindCreateNewsItemsUseCase(useCaseImpl: CreateNewsItemsUseCaseImpl): CreateNewsItemsUseCase
}