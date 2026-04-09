package mobi.blackbears.bbplay.common.activity.navigation

import android.os.Bundle
import mobi.blackbears.bbplay.R
import android.view.Menu
import androidx.core.view.forEach
import androidx.navigation.*
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavOptions
import com.google.android.material.navigation.NavigationBarView
import java.lang.ref.WeakReference

object BottomNavigationUI  {
    private const val FRAGMENT_LABEL_LOGIN = "fragment_login"
    private const val FRAGMENT_LABEL_PROFILE = "fragment_profile"

    fun setBottomNavigation(
        navigationBarView: NavigationBarView,
        navController: NavController,
        listener: (BottomItem) -> Unit
    ) {
        navigationBarView.setOnItemSelectedListener {
            val options = NavOptions.Builder().setLaunchSingleTop(true)

            if (it.order and Menu.CATEGORY_SECONDARY == 0) {
                options.setPopUpTo(
                    navController.graph.findStartDestination().id,
                    inclusive = false
                )
            }

            when (it.itemId) {
                R.id.profile_item -> {
                    val navOptions = options.setPopUpTo(
                        navController.graph.findStartDestination().id,
                        inclusive = true
                    )
                        .build()
                    listener(BottomItem.ProfileOrLogin(navOptions))
                }
                R.id.news_item -> listener(BottomItem.News(options.build()))
                R.id.clubs_item -> listener(BottomItem.Clubs(options.build()))
                R.id.events_item -> listener(BottomItem.Events(options.build()))
                R.id.booking_item -> listener(BottomItem.Booking(options.build()))
            }
            true
        }
        addOnDestinationListener(navigationBarView, navController)
    }

    private fun addOnDestinationListener(
        navigationBarView: NavigationBarView,
        navController: NavController
    ) {
        val weakReference = WeakReference(navigationBarView)
        navController.addOnDestinationChangedListener(
            object : NavController.OnDestinationChangedListener {
                override fun onDestinationChanged(
                    controller: NavController,
                    destination: NavDestination,
                    arguments: Bundle?
                ) {
                    val view = weakReference.get()
                    if (view == null) {
                        navController.removeOnDestinationChangedListener(this)
                        return
                    }

                    if (destination.label == FRAGMENT_LABEL_LOGIN || destination.label == FRAGMENT_LABEL_PROFILE) {
                        view.menu.findItem(R.id.profile_item).isChecked = true
                    }

                    view.menu.forEach { item ->
                        if (item.itemId == R.id.profile_item) return@forEach

                        if (destination.hierarchy.any { it.id == item.itemId }) {
                            item.isChecked = true
                        }
                    }
                }
            })
    }
}