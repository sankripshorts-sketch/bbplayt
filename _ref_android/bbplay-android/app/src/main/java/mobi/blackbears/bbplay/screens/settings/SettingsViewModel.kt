package mobi.blackbears.bbplay.screens.settings

import androidx.lifecycle.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.settings.domain.model.SettingsInfo
import mobi.blackbears.bbplay.screens.settings.domain.usecases.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.common.metrica.MetricManager
import mobi.blackbears.bbplay.common.preferences.UserData
import timber.log.Timber
import javax.inject.Inject

class SettingsViewModel @Inject constructor(
    private val getSettingsInfoUseCase: GetSettingsInfoUseCase,
    private val changePasswordUseCase: ChangePasswordUseCase,
    private val preferences: PreferenceManager,
    private val metricManager: MetricManager
) : ViewModel() {

    private val _userInfo = MutableStateFlow(SettingsInfo.EMPTY)
    val userInfo: StateFlow<SettingsInfo> get() = _userInfo.asStateFlow()

    private val _isButtonEnabled = MutableStateFlow(false to false)
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    private val _messageFlow = createMutableSingleEventFlow<BBError>()
    val messageFlow = _messageFlow.asSharedFlow()

    private val _successFlow = createMutableSingleEventFlow<Int>()
    val successFlow get() = _successFlow.asSharedFlow()

    private val _isLoaderVisible = MutableStateFlow<Boolean>(true)
    val isLoaderVisible get() = _isLoaderVisible.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                val member = getSettingsInfoUseCase(preferences.getUserData().first().userId)
                _userInfo.tryEmit(member)
                _isLoaderVisible.tryEmit(false)
            } catch (error: CancellationException) {
                throw error
            } catch (error: BBError) {
                _messageFlow.tryEmit(error)
            } catch (e: Exception) {
                Timber.e(e)
            }
        }
    }

    fun setOldPasswordNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(first = isNotEmpty))
    }

    fun setNewPasswordNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(_isButtonEnabled.value.copy(second = isNotEmpty))
    }

    fun onClickChangePassword(oldPassword: String, newPassword: String) {
        viewModelScope.launch {
            try {
                val userInfo = userInfo.value
                changePasswordUseCase.invoke(
                    memberId = userInfo.memberId,
                    accountLogin = userInfo.memberAccount,
                    oldPassword = oldPassword,
                    newPassword = newPassword
                )
                metricManager.changedPassword(userInfo.memberId, userInfo.memberAccount)
                _successFlow.tryEmit(R.string.password_change_success)
            } catch (e: CancellationException) {
                throw e
            } catch (e: BBError) {
                _messageFlow.tryEmit(e)
            } catch (e: Exception) {
                Timber.e(e)
            }
        }
    }

    fun logOut() {
        viewModelScope.launch {
            preferences.setUserData(UserData.NONE)
        }
    }
}