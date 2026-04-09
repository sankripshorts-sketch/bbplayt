package mobi.blackbears.bbplay.screens.login.fragments.registration

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.screens.login.fragments.registration.model.ButtonVisibility
import mobi.blackbears.bbplay.screens.login.navigation.RegistrationRouter
import javax.inject.Inject

class UIRegistrationViewModel @Inject constructor() : ViewModel() {

    private val _isButtonEnabled = MutableStateFlow(ButtonVisibility())
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    fun setNickNameIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isNicknameFilled = isNotEmpty))
    }

    fun setPhoneIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isPhoneFilled = isNotEmpty))
    }

    fun setFirstNameIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isFirstNameFilled = isNotEmpty))
    }

    fun setSecondNameIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isSecondNameFilled = isNotEmpty))
    }

    fun setDateBirthIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isDateOfBirthFilled = isNotEmpty))
    }

    fun setPasswordIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isPasswordFilled = isNotEmpty))
    }

    fun setEmailIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isEmailFilled = isNotEmpty))
    }

    fun setAgreeWithTermsOfUseIsChecked(isChecked: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(isAgreeWithTermsOfUseChecked = isChecked))
    }
}