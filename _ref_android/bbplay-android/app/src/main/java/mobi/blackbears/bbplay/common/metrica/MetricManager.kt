package mobi.blackbears.bbplay.common.metrica

interface MetricManager {
    fun logInFail(message: String?)

    fun logInSuccess(userId: Long, nickname: String)

    fun registrationFail(message: String?)

    fun registrationSuccess(userId: Long, nickname: String)

    fun changedPassword(userId: Long, nickname: String)

    fun payReplenishInProfile(userId: Long, nickname: String)

    fun payReplenishInPayWithSum(userId: Long, nickname: String)

    fun createPaymentMetric(userId: Long, nickname: String)

    fun metric3dsFragment(userId: Long, nickname: String)

    fun loaderPay(userId: Long, nickname: String)

    fun paySuccess(userId: Long, nickname: String)

    fun payFail(userId: Long, nickname: String, message: String?)

    fun payPending(userId: Long, nickname: String)
}