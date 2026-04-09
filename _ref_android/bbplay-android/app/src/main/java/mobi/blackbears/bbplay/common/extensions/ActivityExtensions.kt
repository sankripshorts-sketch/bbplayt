package mobi.blackbears.bbplay.common.extensions

import android.app.Activity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.core.view.isVisible
import mobi.blackbears.bbplay.R

fun Activity.hideOrShowBottomNavigation(isShow: Boolean) {
    findViewById<View>(R.id.bottom_navigation).isVisible = isShow
}

fun Activity.hideKeyboard() {
    val inputMethodManager: InputMethodManager = getSystemService(
        Activity.INPUT_METHOD_SERVICE
    ) as InputMethodManager
    if (currentFocus is EditText) {
        inputMethodManager.hideSoftInputFromWindow(currentFocus?.windowToken, 0)
    }
}