package mobi.blackbears.bbplay.common.activity.navigation

import androidx.navigation.NavOptions

sealed interface BottomItem {
    class ProfileOrLogin(val options: NavOptions): BottomItem
    class News(val options: NavOptions): BottomItem
    class Clubs(val options: NavOptions): BottomItem
    class Events(val options: NavOptions): BottomItem
    class Booking(val options: NavOptions): BottomItem
}