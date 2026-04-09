package mobi.blackbears.bbplay.common.activity.navigation

import androidx.navigation.NavOptions
import mobi.blackbears.bbplay.common.navigation.NavCommand

interface BottomNavigationRouter {
    fun navigateToProfileOrLogin(userId: Long, navOptions: NavOptions): NavCommand

    fun navigateToNews(navOptions: NavOptions): NavCommand

    fun navigateToClubs(navOptions: NavOptions): NavCommand

    fun navigateToEvents(navOptions: NavOptions): NavCommand

    fun navigateToBooking(navOptions: NavOptions): NavCommand
}