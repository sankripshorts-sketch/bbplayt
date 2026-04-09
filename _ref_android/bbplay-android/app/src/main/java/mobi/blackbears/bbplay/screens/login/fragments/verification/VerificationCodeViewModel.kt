package mobi.blackbears.bbplay.screens.login.fragments.verification

import androidx.lifecycle.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.data.model.BBError
import mobi.blackbears.bbplay.common.extensions.createMutableSingleEventFlow
import mobi.blackbears.bbplay.common.extensions.encodeStringToMD5
import mobi.blackbears.bbplay.common.extensions.getRandomString
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.screens.login.data.preferences.CredentialsManager
import mobi.blackbears.bbplay.common.preferences.PreferenceManager
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodePayload
import mobi.blackbears.bbplay.screens.login.domain.model.RequestCodeResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationNumberResult
import mobi.blackbears.bbplay.screens.login.domain.model.VerificationPhoneData
import mobi.blackbears.bbplay.screens.login.domain.usecases.VerificationUseCase
import mobi.blackbears.bbplay.screens.login.navigation.VerificationCodeRouter
import timber.log.Timber
import javax.inject.Inject


// todo: inject coroutine dispatchers
class VerificationCodeViewModel @Inject constructor(
    private val verificationUseCase: VerificationUseCase,
    private val router: VerificationCodeRouter,
    private val preferences: PreferenceManager,
    private val credentials: CredentialsManager,
) : ViewModel() {

    private val _isContinueButtonEnabled = MutableStateFlow(true)
    private val isCodeEntered = MutableStateFlow(false)
    private val isCodeSent = MutableStateFlow(false)

    val isContinueButtonEnabled = combine(
        _isContinueButtonEnabled,
        isCodeEntered,
        isCodeSent,
    ) { enabled, entered, sent ->
        enabled && entered && sent
    }.stateIn(viewModelScope, SharingStarted.Lazily, false)

    private val _timeToResendCode = MutableStateFlow(0)
    val timeToResend = _timeToResendCode.asStateFlow()

    private val _isResendButtonEnable = MutableStateFlow(true)
    val isResendButtonEnable = _isResendButtonEnable.asStateFlow()

    private val requestCodePayload = MutableStateFlow<RequestCodePayload?>(null)

    val phoneNumber = preferences.getCachedUserData().phone

    private val _nextRequestSmsTime = MutableStateFlow(0L)

    private val resendTimer = ResendTimerDecorator(
        scope = viewModelScope,
        onTick = { secondsToResend -> _timeToResendCode.tryEmit(secondsToResend) },
        onFinish = { _isResendButtonEnable.tryEmit(true) }
    )

    init {
        _nextRequestSmsTime.onEach {
            resendTimer.startCountDownTo(it)
        }
        .flowOn(Dispatchers.IO)
        .launchIn(viewModelScope)

        requestCodePayload.onEach {
            when (it) {
                null -> isCodeSent.tryEmit(false)
                else -> {
                    isCodeSent.tryEmit(true)
                    _isResendButtonEnable.tryEmit(false)
                    _nextRequestSmsTime.tryEmit(it.nextRequestCodeTime)
                }
            }
        }.launchIn(viewModelScope)

        requestCode()
    }


    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _errorFlow = createMutableSingleEventFlow<BBError>()
    val errorFlow get() = _errorFlow.asSharedFlow()


    fun requestCode() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                val userData = preferences.getCachedUserData()
                val userId = userData.userId
                val userPhone = userData.phone

                // todo: избавиться от прокидывания BBError в UI по всему приложению
                when (val result = verificationUseCase.tryRequestCode(userId, userPhone)) {
                    is RequestCodeResult.Success -> with(result.data) {
                        credentials.saveVerificationCredentials(encodedData, nextRequestCodeTime)
                        requestCodePayload.emit(this)
                    }
                    is RequestCodeResult.MemberNotFound -> throw BBError("", result.message)
                    is RequestCodeResult.PhoneVerified -> throw BBError("", result.message)
                    is RequestCodeResult.TooManyRequests -> {
                        credentials.getVerificationCredentials().first().let {
                            val encodedData = it.first
                            val resendTime = it.second
                            val currentTime = System.currentTimeMillis() / 1000

                            if (resendTime > currentTime && encodedData.isNotEmpty()) {
                                requestCodePayload.emit(RequestCodePayload(encodedData, resendTime))
                            } else {
                                credentials.clearVerificationCredentials()
                            }
                        }
                    }
                    is RequestCodeResult.UndefinedError -> throw result.exception
                }
            } catch (e: CancellationException) {
                throw e
            } catch (error: BBError) {
                _errorFlow.tryEmit(error)
            } catch (e: Exception) {
                Timber.e(e)
            }
        }
    }

    fun verifyNumber() {
        viewModelScope.launch(Dispatchers.IO) {
            try {
                _isContinueButtonEnabled.tryEmit(false)
                val requestCodePayload = requestCodePayload.value ?: throw BBError("Request new code or try later")

                val userData = preferences.getCachedUserData()
                val memberId = userData.userId
                val privateKey = userData.userPrivateKey

                val encodedData = requestCodePayload.encodedData
                val randomKey = getRandomString()
                val md5 = "$memberId$randomKey${privateKey}${BuildConfig.SECRET_KEY}".encodeStringToMD5()

                val verificationPhoneData = VerificationPhoneData(
                    userId = memberId,
                    code = _code.value,
                    encodedData = encodedData,
                    randomKey = randomKey,
                    key = md5,
                )

                when(val result = verificationUseCase.tryVerify(verificationPhoneData)) {
                    is VerificationNumberResult.Success -> {
                        withContext(Dispatchers.IO) {
                            preferences.apply { setUserData(getCachedUserData()) }
                        }
                    }
                    is VerificationNumberResult.VerificationLimitReached -> throw BBError(result.message)
                    is VerificationNumberResult.WrongCode -> navigateToWrongCode()
                    is VerificationNumberResult.UndefinedError -> throw result.exception
                }
            } catch (e: CancellationException) {
                throw e
            } catch (error: BBError) {
                _errorFlow.tryEmit(error)
            } catch (e: Exception) {
                Timber.e(e)
            } finally {
                _isContinueButtonEnabled.tryEmit(true)
            }
        }
    }

    private var _code = MutableStateFlow("")

    fun onChangeCodeListener(isComplete: Boolean, code: String) {
        isCodeEntered.tryEmit(isComplete)
        _code.tryEmit(code)
    }

    override fun onCleared() {
        resendTimer.clear()
        super.onCleared()
    }

    private fun navigateToWrongCode() {
        _navCommand.tryEmit(router.navigateToWrongCodeDialogFragment())
    }
}