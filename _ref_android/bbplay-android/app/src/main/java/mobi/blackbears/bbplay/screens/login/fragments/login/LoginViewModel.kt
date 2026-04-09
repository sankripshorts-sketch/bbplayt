package mobi.blackbears.bbplay.screens.login.fragments.login

import androidx.lifecycle.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.screens.login.navigation.LoginRouter
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.common.extensions.generateUidUser
import mobi.blackbears.bbplay.common.extensions.launchOrError
import mobi.blackbears.bbplay.common.metrica.MetricManager
import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.login.domain.usecases.RegistrationUseCase
import timber.log.Timber
import java.net.UnknownHostException
import javax.inject.Inject

class LoginViewModel @Inject constructor(
    private val registrationUseCase: RegistrationUseCase,
    private val preferences: PreferenceManager,
    private val router: LoginRouter,
    private val metricManager: MetricManager
) : ViewModel() {

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    private val _isButtonEnabled = MutableStateFlow(false to false)
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _logoAnimationScale = createMutableSingleEventFlow<Int>()
    val logoAnimationScale get() = _logoAnimationScale.asSharedFlow()

    fun setPhoneIsNotEmpty(isNotEmpty: Boolean) {
        val isButton = _isButtonEnabled.value.copy(first = isNotEmpty)
        _isButtonEnabled.tryEmit(isButton)
    }

    fun setPasswordIsNotEmpty(isNotEmpty: Boolean) {
        val isButton = _isButtonEnabled.value.copy(second = isNotEmpty)
        _isButtonEnabled.tryEmit(isButton)
    }

    fun tryLogInUser(accountLogin: String, password: String) {
        _isButtonEnabled.tryEmit(false to false)
        launchOrError(
            {
                val loginResult = registrationUseCase.tryLogin(accountLogin, password)
                val user = loginResult.user

                val userData = UserData(
                    userId = user.memberId,
                    uid = generateUidUser(user.memberId.toString()),
                    email = user.memberEmail,
                    nickname = user.memberAccount,
                    phone = user.memberPhone,
                    userPrivateKey = loginResult.privateKey
                )

                if (loginResult.isUserPhoneVerified) {
                    preferences.setUserData(userData)
                    metricManager.logInSuccess(user.memberId, user.memberAccount)
                } else {
                    preferences.setCachedUserData(userData)
                    navigateToPhoneConfirmationNumberFragment()
                }
            },
            {
                Timber.e(it)
                metricManager.logInFail(it.message)
                if (it is BBError) _errorFlow.tryEmit(it)
                if (it is UnknownHostException) _errorFlow.tryEmit(BBError.NO_INTERNET)
                _isButtonEnabled.tryEmit(true to true)
            }
        )
    }

    fun navigateToRegistrationFragment() {
        _navCommand.tryEmit(router.navigateToRegistrationFragment())
    }

    fun navigateToPasswordRecoveryBottomFragment() {
        _navCommand.tryEmit(router.navigateToPasswordRecoveryBottomFragment())
    }

    private fun navigateToPhoneConfirmationNumberFragment() {
        _navCommand.tryEmit(router.navigateToPhoneNumberConfirmationFragment())
    }

    fun startAnimationLogo(isKeyboardVisible: Boolean) {
        val anim = if (isKeyboardVisible) R.anim.scale_down_logo else R.anim.scale_up_logo
        _logoAnimationScale.tryEmit(anim)
    }
}