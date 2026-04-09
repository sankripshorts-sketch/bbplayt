package mobi.blackbears.bbplay.common.metrica

interface MetricEvent {

    fun setUserIdMetric(userId: String?)

    fun event(eventName: String)

    fun event(eventName: String, params: Map<String, Any?>?)

    fun errorEvent(message: String, throwable: Throwable)
}