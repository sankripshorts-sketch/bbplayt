package mobi.blackbears.bbplay.common.application

import android.app.Application
import android.content.Context
import com.yandex.metrica.push.YandexMetricaPush
import mobi.blackbears.bbplay.BuildConfig
import mobi.blackbears.bbplay.common.metrica.MetricInit
import timber.log.Timber
import timber.log.Timber.Forest.plant
import javax.inject.Inject

class MainApp : Application() {
    private lateinit var _appComponent: AppComponent
    val appComponent get() = _appComponent

    @Inject
    lateinit var metricManager: MetricInit

    override fun onCreate() {
        super.onCreate()
        _appComponent = DaggerAppComponent.builder()
            .application(this)
            .build()
            .apply { inject(this@MainApp) }

        metricManager.init()
        YandexMetricaPush.init(applicationContext)

        if (BuildConfig.DEBUG) plant(Timber.DebugTree())
    }
}

val Context.appComponent: AppComponent
    get() = when(this) {
        is MainApp -> appComponent
        else -> this.applicationContext.appComponent
    }