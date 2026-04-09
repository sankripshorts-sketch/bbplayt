package mobi.blackbears.bbplay.screens.payment.fragment

import android.app.Activity
import android.content.Intent
import android.text.Editable
import androidx.activity.result.ActivityResult
import androidx.lifecycle.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.extensions.*
import mobi.blackbears.bbplay.common.metrica.MetricManager
import mobi.blackbears.bbplay.common.navigation.NavCommand
import mobi.blackbears.bbplay.common.preferences.*
import mobi.blackbears.bbplay.screens.payment.data.model.UnknownPaymentMethodException
import mobi.blackbears.bbplay.screens.payment.domain.model.PaymentStatus
import mobi.blackbears.bbplay.screens.payment.domain.model.PayInfo
import mobi.blackbears.bbplay.screens.payment.domain.usecases.CreatePaymentUseCase
import mobi.blackbears.bbplay.screens.payment.domain.usecases.GetPaymentStatusUseCase
import mobi.blackbears.bbplay.screens.payment.navigation.PaymentRouter
import ru.yoomoney.sdk.kassa.payments.*
import ru.yoomoney.sdk.kassa.payments.checkoutParameters.*
import timber.log.Timber
import java.math.BigDecimal
import java.util.*
import java.util.concurrent.CancellationException
import javax.inject.Inject

private const val MIN_MONEY = 100.00
private const val CURRENCY_CODE = "RUB"
private const val TITLE_PRODUCT = "Пополнение счёта"
private const val SUBTITLE_PRODUCT = "Пополнение счёта"

