package mobi.blackbears.bbplay.common.metrica

private const val LOG_IN_FAIL = "Вход: Ошибка"
private const val LOG_IN_SUCCESS = "Вход: Успешно"
private const val REG_FAIL = "Регистрация: Ошибка"
private const val REG_SUCCESS = "Регистрация: Успешно"
private const val CHANGE_PASSWORD = "Профиль: пароль изменён"
private const val PAY_REPLENISH = "Оплата: нажал кнопку пополнить в профиле"
private const val PAY_REPLENISH_SUM = "Оплата: нажал кнопку пополнить + сумма"
private const val CREATE_PAYMENT = "Оплата: запрос на создание платежа отправлен"
private const val THREE_DS = "Оплата: открытие 3ds"
private const val PAY_LOADER = "Оплата: шторка-лоадер"
private const val PAY_SUCCESS = "Оплата: зелёная галка"
private const val PAY_FAIL = "Оплата: красный крест"
private const val PAY_PENDING = "Оплата: серые часы"

private const val ERROR = "error"
private const val MEMBER_ID = "memberId"
private const val NICK = "memberNickname"

class MetricManagerImpl(private val yandexMetric: MetricEvent) : MetricManager {

    override fun logInFail(message: String?): Unit =
        yandexMetric.event(LOG_IN_FAIL, mapOf(ERROR to message))

    override fun logInSuccess(userId: Long, nickname: String) {
        yandexMetric.setUserIdMetric(userId.toString())
        eventWithParams(LOG_IN_SUCCESS, userId, nickname)
    }

    override fun registrationFail(message: String?): Unit =
        yandexMetric.event(REG_FAIL, mapOf(ERROR to message))

    override fun registrationSuccess(userId: Long, nickname: String): Unit =
        eventWithParams(REG_SUCCESS, userId, nickname)

    override fun changedPassword(userId: Long, nickname: String): Unit =
        eventWithParams(CHANGE_PASSWORD, userId, nickname)

    override fun payReplenishInProfile(userId: Long, nickname: String): Unit =
        eventWithParams(PAY_REPLENISH, userId, nickname)

    override fun payReplenishInPayWithSum(userId: Long, nickname: String): Unit =
        eventWithParams(PAY_REPLENISH_SUM, userId, nickname)

    override fun createPaymentMetric(userId: Long, nickname: String): Unit =
        eventWithParams(CREATE_PAYMENT, userId, nickname)

    override fun metric3dsFragment(userId: Long, nickname: String): Unit =
        eventWithParams(THREE_DS, userId, nickname)

    override fun loaderPay(userId: Long, nickname: String): Unit =
        eventWithParams(PAY_LOADER, userId, nickname)

    override fun paySuccess(userId: Long, nickname: String): Unit =
        eventWithParams(PAY_SUCCESS, userId, nickname)

    override fun payFail(userId: Long, nickname: String, message: String?) {
        val params = mutableMapOf<String, Any?>()
        params[MEMBER_ID] = userId
        params[NICK] = nickname
        params[ERROR] = message
        yandexMetric.event(PAY_FAIL, params)
    }

    override fun payPending(userId: Long, nickname: String): Unit =
        eventWithParams(PAY_PENDING, userId, nickname)

    private fun eventWithParams(eventName: String, userId: Long, nickname: String) {
        val params = mutableMapOf<String, Any>()
        params[MEMBER_ID] = userId
        params[NICK] = nickname
        yandexMetric.event(eventName, params)
    }
}