package mobi.blackbears.bbplay.common.metrica

import android.app.Application
import com.yandex.metrica.YandexMetrica
import com.yandex.metrica.YandexMetricaConfig
import mobi.blackbears.bbplay.BuildConfig

class YandexAppMetricEventImpl(private val application: Application) : MetricEvent, MetricInit {

    override fun init() {
        val config = YandexMetricaConfig.newConfigBuilder(BuildConfig.APP_METRICA_API_KEY).build()
        YandexMetrica.activate(application.applicationContext, config)
        YandexMetrica.enableActivityAutoTracking(application)
    }

    override fun setUserIdMetric(userId: String?): Unit =
        YandexMetrica.setUserProfileID(userId)

    override fun event(eventName: String): Unit =
        YandexMetrica.reportEvent(eventName)

    override fun event(eventName: String, params: Map<String, Any?>?): Unit =
        YandexMetrica.reportEvent(eventName, params)

    override fun errorEvent(message: String, throwable: Throwable): Unit =
        YandexMetrica.reportError(message, throwable)
}