package mobi.blackbears.bbplay.screens.login.fragments.registration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.extensions.generateUidUser
import mobi.blackbears.bbplay.common.metrica.MetricManager
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.common.preferences.UserData
import mobi.blackbears.bbplay.screens.login.domain.model.NewAccountFields
import mobi.blackbears.bbplay.screens.login.domain.usecases.RegistrationUseCase
import mobi.blackbears.bbplay.screens.login.navigation.RegistrationRouter
import timber.log.Timber
import java.net.UnknownHostException
import javax.inject.Inject

class RegistrationViewModel @Inject constructor(
    private val registrationUseCase: RegistrationUseCase,
    private val preferences: PreferenceManager,
    private val metricManager: MetricManager,
    private val router: RegistrationRouter,
) : ViewModel() {

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    fun createAccount(fields: NewAccountFields) {
        registrationUseCase.tryRegistration(fields)
            .onEach { (id, privateKey) ->
                metricManager.registrationSuccess(id, fields.memberAccount)
                val userData = UserData(
                    userId = id,
                    uid = generateUidUser(id.toString()),
                    email = fields.memberEmail,
                    nickname = fields.memberAccount,
                    phone = fields.memberPhone,
                    userPrivateKey = privateKey,
                )
                preferences.setCachedUserData(userData)
                _navCommand.tryEmit(router.navigateToVerificationCodeFragment())
            }
            .catch {
                if (it is BBError) _errorFlow.tryEmit(it)
                if (it is UnknownHostException) _errorFlow.tryEmit(BBError.NO_INTERNET)
                metricManager.registrationFail(it.message)
                Timber.e(it)
            }
            .launchIn(viewModelScope)
    }
}