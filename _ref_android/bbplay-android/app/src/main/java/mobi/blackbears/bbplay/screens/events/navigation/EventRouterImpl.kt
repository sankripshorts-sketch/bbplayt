package mobi.blackbears.bbplay.screens.events.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.navigation.toNavCommand
import mobi.blackbears.bbplay.screens.events.fragments.detail_event.DetailEventFragmentDirections
import mobi.blackbears.bbplay.screens.events.fragments.event.EventFragmentDirections
import javax.inject.Inject

class EventRouterImpl @Inject constructor() : EventRouter {
    override fun navigateToEventDetailFragment(eventId: String): NavCommand =
        EventFragmentDirections.actionEventsItemToDetailEventFragment(eventId).toNavCommand()

    override fun navigateToJoinEventBottomFragment(): NavCommand =
        DetailEventFragmentDirections.actionDetailEventFragmentToJoinEventBottomFragment()
            .toNavCommand()
}