class PayViewModel @Inject constructor(
    private val createPaymentUseCase: CreatePaymentUseCase,
    private val getPaymentStatusUseCase: GetPaymentStatusUseCase,
    private val router: PaymentRouter,
    private val metricManager: MetricManager,
    private val preferences: PreferenceManager,
) : ViewModel() {
    private val _moneyFlow = MutableStateFlow(MIN_MONEY.toString())
    val moneyFlow get() = _moneyFlow.asStateFlow()

    private val _userData = MutableStateFlow(UserData.NONE)

    private val _isButtonEnabled = MutableStateFlow(false)
    val isButtonEnabled get() = _isButtonEnabled.asStateFlow()

    private val _paymentParams = createMutableSingleEventFlow<PaymentParameters>()
    val paymentParams get() = _paymentParams.asSharedFlow()

    private val _confirmationUrl = createMutableSingleEventFlow<Pair<String, PaymentMethodType>>()
    val confirmationUrl get() = _confirmationUrl.asSharedFlow()

    //region ProcessPaymentBottomFragment
    private val _navCommand = createMutableSingleEventFlow<NavCommand>()
    val navCommand get() = _navCommand.asSharedFlow()

    private val _paymentStatus = MutableStateFlow(PaymentStatus.LOADING)
    val paymentStatus get() = _paymentStatus.asStateFlow()

    private val _isSuccessOrPendingStatus = createMutableSingleEventFlow<Boolean>()
    val isSuccessOrPendingStatus get() = _isSuccessOrPendingStatus.asSharedFlow()
    //endregion

    private var valueOfReplenishment: Double = 0.0
    private var paymentId: String = emptyString()
    private var userPhone: String = emptyString()
    private var userEmail: String = emptyString()

    fun setUserData(userPhone: String?, userEmail: String?) {
        this.userPhone = userPhone ?: emptyString()
        this.userEmail = userEmail ?: emptyString()
    }

    private fun observeUser() {
        viewModelScope.launch {
            val user = preferences.getUserData().first()
            _userData.update {
                _userData.value.copy(
                    userId = user.userId,
                    uid = user.uid,
                    email = userEmail.ifEmpty { user.email },
                    nickname = user.phone,
                    userPrivateKey = user.userPrivateKey
                )
            }
        }
    }

    init {
        observeUser()
    }

    fun choiceFastMoneyValue(moneyValue: String) {
        _moneyFlow.tryEmit(moneyValue.removeRubWord())
    }

    fun checkMinSum(money: Editable?) {
        if (money == null) return
        val isEnabled = money.toString().castToDouble() >= MIN_MONEY
        _isButtonEnabled.tryEmit(isEnabled)
    }

    fun onClickPay(value: String?) {
        if (value == null) return
        metricManager.payReplenishInPayWithSum(_userData.value.userId, _userData.value.nickname)
        valueOfReplenishment = value.toDouble()

        val paymentParameters = PaymentParameters(
            amount = Amount(
                BigDecimal.valueOf(valueOfReplenishment), Currency.getInstance(CURRENCY_CODE)
            ),
            title = TITLE_PRODUCT,
            subtitle = SUBTITLE_PRODUCT,
            clientApplicationKey = BuildConfig.CLIENT_ID,
            shopId = BuildConfig.SHOP_ID,
            savePaymentMethod = SavePaymentMethod.USER_SELECTS,
            paymentMethodTypes = setOf(
                PaymentMethodType.BANK_CARD,
                PaymentMethodType.SBERBANK,
                PaymentMethodType.SBP
            ),
            customerId = _userData.value.uid
        )
        _paymentParams.tryEmit(paymentParameters)
    }

    fun checkTokenResult(result: ActivityResult) {
        when (result.resultCode) {
            Activity.RESULT_OK -> createPayment(result.data)
            Activity.RESULT_CANCELED -> {
                // user canceled tokenization
            }
        }
    }

    private fun createPayment(intent: Intent?) {
        val userId = _userData.value.userId
        val nickname = _userData.value.nickname
        emitPaymentStatus(PaymentStatus.LOADING)
        showLoadingBottomFragment()
        metricManager.loaderPay(userId, nickname)
        val tokenizationResult = intent?.let { Checkout.createTokenizationResult(it) } ?: return

        viewModelScope.launch {
            try {
                metricManager.createPaymentMetric(userId, nickname)
                val payment = createPaymentByPaymentType(tokenizationResult, userId)
                paymentId = payment.paymentId
                confirmPayment(payment)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Timber.e(e)
                emitPaymentStatus(PaymentStatus.CANCELED)
                metricManager.payFail(userId, nickname, e.message)
            }
        }
    }

    private fun showLoadingBottomFragment() {
        _navCommand.tryEmit(router.navigateToProcessPaymentBottomFragment())
    }

    fun saveEmail() {
        viewModelScope.launch {
            if (_userData.value.email.isNotEmpty()) {
                preferences.setUserData(_userData.value)
            }
        }
    }

    fun navigateToProfile() {
        _navCommand.tryEmit(router.navigateToProfileFragment())
    }

    private suspend fun createPaymentByPaymentType(
        tokenizationResult: TokenizationResult,
        userId: Long
    ): PayInfo = when (val paymentType = tokenizationResult.paymentMethodType) {
        PaymentMethodType.BANK_CARD -> {
            createPaymentUseCase.createPaymentByBankCard(
                userId,
                valueOfReplenishment.toFloat(),
                tokenizationResult.paymentToken,
                userPhone.removeAllNotDigitChars(), _userData.value.email
            )
        }

        PaymentMethodType.SBERBANK -> {
            createPaymentUseCase.createPaymentBySberPay(
                userId,
                valueOfReplenishment.toFloat(),
                userPhone.removeAllNotDigitChars(),
                paymentType.name.lowercase(), _userData.value.email
            )
        }

        PaymentMethodType.SBP -> {
            createPaymentUseCase.createPaymentBySbp(
                userId,
                valueOfReplenishment.toFloat(),
                tokenizationResult.paymentToken,
                userPhone.removeAllNotDigitChars(),
                paymentType.name.lowercase(), _userData.value.email
            )
        }

        else -> {
            throw UnknownPaymentMethodException(paymentType.name)
        }
    }

    private fun confirmPayment(payment: PayInfo) {
        val userId = _userData.value.userId
        val nickname = _userData.value.nickname
        when (payment.status) {
            PaymentStatus.SUCCEEDED.nameStatus -> {
                emitPaymentStatus(PaymentStatus.SUCCEEDED)
                metricManager.paySuccess(userId, nickname)
            }

            PaymentStatus.PENDING.nameStatus -> {
                val paymentType = getPaymentTypeByPayment(payment)
                _confirmationUrl.tryEmit(payment.confirmationURL to paymentType)
                metricManager.metric3dsFragment(userId, nickname)
            }

            PaymentStatus.CANCELED.nameStatus -> {
                emitPaymentStatus(PaymentStatus.CANCELED)
                metricManager.payFail(userId, nickname, payment.status)
            }
        }
    }

    private fun emitPaymentStatus(status: PaymentStatus) {
        _paymentStatus.tryEmit(status)
    }

    private fun getPaymentTypeByPayment(payment: PayInfo): PaymentMethodType =
        when (payment.paymentType) {
            PaymentMethodType.SBERBANK.name.lowercase() -> PaymentMethodType.SBERBANK
            PaymentMethodType.SBP.name.lowercase() -> PaymentMethodType.SBP
            else -> PaymentMethodType.BANK_CARD
        }

    fun checkConfirmPaymentResult(result: ActivityResult) {
        val userId = _userData.value.userId
        val nickname = _userData.value.nickname
        when (result.resultCode) {
            Activity.RESULT_OK -> {
                emitPaymentStatus(PaymentStatus.LOADING)
                metricManager.loaderPay(userId, nickname)
                getPaymentStatusFromNetwork()
            }

            else -> {
                emitPaymentStatus(PaymentStatus.CANCELED)
                metricManager.payFail(userId, nickname, "Activity.RESULT_CANCELED")
                Timber.w("${result.resultCode}")
            }
        }
    }

    private fun getPaymentStatusFromNetwork() {
        viewModelScope.launch {
            delay(3000)
            try {
                checkPaymentStatus(getPaymentStatusUseCase.invoke(paymentId))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                emitPaymentStatus(PaymentStatus.CANCELED)
                metricManager.payFail(_userData.value.userId, _userData.value.nickname, e.message)
                Timber.e(e)
            }
        }
    }

    private fun checkPaymentStatus(status: String) {
        val userId = _userData.value.userId
        val nickname = _userData.value.nickname

        when (status) {
            PaymentStatus.PENDING.nameStatus -> {
                metricManager.payPending(userId, nickname)
                emitPaymentStatus(PaymentStatus.PENDING)
            }

            PaymentStatus.CANCELED.nameStatus -> {
                metricManager.payFail(userId, nickname, status)
                emitPaymentStatus(PaymentStatus.CANCELED)
            }

            PaymentStatus.SUCCEEDED.nameStatus -> {
                metricManager.paySuccess(userId, nickname)
                emitPaymentStatus(PaymentStatus.SUCCEEDED)
            }
        }
    }

    fun onOkayButtonClickPaymentBottomFragment() {
        val isPendingOrSuccess = paymentStatus.value == PaymentStatus.SUCCEEDED ||
                paymentStatus.value == PaymentStatus.PENDING
        _isSuccessOrPendingStatus.tryEmit(isPendingOrSuccess)
    }
}