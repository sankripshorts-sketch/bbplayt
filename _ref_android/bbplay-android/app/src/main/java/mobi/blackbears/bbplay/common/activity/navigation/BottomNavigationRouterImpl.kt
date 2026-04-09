package mobi.blackbears.bbplay.common.activity.navigation

import androidx.navigation.NavOptions
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.navigation.NavCommand
import javax.inject.Inject

class BottomNavigationRouterImpl @Inject constructor() : BottomNavigationRouter {

    override fun navigateToProfileOrLogin(userId: Long, navOptions: NavOptions): NavCommand =
        if (userId == -1L)
            NavCommand(R.id.loginFragment, navOptions = navOptions)
        else
            NavCommand(R.id.profile_item, navOptions = navOptions)

    override fun navigateToNews(navOptions: NavOptions): NavCommand =
        NavCommand(R.id.news_item, navOptions = navOptions)

    override fun navigateToClubs(navOptions: NavOptions): NavCommand =
        NavCommand(R.id.clubs_item, navOptions = navOptions)

    override fun navigateToEvents(navOptions: NavOptions): NavCommand =
        NavCommand(R.id.events_item, navOptions = navOptions)

    override fun navigateToBooking(navOptions: NavOptions): NavCommand =
        NavCommand(R.id.booking_item, navOptions = navOptions)
}