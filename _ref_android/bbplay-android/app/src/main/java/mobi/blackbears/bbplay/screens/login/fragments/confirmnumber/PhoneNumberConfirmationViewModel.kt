package mobi.blackbears.bbplay.screens.login.fragments.confirmnumber

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.extensions.removeAllNotDigitChars
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.login.domain.usecases.UpdatePhoneNumberUseCase
import mobi.blackbears.bbplay.screens.login.navigation.PhoneNumberConfirmationRouter
import timber.log.Timber
import javax.inject.Inject


// todo: inject coroutine dispatchers
class PhoneNumberConfirmationViewModel @Inject constructor(
    private val updatePhoneNumberUseCase: UpdatePhoneNumberUseCase,
    private val preferences: PreferenceManager,
    private val router: PhoneNumberConfirmationRouter,
) : ViewModel() {
    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()

    private val _isButtonEnabled = MutableStateFlow(true)
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    val phoneNumber = preferences.getCachedUserData().phone

    fun setPhoneIsNotEmpty(isNotEmpty: Boolean) {
        _isButtonEnabled.tryEmit(isNotEmpty)
    }

    fun continueConfirmation(newPhoneNumber: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val userData = preferences.getCachedUserData()

            val id = userData.userId
            val oldPhone = "+${userData.phone.removeAllNotDigitChars()}"
            val newPhone = "+${newPhoneNumber.removeAllNotDigitChars()}"

            if (newPhone != oldPhone) {
                updatePhoneNumber(id, oldPhone, newPhone).also { success ->
                    if (success) navigateToVerificationFragment()
                }
            } else {
                navigateToVerificationFragment()
            }
        }
    }

    private fun updatePhoneNumberLocal(newPhoneNumber: String) {
        preferences.apply {
            setCachedUserData(getCachedUserData().copy(phone = newPhoneNumber))
        }
    }

    private suspend fun updatePhoneNumberRemote(
        userId: Long,
        oldPhoneNumber: String,
        newPhoneNumber: String,
    ) = withContext(Dispatchers.IO) {
            try {
                return@withContext updatePhoneNumberUseCase(
                    userId = userId,
                    newPhone = newPhoneNumber,
                    oldPhone = oldPhoneNumber
                )
            } catch (e: CancellationException) {
                throw e
            } catch (error: BBError) {
                _errorFlow.tryEmit(error)
                false
            } catch (e: Exception) {
                Timber.e(e)
                false
            }
        }

    private suspend fun updatePhoneNumber(
        userId: Long,
        oldPhoneNumber: String,
        newPhoneNumber: String,
    ): Boolean {
        return updatePhoneNumberRemote(userId, oldPhoneNumber, newPhoneNumber).also { success ->
            if (success) {
                updatePhoneNumberLocal(newPhoneNumber)
            }
        }
    }

    private fun navigateToVerificationFragment() {
        _navCommand.tryEmit(router.navigatePhoneVerificationFragment())
    }
}