package mobi.blackbears.bbplay.common.navigation

import android.os.Bundle
import androidx.annotation.IdRes
import androidx.core.os.bundleOf
import androidx.navigation.NavController
import androidx.navigation.NavDirections
import androidx.navigation.NavOptions

data class NavCommand(
    @IdRes val resId: Int,
    val args: Bundle = bundleOf(),
    val navOptions: NavOptions?
)

val EMPTY_NAV_COMMAND = NavCommand(-1, Bundle.EMPTY, null)

fun NavDirections.toNavCommand(): NavCommand = NavCommand(actionId, arguments, null)

fun NavController.safeNavigate(navCommand: NavCommand) {
    currentDestination?.getAction(navCommand.resId)?.run { navigate(navCommand.resId, navCommand.args) }
}