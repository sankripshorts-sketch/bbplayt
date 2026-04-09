package mobi.blackbears.bbplay.screens.events.fragments.event

import android.util.Log
import androidx.lifecycle.*
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.extensions.launchOrError
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.events.domain.usecases.GetEventUseCase
import mobi.blackbears.bbplay.screens.events.fragments.event.factory.CreateEventItemsFactory
import mobi.blackbears.bbplay.screens.events.fragments.event.model.EventItem
import mobi.blackbears.bbplay.screens.events.navigation.EventRouter
import timber.log.Timber
import javax.inject.Inject

class EventViewModel @Inject constructor(
    private val getEventUseCase: GetEventUseCase,
    private val eventItemsFactory: CreateEventItemsFactory,
    private val router: EventRouter,
    preferenceManager: PreferenceManager
): ViewModel() {
    private val _isLoaderVisible = MutableStateFlow(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    private val _eventItems = MutableStateFlow<List<EventItem>>(listOf())
    val eventItems get() = _eventItems.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val userData = preferenceManager.getUserData()
        .stateIn(viewModelScope, SharingStarted.Eagerly, UserData.NONE)
        .value

    init {
        loadEvents()
    }

    fun loadEvents() {
        launchOrError(
            {
                emitLoader(true)
                val eventsWithPlayers =
                    getEventUseCase.getEventsWithCheckRewardUser(
                        getEventUseCase.getEventsWithPlayers(),
                        userData.userId,
                        userData.nickname
                    )
                val createEventItems = eventItemsFactory.createEventItems(eventsWithPlayers)
                _eventItems.tryEmit(createEventItems)
                emitLoader(false)
            },
            {
                Timber.e(it)
            }
        )
    }

    private fun emitLoader(isEnable: Boolean) {
        _isLoaderVisible.tryEmit(isEnable)
    }

    fun navigateToEventDetailFragment(eventId: String) {
        _navCommand.tryEmit(router.navigateToEventDetailFragment(eventId))
    }
}