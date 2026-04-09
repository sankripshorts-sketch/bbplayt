package mobi.blackbears.bbplay.screens.events.navigation

import mobi.blackbears.bbplay.common.navigation.NavCommand

interface EventRouter {
    fun navigateToEventDetailFragment(eventId: String): NavCommand

    fun navigateToJoinEventBottomFragment(): NavCommand
}