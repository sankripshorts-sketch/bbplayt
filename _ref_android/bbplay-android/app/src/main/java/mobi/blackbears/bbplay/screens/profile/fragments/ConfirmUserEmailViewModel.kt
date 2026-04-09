package mobi.blackbears.bbplay.screens.profile.fragments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.extensions.emptyString
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.profile.navigation.ProfileRouter
import javax.inject.Inject

class ConfirmUserEmailViewModel @Inject constructor(
    private val router: ProfileRouter,
    private val preferences: PreferenceManager,
) : ViewModel() {

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _email = MutableStateFlow(emptyString())

    private val _isButtonEnabled = MutableStateFlow(false)
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    fun setEmailIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(isNotEmpty)
    }

    fun navigateToPay() {
        viewModelScope.launch {
            val memberPhone = preferences.getUserData().first().phone
            _navCommand.tryEmit(router.navigateFromConfirmUserEmailFragmentToPay(memberPhone, _email.value))
        }
    }

    fun getEmail(email: String) {
        viewModelScope.launch {
            _email.tryEmit(email)
        }
    }
}