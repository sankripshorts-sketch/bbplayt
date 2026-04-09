package mobi.blackbears.bbplay.screens.events.di

import androidx.lifecycle.ViewModel
import dagger.*
import dagger.multibindings.IntoMap
import mobi.blackbears.bbplay.common.utils.Mapper
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelKey
import mobi.blackbears.bbplay.screens.events.data.mapper.*
import mobi.blackbears.bbplay.screens.events.data.model.*
import mobi.blackbears.bbplay.screens.events.data.network.*
import mobi.blackbears.bbplay.screens.events.domain.model.*
import mobi.blackbears.bbplay.screens.events.domain.usecases.*
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.DetailEventViewModel
import mobi.blackbears.bbplay.screens.events.fragments.event.EventViewModel
import mobi.blackbears.bbplay.screens.events.navigation.*

@Module
interface EventBindsModule {
    @[EventScope Binds]
    fun bindEventDetailMapper(mapper: EventDetailMapper): Mapper<EventDetailResponse, EventDetail>

    @[EventScope Binds]
    fun bindEventOfClubMapper(mapper: EventOfClubMapper): Mapper<EventResponse, EventOfClub>

    @[EventScope Binds]
    fun bindCheckRewardMapper(mapper: CheckRewardMapper): Mapper<CheckRewardResponse, CodeRewardType>

    @[EventScope Binds]
    fun bindEventRepository(repositoryImpl: EventRepositoryImpl): EventRepository

    @[EventScope Binds]
    fun bindGetEventUseCase(useCase: GetEventUseCaseImpl): GetEventUseCase

    @[EventScope Binds]
    fun bindNavigation(router: EventRouterImpl): EventRouter

    @[EventScope Binds IntoMap ViewModelKey(EventViewModel::class)]
    fun bindEventViewModel(viewModel: EventViewModel): ViewModel

    @[EventScope Binds IntoMap ViewModelKey(DetailEventViewModel::class)]
    fun bindDetailEventViewModel(viewModel: DetailEventViewModel) : ViewModel
}